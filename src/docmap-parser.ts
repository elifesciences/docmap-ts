import { version } from 'os';
import { Action, Assertion, AssertionStatus, DocMap, Expression, ExpressionType, Preprint, Step } from './docmap';
import { formatDate } from './utils';


export enum ReviewType {
  EvaluationSummary = 'evaluation-summary',
  Review = 'review-article',
  AuthorResponse = 'author-response',
}

const stringToReviewType = (reviewTypeString: string): ReviewType | undefined => {
  if (reviewTypeString === ReviewType.EvaluationSummary) {
    return ReviewType.EvaluationSummary;
  } else if (reviewTypeString === ReviewType.AuthorResponse) {
    return ReviewType.AuthorResponse;
  } else if (reviewTypeString === ReviewType.Review) {
    return ReviewType.Review;
  }
  return;
}

type Participant = {
  name: string,
  role: string,
  institution: string,
};

type Evaluation = {
  date: Date,
  reviewType: ReviewType,
  text: string,
  participants: Participant[],
};

type PeerReview = {
  evaluationSummary?: Evaluation,
  reviews: Evaluation[],
  authorResponse?: Evaluation,
};

export type TimelineEvent = {
  name: string,
  date: Date,
  link?: {
    text: string,
    url: string,
  }
};

export type Version = {
  id: string,
  versionIdentifier?: string,
  doi: string,
  url?: string,
  type: string,
  status: string,
  peerReview?: PeerReview,
  publishedDate?: Date,
  sentForReviewDate?: Date,
  reviewedDate?: Date,
  authorResponseDate?: Date,
  supercededBy?: Version,
  previousVersion?: Version,
}

export type ParseResult = {
  timeline: TimelineEvent[],
  versions: Version[],
}

const upperCaseFirstLetter = (string: string) => `${string.substring(0, 1).toUpperCase()}${string.substring(1)}`;

const getVersionFromExpression = (expression: Expression): Version => {
  if (!expression.doi) {
    throw Error('Cannot identify Expression by DOI');
  }
  return {
    type: upperCaseFirstLetter(expression.type),
    status: '',
    id: expression.identifier ?? expression.doi,
    doi: expression.doi,
    url: expression.url ?? `https://doi.org/${expression.doi}`,
    versionIdentifier: expression.versionIdentifier,
    publishedDate: expression.published,
  };
}

const isVersionAboutExpression = (version: Version, expression: Expression): boolean => {
  if (expression.doi !== version.doi) {
    return false;
  }

  if (expression.versionIdentifier && expression.versionIdentifier !== version.versionIdentifier) {
    return false;
  }

  return true;
}

const findVersionDescribedBy = (results: ParseResult, expression: Expression): Version | undefined => results.versions.find((version) => isVersionAboutExpression(version, expression));

const findAndFlatMapAllEvaluations = (actions: Action[]): Evaluation[] => actions.flatMap((action) => {
  return action.outputs.map((output) => {
    const reviewType = stringToReviewType(output.type);
    if (!reviewType || !Object.values(ReviewType).includes(reviewType)) {
      return undefined;
    }
    if (output.content === undefined) {
      return undefined;
    }
    if (output.content.length === 0) {
      return undefined;
    }
    const content = output.content.filter((content) => content.type === 'web-page');
    const text = (content.length === 1) ? `fetched content for ${content[0].url}` : undefined; // TODO

    return {
      reviewType: stringToReviewType(output.type),
      date: output.published,
      participants: action.participants.map((participant) => ({
        name: participant.actor.name,
        institution: 'unknown', // TODO
        role: participant.role,
      })),
      text: text,
    };
  });
}).filter((output): output is Evaluation => output !== undefined);

const parseStep = (step: Step, results: ParseResult): ParseResult => {
  // look for any preprint inputs that need importing
  const inputPreprints = step.inputs.filter((input) => input.type === 'preprint');
  const outputPreprints = step.actions.flatMap((action) => action.outputs.filter((output) => output.type === 'preprint'));

  [ ...inputPreprints, ...outputPreprints ].forEach((preprint) => {
    if (preprint.type !== 'preprint') {
      return;
    }
    let version = findVersionDescribedBy(results, preprint);
    if (!version) {
      version = getVersionFromExpression(preprint);
      results.versions.push(version);
    }
  });

  const preprintPublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Published)
  if (preprintPublishedAssertion) {
    let version = findVersionDescribedBy(results, preprintPublishedAssertion.item);
    // assume there is only one input, which is the preprint
    var previousVersion = step.inputs.length === 1 ? findVersionDescribedBy(results, step.inputs[0]) : undefined;
    if (!version) {
      // create new version and push into versions array
      version = getVersionFromExpression(preprintPublishedAssertion.item);
      results.versions.push(version);
    }
    // set this as a new version of the previous
    if (previousVersion) {
      version.previousVersion = previousVersion;
    }
  }

  const preprintUnderReviewAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.UnderReview)
  if (preprintUnderReviewAssertion) {
    var version = findVersionDescribedBy(results, preprintUnderReviewAssertion.item);
    if (!version) {
      // create new version and push into versions array
      version = getVersionFromExpression(preprintUnderReviewAssertion.item)
      results.versions.push(version);
    }
    // Update type and sent for review date
    version.sentForReviewDate = preprintUnderReviewAssertion.happened;
    version.status = '(Preview) Reviewed';
  }

  const preprintRepublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Republished)
  if (preprintRepublishedAssertion) {
    // assume there is only one input, which is the preprint
    var preprint = step.inputs.length === 1 ? findVersionDescribedBy(results, step.inputs[0]) : undefined;
    const replacementPreprint = getVersionFromExpression(preprintRepublishedAssertion.item)
    if (preprint && replacementPreprint) {
      preprint.supercededBy = replacementPreprint;
      results.versions.push(replacementPreprint);
    }
  }

  const preprintPeerReviewedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.PeerReviewed);
  if (preprintPeerReviewedAssertion) {
    var version = findVersionDescribedBy(results, preprintPeerReviewedAssertion.item);
    if (version) {
      // Update type and sent for review date
      version.type = 'Preprint';
      version.reviewedDate = preprintPeerReviewedAssertion.happened;
      version.status = 'Reviewed';

      //push all reviews into peerReview (override if necessary)
      const evaluations = findAndFlatMapAllEvaluations(step.actions);
      const evaluationSummary = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.EvaluationSummary)[0];
      const authorResponse = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.AuthorResponse)[0];
      const reviews = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.Review);

      if (version.peerReview) {
        version.peerReview.reviews.push(...reviews);
        version.peerReview.evaluationSummary = evaluationSummary ?? version.peerReview.evaluationSummary;
        version.peerReview.authorResponse = authorResponse ?? version.peerReview.authorResponse;
      } else {
        version.peerReview = {
          reviews,
          evaluationSummary,
          authorResponse,
        };
      }
    }
  }

  // Enhanced can cover a multitude of enhancements to the paper.
  const enhancedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Enhanced)
  if (enhancedAssertion) {
    var version = findVersionDescribedBy(results, enhancedAssertion.item);
    if (version) {
      // Decide what to do by examining the outputs
      const evaluations = findAndFlatMapAllEvaluations(step.actions);
      if (evaluations.length > 0) {
        const evaluationSummary = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.EvaluationSummary);
        const authorResponse = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.AuthorResponse);
        const reviews = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.Review);
        if (!version.peerReview) {
          version.peerReview = {
            reviews: []
          };
        }
        version.peerReview.reviews.push(...reviews);
        version.peerReview.evaluationSummary = evaluationSummary.length > 0 ? evaluationSummary[0] : version.peerReview.evaluationSummary;
        version.peerReview.authorResponse = authorResponse.length > 0 ? authorResponse[0] : version.peerReview.authorResponse;
      }
    }
  }

  return results;
}

function* getSteps(docMap: DocMap): Generator<Step> {
  let currentStep = docMap.steps.get(docMap['first-step']);
  if (currentStep === undefined) {
    return;
  }

  while (currentStep !== undefined) {
    yield currentStep;

    if (typeof currentStep['next-step'] === 'string') {
      currentStep = docMap.steps.get(currentStep['next-step']);
    } else {
      currentStep = currentStep['next-step']
    }
  }

  return;
}

const getEventsFromVersion = (version: Version): TimelineEvent[] => {
  const events = [];
  if (version.publishedDate) {
    const url = version.url ?? (version.doi ? `https://doi.org/${version.doi}` : undefined);
    const bioRxiv = version.doi?.startsWith('10.1101') ?? false;
    const link = url ? {text: bioRxiv ? 'Go to BioRxiv' : 'Go to preprint', url: url} : undefined;
    events.push({
      name: `${version.type}${version.versionIdentifier ? ` v${version.versionIdentifier}` : ''} posted`,
      date: version.publishedDate,
      link,
    });
  }

  if (version.sentForReviewDate) {
    events.push({
      name: `${version.type} sent for review`,
      date: version.sentForReviewDate,
    });
  }

  if (version.reviewedDate) {
    events.push({
      name: `Reviews received for ${version.type}`,
      date: version.reviewedDate,
    });
  }

  // sort by event dates
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}


const getTimelineFromVersions = (versions: Version[]): TimelineEvent[] => versions.flatMap((version: Version): TimelineEvent[] => {
  const events = getEventsFromVersion(version);
  return events;
});

// Removes any that has collected a superceded By property
const reducedSupercededVersions = (versions: Version[]): Version[] => versions.filter((version) => !version.supercededBy);

const parseDocMapJson = (docMapJson: string): DocMap => {
  const docMapStruct = JSON.parse(docMapJson);

  docMapStruct.steps = new Map<string, Step>(Object.entries(docMapStruct.steps));

  return docMapStruct as DocMap;
}

export const parsePreprintDocMap = (docMap: DocMap | string): ParseResult => {
  if (typeof docMap === 'string') {
    docMap = parseDocMapJson(docMap);
  }
  let results: ParseResult = {
    timeline: [],
    versions: [],
  }

  const steps = Array.from(docMap.steps.values());
  if (steps.length === 0) {
    return results;
  }

  const stepsIterator = getSteps(docMap);
  let currentStep = stepsIterator.next().value;
  while (currentStep) {
    results = parseStep(currentStep, results);
    currentStep = stepsIterator.next().value;
  }

  results.timeline = getTimelineFromVersions(results.versions);
  results.versions = reducedSupercededVersions(results.versions);
  return results;
};
