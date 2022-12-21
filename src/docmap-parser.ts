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
}

export type ParseResult = {
  timeline: TimelineEvent[],
  versions: Version[],
}

const getEventFromExpression = (expression: Expression, name: string, date?: Date): TimelineEvent | undefined => {
  if (expression.published) {
    const url = expression.url ?? (expression.doi ? `https://doi.org/${expression.doi}` : undefined);
    const bioRxiv = expression.doi?.startsWith('10.1101') ?? false;
    const link = url ? {text: bioRxiv ? 'Go to BioRxiv' : 'Go to preprint', url: url} : undefined;

    return {
      name,
      date: date ?? expression.published ?? undefined,
      link: link,
    };
  }
}

const getTimelineEventFrom = (step: Step): TimelineEvent | undefined => {
  const preprint = step.inputs.find((input): input is Preprint => input.type === ExpressionType.Preprint);
  if (preprint) {
    if (preprint.published) {
      const event = getEventFromExpression(preprint, 'Preprint posted');
      if (event) { return event; }
    }
  }

  const preprintPublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Published && assertion.item.type === ExpressionType.Preprint)
  if (preprintPublishedAssertion) {
    if (preprintPublishedAssertion.item.published) {
      const event = getEventFromExpression(preprintPublishedAssertion.item, 'Preprint posted', preprintPublishedAssertion.happened);
      if (event) { return event; }
    }
  }

  const preprintUnderReviewAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.UnderReview && assertion.item.type === ExpressionType.Preprint);
  if (preprintUnderReviewAssertion) {
    if (preprintUnderReviewAssertion.item.published) {
      const event = getEventFromExpression(preprintUnderReviewAssertion.item, 'Sent for review', preprintUnderReviewAssertion.happened);
      if (event) { return event; }
    }
  }
};

const getVersionFromExpression = (expression: Expression, type: string, version: number): Version | undefined => {
  if (expression.doi) {
    return {
      type,
      id: expression.identifier ?? expression.doi,
      doi: expression.doi,
      preprintDoi: expression.doi,
      preprintURL: expression.url ?? `https://doi.org/${expression.doi}`,
      version: version,
      versionIdentifier: expression.versionIdentifier
    };
  }
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

const createNewVersionFrom = (step: Step, currentVersion?: Version): Version | undefined => {
  const preprint = step.inputs.find((input): input is Preprint => input.type === ExpressionType.Preprint);
  if (preprint && preprint.doi !== currentVersion?.doi) {
    const version = getVersionFromExpression(preprint, 'Preprint', currentVersion?.version ? currentVersion?.version+1 : 1);
    if (version) { return version; }
  }

  const preprintPublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Published && assertion.item.type === ExpressionType.Preprint)
  if (preprintPublishedAssertion && (!currentVersion || !isVersionAboutExpression(currentVersion, preprintPublishedAssertion.item))) {
    const version = getVersionFromExpression(preprintPublishedAssertion.item, 'Preprint', currentVersion?.version ? currentVersion?.version+1 : 1);
    if (version) { return version; }
  }

  const preprintUnderReviewAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.UnderReview && assertion.item.type === ExpressionType.Preprint)
  if (preprintUnderReviewAssertion && (!currentVersion || !isVersionAboutExpression(currentVersion, preprintUnderReviewAssertion.item))) {
    const version = getVersionFromExpression(preprintUnderReviewAssertion.item, 'Reviewed preprint (preview)', currentVersion?.version ? currentVersion?.version+1 : 1);
    if (version) { return version; }
  }
}

const getNewInformationForCurrentVersionFrom = (step: Step, currentVersion: Version): Version => {
  const preprintUnderReviewAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.UnderReview && assertion.item.type === ExpressionType.Preprint)
  if (preprintUnderReviewAssertion && preprintUnderReviewAssertion.item.doi === currentVersion?.doi) {
    return {
      ...currentVersion,
      type: 'Reviewed preprint (preview)',
    };
  }

  return currentVersion;
};


export const parsePreprintDocMap = (docMap: DocMap): ParseResult => {
  const results: ParseResult = {
    timeline: [],
    versions: [],
  }

  const steps = Array.from(docMap.steps.values());
  if (steps.length === 0) {
    return results;
  }


  let currentVersion: Version | undefined = undefined;

  let currentStep = docMap.steps.get(docMap['first-step']);
  if (currentStep === undefined) {
    return results;
  }

  while (currentStep !== undefined) {
    // check for a timeline event for this step
    const timelineEvent = getTimelineEventFrom(currentStep);
    if (timelineEvent) {
      results.timeline.push(timelineEvent);
    }

    // check if this step creates a new version
    const newVersion = createNewVersionFrom(currentStep, currentVersion);
    if (newVersion) {
      // add the previous version (if one exists) to the version
      if (currentVersion !== undefined) {
        results.versions.push(currentVersion);
      }
      currentVersion = newVersion;
    }

    // augment any current version with new information
    if (currentVersion) {
      currentVersion = getNewInformationForCurrentVersionFrom(currentStep, currentVersion);
    }

    if (typeof currentStep['next-step'] === 'string') {
      currentStep = docMap.steps.get(currentStep['next-step']);
    } else {
      currentStep = currentStep['next-step']
    }
  }

  // if we have an unfinished version, let's push it into the result
  if (currentVersion) {
    results.versions.push(currentVersion);
  }

  return results;
};






// if (currentStep.assertions.find((assertion) => assertion.status === 'peer-reviewed') !== undefined) {
//   // assumption - there is only 1 input for a peer-reviewed material
//   const preprint = currentStep.inputs.find((input) => input.type === ExpressionType.Preprint);
//   if (preprint === undefined) {
//     continue;
//   }

//   // set the type as reviewed preprint
//   if (type === 'Reviewed preprint') {
//     type = 'Revised preprint';
//   } else {
//     type = 'Reviewed preprint';
//   }

//   // set preprint DOI if we have it
//   if (typeof preprint.doi == 'string') {
//     doi = preprint.doi;
//   }

//   // if we have a published date, add an event
//   if (preprint.published !== undefined) {
//     const link = !preprint.doi || !preprint.url ? undefined : {
//       text: preprint.doi.startsWith('10.1101/') ? 'Go to BioRxiv' : 'Go to preprint',
//       url: preprint.url,
//     };
//     timelineEvents.push({
//       name: 'Preprint posted',
//       date: formatDate(preprint.published),
//       link,
//     });
//   }

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
