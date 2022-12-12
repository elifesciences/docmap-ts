import { DocMap, ExpressionType } from './docmap';
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
  date: string,
  link?: {
    text: string,
    url: string,
  }
};

type EnhancedPreprintStatus = {
  doi: string,
  version: number,
  type: string,
  timeline: TimelineEvent[],
  peerReview?: PeerReview,
}


export const parsePreprintDocMap = (docMap: DocMap): EnhancedPreprintStatus => {
  const steps = Array.from(docMap.steps.values());
  if (steps.length === 0) {
    throw Error('couldn\'t parse preprint docmap - no steps');
  }
  let currentStep = docMap.steps.get(docMap['first-step']);
  if (currentStep === undefined) {
    throw Error('couldn\'t parse preprint docmap - first step defined but invalid');
  }

  const timelineEvents: TimelineEvent[] = [];
  let type:string = 'unknown';
  let doi:string = '';
  let peerReview: PeerReview | undefined = undefined;
  let version = 0;

  while (currentStep !== undefined) {
    if (currentStep.assertions.find((assertion) => assertion.status === 'peer-reviewed') !== undefined) {
      // assumption - there is only 1 input for a peer-reviewed material
      const preprint = currentStep.inputs.find((input) => input.type === ExpressionType.Preprint);
      if (preprint === undefined) {
        continue;
      }

      // set the type as reviewed preprint
      if (type === 'Reviewed preprint') {
        type = 'Revised preprint';
      } else {
        type = 'Reviewed preprint';
      }

      // set preprint DOI if we have it
      if (typeof preprint.doi == 'string') {
        doi = preprint.doi;
      }

      // if we have a published date, add an event
      if (preprint.published !== undefined) {
        const link = !preprint.doi || !preprint.url ? undefined : {
          text: preprint.doi.startsWith('10.1101/') ? 'Go to BioRxiv' : 'Go to preprint',
          url: preprint.url,
        };
        timelineEvents.push({
          name: 'Preprint posted',
          date: formatDate(preprint.published),
          link,
        });
      }

      // get the peerReviews
      const evaluations = currentStep.actions.map((action) => {
        const outputs = action.outputs.map((output) => {
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
        }).filter((output): output is Evaluation => output !== undefined);

        if (outputs.length === 0) {
          return undefined;
        }

        const outputWithText = outputs.filter((output) => output?.text !== undefined)
        if (outputWithText.length === 1) {
          return outputWithText[0];
        }

        // Assumption: if none of the outputs have text available, just return 1
        const outputWithoutText = outputs[0];
        return {
          ...outputWithoutText,
          text: 'Text unavailable',
        };
      }).filter((output): output is Evaluation => output !== undefined);

      const editorEvaluation = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.EvaluationSummary);
      const authorResponse = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.AuthorResponse);
      const reviews = evaluations.filter((evaluation) => evaluation?.reviewType == ReviewType.Review);

      peerReview = {
        evaluationSummary: editorEvaluation[0],
        reviews: reviews,
        authorResponse: authorResponse[0],
      };

      // assumption - all peer-reviewed material was published at the same time
      const publishedDate = currentStep.actions[0]?.outputs?.[0].published;
      timelineEvents.push({
        name: `${type} - version ${++version}`,
        date: formatDate(publishedDate),
      });

    }


    if (typeof currentStep['next-step'] === 'string') {
      currentStep = docMap.steps.get(currentStep['next-step']);
    } else {
      currentStep = currentStep['next-step']
    }
  }

  if (doi === '') {
    throw Error('couldn\'t parse preprint docmap - no preprint found as a valid step input');
  }

  return {
    doi,
    version,
    type,
    timeline: timelineEvents,
    peerReview,
  }
};
