import { Assertion, AssertionStatus, Expression, ExpressionType, Item, Step } from '../types';

enum PublishingEventType {
  Published = 'Published',
  Draft = 'Draft',
  UnderReview = 'UnderReview',
  PeerReviewed = 'PeerReviewed',
  Republished = 'Republished',
  AuthorResponded = 'AuthorResponded',
}

type PublishedEvent = {
  type: PublishingEventType.Published,
  asserted: boolean,
  item: Expression,
  date?: Date,
};

type DraftEvent = {
  type: PublishingEventType.Draft,
  asserted: boolean,
  item: Expression,
  date?: Date,
};

type UnderReviewEvent = {
  type: PublishingEventType.UnderReview,
  asserted: boolean,
  item: Expression,
  date?: Date,
};

type PeerReviewedEvent = {
  type: PublishingEventType.PeerReviewed,
  asserted: boolean,
  item: Expression,
  evaluations: Expression[],
  date?: Date,
};

type RepublishedEvent = {
  type: PublishingEventType.Republished,
  asserted: boolean,
  item: Expression,
  date?: Date,
  originalItem: Expression,
};

type AuthorRespondedEvent = {
  type: PublishingEventType.AuthorResponded,
  asserted: boolean,
  item: Expression,
  response: Expression,
  date?: Date,
};

type PublishingEvent = PublishedEvent | DraftEvent | UnderReviewEvent | RepublishedEvent | PeerReviewedEvent | AuthorRespondedEvent;

type ExtractedExpressions = {
  manuscriptInputs: Item[],
  manuscriptOutputs: Item[],
  evaluationInputs: Item[],
  evaluationOutputs: Item[],
};

// useful categories of expressions
const manuscriptTypes = [
  ExpressionType.Preprint.toString(),
  ExpressionType.VersionOfRecord.toString(),
];
const isManuscript = (expression: Expression): boolean => manuscriptTypes.includes(expression.type);
const evaluationTypes = [
  ExpressionType.EvaluationSummary.toString(),
  ExpressionType.PeerReview.toString(),
];
const isEvaluation = (expression: Expression): boolean => evaluationTypes.includes(expression.type);

const authorResponseTypes = [
  ExpressionType.AuthorResponse,
];
const isAuthorResponse = (expression: Expression): boolean => authorResponseTypes.includes(expression.type);

// useful to infer actions from inputs and output types
const extractExpressions = (step: Step): ExtractedExpressions => {
  const manuscriptInputs = step.inputs.filter(isManuscript);
  const manuscriptOutputs = step.actions.flatMap((action) => action.outputs.filter(isManuscript));

  const evaluationInputs = step.inputs.filter((input) => evaluationTypes.includes(input.type));
  const evaluationOutputs = step.actions.flatMap((action) => action.outputs.filter(isEvaluation));

  return {
    manuscriptInputs,
    manuscriptOutputs,
    evaluationInputs,
    evaluationOutputs,
  };
};

const getPublishedManuscriptAssertion = (step: Step): Assertion | false => {
  const manuscriptPublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Published);
  if (!manuscriptPublishedAssertion) {
    return false;
  }

  return isManuscript(manuscriptPublishedAssertion.item) ? manuscriptPublishedAssertion : false;
};

const getUnderReviewManuscriptAssertion = (step: Step): Assertion | false => {
  const manuscriptPublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.UnderReview);
  if (!manuscriptPublishedAssertion) {
    return false;
  }

  return isManuscript(manuscriptPublishedAssertion.item) ? manuscriptPublishedAssertion : false;
};

const getDraftManuscriptAssertion = (step: Step): Assertion | false => {
  const manuscriptPublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Draft);
  if (!manuscriptPublishedAssertion) {
    return false;
  }

  return isManuscript(manuscriptPublishedAssertion.item) ? manuscriptPublishedAssertion : false;
};

const getInferredPublishedManuscript = (step: Step): Item | false => {
  const items = extractExpressions(step);
  return (items.manuscriptInputs.length === 0
    && items.manuscriptOutputs.length === 1
    && items.evaluationInputs.length === 0
    && items.evaluationOutputs.length === 0) ? items.manuscriptOutputs[0] : false;
};
const getInferredRepublishedManuscript = (step: Step): { originalExpression: Item, republishedExpression: Item } | false => {
  const items = extractExpressions(step);
  return (items.manuscriptInputs.length === 1
    && items.manuscriptOutputs.length === 1
    && items.evaluationInputs.length === 0
    && items.evaluationOutputs.length === 0)
    ? {
      originalExpression: items.manuscriptInputs[0],
      republishedExpression: items.manuscriptOutputs[0]
    } : false;
};
const getInferredPeerReviewedManuscript = (step: Step): { expression: Item, evaluations: Item[], republishedAs?: Item } | false => {
  const items = extractExpressions(step);

  return (items.manuscriptInputs.length === 1
    && items.evaluationOutputs.length > 0
    && items.evaluationInputs.length === 0)
    ? {
      expression: items.manuscriptInputs[0],
      evaluations: items.evaluationOutputs,
      republishedAs: items.manuscriptOutputs.length > 0 ? items.manuscriptOutputs[0] : undefined,
    } : false;
};

const getAuthorResponse = (step: Step): { preprint: Item, authorResponse: Item } | false => {
  const items = extractExpressions(step);

  const authorResponseOutputs = step.actions.flatMap((action) => action.outputs.filter(isAuthorResponse));
  return (authorResponseOutputs.length === 1 && items.manuscriptInputs.length === 1)
    ? { preprint: items.manuscriptInputs[0], authorResponse: authorResponseOutputs[0] }
    : false;
};

export const parseStepToEvents = (step: Step): Array<PublishingEvent> => {
  const events: PublishingEvent[] = [];

  const manuscriptPublishedAssertion = getPublishedManuscriptAssertion(step);
  if (manuscriptPublishedAssertion) {
    events.push({
      type: PublishingEventType.Published,
      asserted: true,
      date: manuscriptPublishedAssertion.happened,
      item: manuscriptPublishedAssertion.item,
    });
  }

  const inferredPublishedManuscript = getInferredPublishedManuscript(step);
  if (inferredPublishedManuscript) {
    events.push({
      type: PublishingEventType.Published,
      asserted: false,
      item: inferredPublishedManuscript,
    });
  }

  const manuscriptUnderReviewAssertion = getUnderReviewManuscriptAssertion(step);
  if (manuscriptUnderReviewAssertion) {
    events.push({
      type: PublishingEventType.UnderReview,
      asserted: true,
      date: manuscriptUnderReviewAssertion.happened,
      item: manuscriptUnderReviewAssertion.item,
    });
  }

  const inferredRepublished = getInferredRepublishedManuscript(step);
  if (inferredRepublished) {
    events.push({
      type: PublishingEventType.Republished,
      asserted: false,
      item: inferredRepublished.republishedExpression,
      originalItem: inferredRepublished.originalExpression,
    });
  }

  const inferredPeerReviewed = getInferredPeerReviewedManuscript(step);
  if (inferredPeerReviewed) {
    events.push({
      type: PublishingEventType.PeerReviewed,
      asserted: false,
      item: inferredPeerReviewed.expression,
      evaluations: inferredPeerReviewed.evaluations,
    });

    // sometimes a new reviewed preprint is published as an output
    if (inferredPeerReviewed.republishedAs) {
      events.push({
        type: PublishingEventType.Republished,
        asserted: false,
        item: inferredPeerReviewed.republishedAs,
        originalItem: inferredPeerReviewed.expression,
      });
    }
  }

  // sometimes author response is a separate step, find those and add the author response
  const inferredAuthorResponse = getAuthorResponse(step);
  if (inferredAuthorResponse) {
    events.push({
      type: PublishingEventType.AuthorResponded,
      asserted: false,
      item: inferredAuthorResponse.preprint,
      response: inferredAuthorResponse.authorResponse,
    });
  }

  const draftAssertion = getDraftManuscriptAssertion(step);
  if (draftAssertion) {
    events.push({
      type: PublishingEventType.Draft,
      asserted: true,
      item: draftAssertion.item,
    });
  }

  return events;
};
