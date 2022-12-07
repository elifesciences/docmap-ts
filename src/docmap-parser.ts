import { DocMap } from './docmap';


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

type ParseResult = {
  status: string,
  type: string,
  timeline: TimelineEvent[],
  peerReview?: PeerReview
}


export const parsePreprintDocMap = (docMap: DocMap): ParseResult => {
  const steps = Array.from(docMap.steps.values());
  if (steps.length === 0) {
    throw Error('couldn\'t parse preprint docmap - no steps');
  }
  let currentStep = docMap.steps.get(docMap['first-step']);
  if (currentStep === undefined) {
    throw Error('couldn\'t parse preprint docmap - first step defined but invalid');
  }

  const timelineEvents: TimelineEvent[] = [];
  let status = 'unknown';
  let type = 'unknown';
  let reviewed = false;
  let peerReview: PeerReview | undefined = undefined;
  while (currentStep !== undefined) {
    if (currentStep.assertions.find((assertion) => assertion.status === 'peer-reviewed') !== undefined) {
      //assumption - there is only 1 input for a peer-reviewed material
      const preprint = currentStep.inputs[0];
      if (preprint !== undefined && preprint.published !== undefined) {
        timelineEvents.push({
          name: 'Preprint published',
          date: preprint.published.toDateString(),
        });
      }
      type = 'Peer reviewed preprint';
      status = 'This preprint has been published and publicly reviewed, but a reviewing group has not published a sumary evaulation';

      // get the peerReviews
      const evaluations = currentStep.actions.map((action) => {
        const outputs = action.outputs.map((output) => {
          if (output.content.length === 0) {
            return undefined;
          }
          const content = output.content.filter((content) => content.type === 'web-content');
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

    }
    if (currentStep.assertions.find((assertion) => assertion.status === 'enhanced') !== undefined) {
      type = reviewed ? 'Revised Preprint' : 'Reviewed Preprint';
      status = `This Reviewed Preprint was published after peer review and assessment by ${docMap.publisher.name}`;
      reviewed = true;
    }

    // assumption - all peer-reviewed material was published at the same time
    const publishedDate = currentStep.actions[0].outputs[0].published;
    timelineEvents.push({
      name: type,
      date: publishedDate.toDateString(),
    });

    if (typeof currentStep['next-step'] === 'string') {
      currentStep = docMap.steps.get(currentStep['next-step']);
    } else {
      currentStep = currentStep['next-step']
    }
  }

  return {
    type,
    status,
    timeline: timelineEvents,
    peerReview,
  }
};
