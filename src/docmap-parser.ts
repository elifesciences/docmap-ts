import {
  Action,
  AssertionStatus,
  DocMap,
  Expression,
  ExpressionType,
  Item,
  Step,
} from './docmap';

export enum ReviewType {
  EvaluationSummary = 'evaluation-summary',
  Review = 'review-article',
  AuthorResponse = 'author-response',
}

const stringToReviewType = (reviewTypeString: string): ReviewType | undefined => {
  if (reviewTypeString === ReviewType.EvaluationSummary) {
    return ReviewType.EvaluationSummary;
  }
  if (reviewTypeString === ReviewType.AuthorResponse) {
    return ReviewType.AuthorResponse;
  }
  if (reviewTypeString === ReviewType.Review) {
    return ReviewType.Review;
  }
  return undefined;
};

type Participant = {
  name: string,
  role: string,
  institution: string,
};

export type Evaluation = {
  date: Date,
  reviewType: ReviewType,
  contentUrls: string[],
  participants: Participant[],
};

export type PeerReview = {
  evaluationSummary?: Evaluation,
  reviews: Evaluation[],
  authorResponse?: Evaluation,
};

export enum ContentType {
  Article = 'article',
  EvaluationSummary = 'evaluation-summary',
  Review = 'review-article',
  AuthorResponse = 'author-response',
}

type Preprint = {
  id: string,
  versionIdentifier?: string,
  publishedDate?: Date,
  doi: string,
  url?: string,
  content?: string[],
  license?: string,
};

type ReviewedPreprint = {
  id: string,
  versionIdentifier?: string,
  doi: string,
  preprint: Preprint,
  publishedDate?: Date,
  sentForReviewDate?: Date,
  peerReview?: PeerReview,
  reviewedDate?: Date,
  authorResponseDate?: Date,
  license?: string,
};

export type VersionedReviewedPreprint = ReviewedPreprint & {
  versionIdentifier: string,
};

export type Manuscript = {
  doi?: string,
  volume?: string,
  eLocationId?: string,
};

export type ManuscriptData = {
  id: string,
  manuscript?: Manuscript,
  versions: VersionedReviewedPreprint[],
};

const getManuscriptFromExpression = (expression: Expression): Manuscript | false => {
  if (!expression.embodimentOf) {
    return false;
  }

  return {
    doi: expression.embodimentOf.doi,
    volume: expression.embodimentOf.volumeIdentifier,
    eLocationId: expression.embodimentOf.electronicArticleIdentifier,
  };
};

const getPreprintFromExpression = (expression: Expression): Preprint => {
  if (!expression.doi) {
    throw Error('Cannot identify Expression by DOI');
  }

  const content = (Array.isArray(expression.content) && expression.content.length > 0) ? { content: expression.content.map((contentItem) => contentItem.url).filter((url): url is string => !!url) } : {};
  const url = expression.url ? { url: expression.url } : {};
  const license = expression.license ? { license: expression.license } : {};

  return {
    id: expression.identifier ?? expression.doi,
    doi: expression.doi,
    publishedDate: expression.published,
    versionIdentifier: expression.versionIdentifier,
    ...license,
    ...content,
    ...url,
  };
};

const isPreprintAboutExpression = (preprint: Preprint, expression: Expression): boolean => {
  if (expression.doi !== preprint.doi) {
    return false;
  }

  if (expression.versionIdentifier && expression.versionIdentifier !== preprint.versionIdentifier) {
    return false;
  }

  return true;
};
const createReviewedPreprintFrom = (expression: Expression): ReviewedPreprint => {
  const newPreprint = getPreprintFromExpression(expression);
  return {
    ...newPreprint,
    preprint: newPreprint,
  };
};
const updateReviewedPreprintFrom = (reviewedPreprint: ReviewedPreprint, expression: Expression): ReviewedPreprint => {
  if (isPreprintAboutExpression(reviewedPreprint.preprint, expression)) {
    const { preprint } = reviewedPreprint;

    if (Array.isArray(expression.content) && expression.content.length > 0) {
      if (!Array.isArray(preprint.content)) {
        preprint.content = [];
      }
      preprint.content.push(...expression.content.map((contentItem) => contentItem.url).filter((url): url is string => !!url));
    }

    if (expression.published) {
      preprint.publishedDate = expression.published;
    }

    if (expression.url) {
      preprint.url = expression.url;
    }

    if (expression.license) {
      preprint.license = expression.license;
    }
  }

  if (isPreprintAboutExpression(reviewedPreprint, expression)) {
    const reviewedPreprintToUpdate = reviewedPreprint;
    if (expression.published) {
      reviewedPreprintToUpdate.publishedDate = expression.published;
    }

    if (expression.license) {
      reviewedPreprintToUpdate.license = expression.license;
    }
  }
  return reviewedPreprint;
};

const findPreprintDescribedBy = (expression: Expression, preprintCollection: Array<ReviewedPreprint>):
ReviewedPreprint | undefined => preprintCollection.find(
  (preprint) => isPreprintAboutExpression(preprint, expression) || isPreprintAboutExpression(preprint.preprint, expression),
);

const addPreprintDescribedBy = (expression: Expression, preprintCollection: Array<ReviewedPreprint>): ReviewedPreprint => {
  const newPreprint = createReviewedPreprintFrom(expression);
  preprintCollection.push(newPreprint);
  return newPreprint;
};

const findAndUpdateOrAddPreprintDescribedBy = (expression: Expression, preprintCollection: Array<ReviewedPreprint>, manuscript: Manuscript): ReviewedPreprint => {
  const foundPreprint = findPreprintDescribedBy(expression, preprintCollection);
  if (!foundPreprint) {
    return addPreprintDescribedBy(expression, preprintCollection);
  }
  // Update fields, default to any data already there.
  updateReviewedPreprintFrom(foundPreprint, expression);
  const foundManuscriptData = getManuscriptFromExpression(expression);
  if (foundManuscriptData) {
    manuscript.doi = foundManuscriptData.doi;
    manuscript.eLocationId = foundManuscriptData.eLocationId;
    manuscript.volume = foundManuscriptData.volume;
  }
  return foundPreprint;
};

const republishPreprintAs = (expression: Expression, preprint: ReviewedPreprint) => {
  if (!expression.doi) {
    throw Error('Cannot identify Expression by DOI');
  }

  const newPreprint = preprint;

  newPreprint.id = expression.identifier ?? expression.doi;
  newPreprint.doi = expression.doi;
  newPreprint.versionIdentifier = expression.versionIdentifier;
  newPreprint.publishedDate = expression.published;
};

const findAndFlatMapAllEvaluations = (actions: Action[]): Evaluation[] => actions.flatMap((action) => action.outputs.map((output) => {
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
  const contentUrls = output.content.filter((content) => content.type === 'web-page' && content.url).map((content) => content.url);

  return {
    reviewType: stringToReviewType(output.type),
    date: output.published,
    participants: action.participants.map((participant) => ({
      name: participant.actor.name,
      institution: 'unknown', // TODO
      role: participant.role,
    })),
    contentUrls,
  };
})).filter((output): output is Evaluation => output !== undefined);

const addEvaluationsToPreprint = (preprint: ReviewedPreprint, evaluations: Evaluation[]) => {
  const evaluationSummary = evaluations.filter((evaluation) => evaluation?.reviewType === ReviewType.EvaluationSummary);
  const authorResponse = evaluations.filter((evaluation) => evaluation?.reviewType === ReviewType.AuthorResponse);
  const reviews = evaluations.filter((evaluation) => evaluation?.reviewType === ReviewType.Review);

  const thisPreprint = preprint;
  if (!thisPreprint.peerReview) {
    thisPreprint.peerReview = {
      reviews: [],
    };
  }
  thisPreprint.peerReview.reviews.push(...reviews);
  thisPreprint.peerReview.evaluationSummary = evaluationSummary.length > 0 ? evaluationSummary[0] : thisPreprint.peerReview.evaluationSummary;
  thisPreprint.peerReview.authorResponse = authorResponse.length > 0 ? authorResponse[0] : thisPreprint.peerReview.authorResponse;
};

// push all reviews into peerReview (override if necessary)
const setPeerReviewFrom = (actions: Action[], preprint: ReviewedPreprint) => {
  addEvaluationsToPreprint(preprint, findAndFlatMapAllEvaluations(actions));
};

type ExtractedExpressions = {
  preprintInputs: Item[],
  preprintOutputs: Item[],
  evaluationInputs: Item[],
  evaluationOutputs: Item[],
};

const extractExpressions = (step: Step): ExtractedExpressions => {
  // look for any preprint inputs that need importing
  const preprintInputs = step.inputs.filter((input) => input.type === 'preprint');
  const preprintOutputs = step.actions.flatMap((action) => action.outputs.filter((output) => output.type === 'preprint'));

  // useful to infer actions from inputs and output types
  const evaluationTypes = [
    ExpressionType.EvaluationSummary.toString(),
    ExpressionType.PeerReview.toString(),
  ];
  const evaluationInputs = step.inputs.filter((input) => evaluationTypes.includes(input.type));
  const evaluationOutputs = step.actions.flatMap((action) => action.outputs.filter((output) => evaluationTypes.includes(output.type)));

  return {
    preprintInputs,
    preprintOutputs,
    evaluationInputs,
    evaluationOutputs,
  };
};

const getPublishedPreprint = (step: Step): Item | false => {
  const items = extractExpressions(step);
  return (items.preprintInputs.length === 0
    && items.preprintOutputs.length === 1
    && items.evaluationInputs.length === 0
    && items.evaluationOutputs.length === 0) ? items.preprintOutputs[0] : false;
};

const getRepublishedPreprint = (step: Step): { originalExpression: Item, republishedExpression: Item } | false => {
  const items = extractExpressions(step);

  return (items.preprintInputs.length === 1
    && items.preprintOutputs.length === 1
    && items.evaluationInputs.length === 0
    && items.evaluationOutputs.length === 0) ? { originalExpression: items.preprintInputs[0], republishedExpression: items.preprintOutputs[0] } : false;
};

const getNewVersionPreprint = (step: Step): { previousVersionExpression: Item, newVersionExpression: Item, evaluations: Item[] } | false => {
  const items = extractExpressions(step);

  return (items.preprintInputs.length === 1
    && items.preprintOutputs.length === 1
    && items.evaluationInputs.length > 0
    && items.evaluationOutputs.length === 0) ? { previousVersionExpression: items.preprintInputs[0], newVersionExpression: items.preprintOutputs[0], evaluations: items.evaluationInputs } : false;
};

const getPeerReviewedPreprint = (step: Step): { peerReviewedPreprint: Item, evaluations: Item[], republishedPreprint?: Item } | false => {
  const items = extractExpressions(step);

  return (items.preprintInputs.length === 1
    && items.evaluationOutputs.length > 0
    && items.evaluationInputs.length === 0)
    ? {
      peerReviewedPreprint: items.preprintInputs[0],
      evaluations: items.evaluationOutputs,
      republishedPreprint: items.preprintOutputs.length > 0 ? items.preprintOutputs[0] : undefined,
    } : false;
};

const getAuthorResponse = (step: Step): { preprint: Item, authorResponse: Item } | false => {
  const items = extractExpressions(step);

  const authorResponseOutputs = step.actions.flatMap((action) => action.outputs.filter((output) => output.type === ExpressionType.AuthorResponse));
  return (authorResponseOutputs.length === 1 && items.preprintInputs.length === 1) ? { preprint: items.preprintInputs[0], authorResponse: authorResponseOutputs[0] } : false;
};

const parseStep = (step: Step, preprints: Array<ReviewedPreprint>): Array<ReviewedPreprint> => {
  const preprintPublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Published);
  if (preprintPublishedAssertion) {
    // Update type and sent for review date
    const preprint = findAndUpdateOrAddPreprintDescribedBy(preprintPublishedAssertion.item, preprints);
    preprint.publishedDate = preprintPublishedAssertion.happened ?? preprint.publishedDate;
  }

  const inferredPublished = getPublishedPreprint(step);
  if (inferredPublished) {
    findAndUpdateOrAddPreprintDescribedBy(inferredPublished, preprints);
  }

  const preprintUnderReviewAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.UnderReview);
  if (preprintUnderReviewAssertion) {
    // Update type and sent for review date
    const preprint = findAndUpdateOrAddPreprintDescribedBy(preprintUnderReviewAssertion.item, preprints);
    preprint.sentForReviewDate = preprintUnderReviewAssertion.happened;
  }

  const inferredRepublished = getRepublishedPreprint(step);
  if (inferredRepublished) {
    // preprint input, preprint output, but no evaluations = superceed input preprint with output Reviewed Preprint
    const preprint = findAndUpdateOrAddPreprintDescribedBy(inferredRepublished.originalExpression, preprints);
    republishPreprintAs(inferredRepublished.republishedExpression, preprint);
  }

  const inferredPeerReviewed = getPeerReviewedPreprint(step);
  if (inferredPeerReviewed) {
    const preprint = findAndUpdateOrAddPreprintDescribedBy(inferredPeerReviewed.peerReviewedPreprint, preprints);
    setPeerReviewFrom(step.actions, preprint);
    preprint.reviewedDate = preprint.peerReview?.evaluationSummary?.date;

    // sometimes a new reviewed preprint is published as an output
    if (inferredPeerReviewed.republishedPreprint) {
      republishPreprintAs(inferredPeerReviewed.republishedPreprint, preprint);
    }
  }

  const newVersionPreprint = getNewVersionPreprint(step);
  if (newVersionPreprint) {
    findAndUpdateOrAddPreprintDescribedBy(newVersionPreprint.newVersionExpression, preprints);
  }

  // sometimes author response is a separate step, find those and add the author response
  const authorResponse = getAuthorResponse(step);
  if (authorResponse) {
    const preprint = findAndUpdateOrAddPreprintDescribedBy(authorResponse.preprint, preprints);
    setPeerReviewFrom(step.actions, preprint);
    preprint.authorResponseDate = authorResponse.authorResponse.published;
  }

  return preprints;
};

// eslint-disable-next-line func-names
const getSteps = function* (docMap: DocMap): Generator<Step> {
  let currentStep = docMap.steps.get(docMap['first-step']);
  if (currentStep === undefined) {
    return;
  }

  while (currentStep !== undefined) {
    yield currentStep;

    if (typeof currentStep['next-step'] === 'string') {
      currentStep = docMap.steps.get(currentStep['next-step']);
    } else {
      currentStep = currentStep['next-step'];
    }
  }
};

const parseDocMapJson = (docMapJson: string): DocMap => {
  const docMapStruct = JSON.parse(docMapJson, (key, value) => {
    if (key === 'steps') {
      return new Map<string, Step>(Object.entries(value));
    }
    const dateFields = [
      'happened',
      'published',
    ];
    if (dateFields.includes(key)) {
      return new Date(value);
    }
    return value;
  });

  return docMapStruct as DocMap;
};

export const finaliseVersions = (preprints: Array<ReviewedPreprint>): { id: string, versions: VersionedReviewedPreprint[] } => {
  const versions = preprints.map((preprint, index) => ({
    ...preprint,
    versionIdentifier: preprint.versionIdentifier ?? preprint.preprint.versionIdentifier ?? `${index + 1}`,
  }));

  const { id } = preprints.slice(-1)[0];

  return {
    id,
    versions,
  };
};

export const parsePreprintDocMap = (docMap: DocMap | string): ManuscriptData => {
  const docMapStruct = typeof docMap === 'string' ? parseDocMapJson(docMap) : docMap;

  const steps = Array.from(docMapStruct.steps.values());
  if (steps.length === 0) {
    throw new Error('Docmap has no steps');
  }

  const stepsIterator = getSteps(docMapStruct);
  let currentStep = stepsIterator.next().value;
  let preprints: Array<ReviewedPreprint> = [];
  while (currentStep) {
    preprints = parseStep(currentStep, preprints);
    currentStep = stepsIterator.next().value;
  }

  if (preprints.length === 0) {
    throw new Error('Docmap has no preprints');
  }

  const { id, versions } = finaliseVersions(preprints);
  return {
    id,
    versions,
  };
};
