import { version } from 'os';
import { Assertion, AssertionStatus, DocMap, Expression, ExpressionType, Preprint, Step } from './docmap';
import { formatDate } from './utils';


enum ReviewType {
  EvaluationSummary = 'evaluation-summary',
  Review = 'review-article',
  AuthorResponse = 'reply',
}

const stringToReviewType = (reviewTypeString: string): ReviewType => {
  if (reviewTypeString === ReviewType.EvaluationSummary) {
    return ReviewType.EvaluationSummary;
  } else if (reviewTypeString === ReviewType.AuthorResponse) {
    return ReviewType.AuthorResponse;
  }
  return ReviewType.Review;
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
  evaluationSummary: Evaluation,
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
  version: number,
  versionIdentifier?: string,
  doi: string,
  preprintDoi: string,
  preprintURL: string,
  type: string,
  peerReview?: PeerReview,
  preprintPublishedDate?: Date,
  publishedDate?: Date,
  sentForReviewDate?: Date,
  authorResponseDate?: Date,

}

export type ParseResult = {
  timeline: TimelineEvent[],
  versions: Version[],
}

const getVersionFromExpression = (expression: Expression, type: string, version: number): Version => {
  if (!expression.doi) {
    throw Error('Cannot identify Expression by DOI');
  }
  return {
    type,
    id: expression.identifier ?? expression.doi,
    doi: expression.doi,
    preprintDoi: expression.doi,
    preprintURL: expression.url ?? `https://doi.org/${expression.doi}`,
    version: version,
    versionIdentifier: expression.versionIdentifier,
    preprintPublishedDate: expression.published,
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


const parseStep = (step: Step, results: ParseResult): ParseResult => {
  // look for any inputs that need importing
  step.inputs.forEach((input) => {
    let version = findVersionDescribedBy(results, input);
    console.log(version, results, input)
    if (!version) {
      version = getVersionFromExpression(input, 'Preprint', 1);
      results.versions.push(version);
    }
  })

  const preprintPublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Published)
  if (preprintPublishedAssertion) {
    let version = findVersionDescribedBy(results, preprintPublishedAssertion.item);
    if (!version) {
      // create new version and push into versions array
      version = getVersionFromExpression(preprintPublishedAssertion.item, 'Preprint', results.versions.length+1);
      results.versions.push(version);
    }
    // update Version as necessary
    version.type = 'Preprint';
    version.preprintPublishedDate = preprintPublishedAssertion.happened;
  }

  const preprintUnderReviewAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.UnderReview)
  if (preprintUnderReviewAssertion) {
    var version = findVersionDescribedBy(results, preprintUnderReviewAssertion.item);
    if (!version) {
      // create new version and push into versions array
      version = getVersionFromExpression(preprintUnderReviewAssertion.item, 'Preprint', results.versions.length+1)
      results.versions.push(version);
    }
    // Update type and sent for review date
    version.type = 'Reviewed preprint (preview)';
    version.sentForReviewDate = preprintUnderReviewAssertion.happened;
  }

  const preprintRepublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Republished)
  if (preprintRepublishedAssertion) {
    // assume there is only one input, which is the preprint
    var preprint = step.inputs.length === 1 ? findVersionDescribedBy(results, step.inputs[0]) : undefined;
    const reviewedPreprint = getVersionFromExpression(preprintRepublishedAssertion.item, 'Reviewed preprint', 1)
    if (preprint && reviewedPreprint) {
      // Update the publishing ids
      preprint.doi = reviewedPreprint.doi;
      preprint.id = reviewedPreprint.id;
      preprint.version = reviewedPreprint.version;
      preprint.versionIdentifier = reviewedPreprint.versionIdentifier;
      preprint.type = reviewedPreprint.type;
    }
  }

  const preprintEnhancedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Enhanced)
  if (preprintEnhancedAssertion) {
    var version = findVersionDescribedBy(results, preprintEnhancedAssertion.item);
    if (version) {
      // Update type and sent for review date
      version.type = 'Reviewed preprint';
      version.publishedDate = preprintEnhancedAssertion.happened;
      version.doi = version.doi;
      version.id = version.id;
      version.type = version.type;
      version.versionIdentifier = version.versionIdentifier;
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
  if (version.preprintPublishedDate) {
    const url = version.preprintURL ?? (version.preprintDoi ? `https://doi.org/${version.preprintDoi}` : undefined);
    const bioRxiv = version.preprintDoi?.startsWith('10.1101') ?? false;
    const link = url ? {text: bioRxiv ? 'Go to BioRxiv' : 'Go to preprint', url: url} : undefined;
    events.push({
      name: 'Preprint posted',
      date: version.preprintPublishedDate,
      link
    });
  }

  if (version.sentForReviewDate) {
    events.push({
      name: 'Sent for review',
      date: version.sentForReviewDate,
    });
  }

  if (version.publishedDate) {
    events.push({
      name: `Reviewed preprint v${version.version} posted`,
      date: version.publishedDate,
    });
  }

  return events;
}


const getTimelineFromVersions = (versions: Version[]): TimelineEvent[] => versions.flatMap((version: Version): TimelineEvent[] => {
  const events = getEventsFromVersion(version);
  return events;
});

export const parsePreprintDocMap = (docMap: DocMap): ParseResult => {
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
  return results;
};




//   // get the peerReviews
//   const evaluations = currentStep.actions.map((action) => {
//     const outputs = action.outputs.map((output) => {
//       if (output.content === undefined) {
//         return undefined;
//       }
//       if (output.content.length === 0) {
//         return undefined;
//       }
//       const content = output.content.filter((content) => content.type === 'web-page');
//       const text = (content.length === 1) ? `fetched content for ${content[0].url}` : undefined; // TODO

//       return {
//         reviewType: stringToReviewType(output.type),
//         date: output.published,
//         participants: action.participants.map((participant) => ({
//           name: participant.actor.name,
//           institution: 'unknown', // TODO
//           role: participant.role,
//         })),
//         text: text,
//       };
//     }).filter((output): output is Evaluation => output !== undefined);

//     if (outputs.length === 0) {
//       return undefined;
//     }

//     const outputWithText = outputs.filter((output) => output?.text !== undefined)
//     if (outputWithText.length === 1) {
//       return outputWithText[0];
//     }

//     // Assumption: if none of the outputs have text available, just return 1
//     const outputWithoutText = outputs[0];
//     return {
//       ...outputWithoutText,
//       text: 'Text unavailable',
//     };
//   }).filter((output): output is Evaluation => output !== undefined);

//   const editorEvaluation = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.EvaluationSummary);
//   const authorResponse = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.AuthorResponse);
//   const reviews = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.Review);

//   peerReview = {
//     evaluationSummary: editorEvaluation[0],
//     reviews: reviews,
//     authorResponse: authorResponse[0],
//   };

//   // assumption - all peer-reviewed material was published at the same time
//   const publishedDate = evaluations[0].date;
//   timelineEvents.push({
//     name: `${type} - version ${++version}`,
//     date: formatDate(publishedDate),
//   });

// }
