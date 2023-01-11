import {
  Action,
  AssertionStatus,
  DocMap,
  Expression,
  ExpressionType,
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

export enum ContentType {
  Article = 'article',
  EvaluationSummary = 'evaluation-summary',
  Review = 'review-article',
  AuthorResponse = 'author-response',
}

export type Preprint = {
  id: string,
  versionIdentifier?: string,
  publishedDate?: Date,
  doi: string,
  content?: string,
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
};

export type VersionedReviewedPreprint = ReviewedPreprint & {
  versionIdentifier: string,
  status: string,
};

export type ManuscriptData = {
  id: string,
  timeline: TimelineEvent[],
  versions: VersionedReviewedPreprint[],
};

const getPreprintFromExpression = (expression: Expression): Preprint => {
  if (!expression.doi) {
    throw Error('Cannot identify Expression by DOI');
  }
  const content = [];
  if (expression.url) {
    content.push({ type: ContentType.Article, url: expression.url });
  }

  return {
    id: expression.identifier ?? expression.doi,
    doi: expression.doi,
    content: expression.url,
    publishedDate: expression.published,
    versionIdentifier: expression.versionIdentifier,
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

const findPreprintDescribedBy = (expression: Expression, preprintCollection: Array<ReviewedPreprint>):
ReviewedPreprint | undefined => preprintCollection.find(
  (preprint) => isPreprintAboutExpression(preprint, expression) || isPreprintAboutExpression(preprint.preprint, expression),
);

const addPreprintDescribedBy = (expression: Expression, preprintCollection: Array<ReviewedPreprint>): ReviewedPreprint => {
  const newPreprint = createReviewedPreprintFrom(expression);
  preprintCollection.push(newPreprint);
  return newPreprint;
};

const findAndUpdateOrAddPreprintDescribedBy = (expression: Expression, preprintCollection: Array<ReviewedPreprint>): ReviewedPreprint => {
  const foundPreprint = findPreprintDescribedBy(expression, preprintCollection);
  if (!foundPreprint) {
    return addPreprintDescribedBy(expression, preprintCollection);
  }
  // Update fields, default to any data already there.
  foundPreprint.publishedDate = expression.published ?? foundPreprint.publishedDate;
  return foundPreprint;
};

const republishPreprintAs = (expression: Expression, preprint: ReviewedPreprint) => {
  if (!expression.doi) {
    throw Error('Cannot identify Expression by DOI');
  }

  const newPreprint = preprint;

  newPreprint.id = expression.identifier ?? expression.doi;
  newPreprint.doi = expression.doi;
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
  const allContent = output.content.filter((content) => content.type === 'web-page');
  const text = (allContent.length === 1) ? `fetched content for ${allContent[0].url}` : undefined; // TODO

  return {
    reviewType: stringToReviewType(output.type),
    date: output.published,
    participants: action.participants.map((participant) => ({
      name: participant.actor.name,
      institution: 'unknown', // TODO
      role: participant.role,
    })),
    text,
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

const parseStep = (step: Step, preprints: Array<ReviewedPreprint>): Array<ReviewedPreprint> => {
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

  // Parse logic: A "published" Assertion means something was published
  // Parse result: Create a Preprint for the published expression linked in the assertion
  const preprintPublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Published);
  if (preprintPublishedAssertion) {
    const reviewPreprint = findAndUpdateOrAddPreprintDescribedBy(preprintPublishedAssertion.item, preprints);
    // update published date if necessary
    if (preprintPublishedAssertion?.happened) {
      reviewPreprint.publishedDate = preprintPublishedAssertion.happened;
    }
  } else if (preprintInputs.length === 1 && step.actions.length === 0) {
    // only 1 input preprint, no other output preprints or evaluations is ann inferred straightforward publish too
    addPreprintDescribedBy(preprintInputs[0], preprints);
  }

  // Parse logic: An "under-review" Assertion means something is out for review
  // Parse result: Find a ReviewedPreprint for the published expression linked in the assertion and set the status
  const preprintUnderReviewAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.UnderReview);
  if (preprintUnderReviewAssertion) {
    // Update type and sent for review date
    const preprint = findAndUpdateOrAddPreprintDescribedBy(preprintUnderReviewAssertion.item, preprints);
    preprint.sentForReviewDate = preprintUnderReviewAssertion.happened;
  }

  const preprintRepublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Republished);
  if (preprintRepublishedAssertion) {
    // assume there is only one input, which is the preprint
    const preprint = findAndUpdateOrAddPreprintDescribedBy(step.inputs[0], preprints);
    republishPreprintAs(preprintRepublishedAssertion.item, preprint);
  } else if (preprintInputs.length === 1 && evaluationInputs.length > 0 && preprintOutputs.length === 1) {
    // preprint input, evaluation input, and preprint output = superceed input preprint with output Reviewed Preprint
    const preprint = findAndUpdateOrAddPreprintDescribedBy(preprintInputs[0], preprints);
    // only republish if the previous version is not already evaluated - otherwise it's a new version
    if (!preprint.peerReview?.evaluationSummary || isPreprintAboutExpression(preprint, preprintOutputs[0])) {
      republishPreprintAs(preprintOutputs[0], preprint);
    } else {
      addPreprintDescribedBy(preprintOutputs[0], preprints);
    }
  } else if (preprintInputs.length === 1 && evaluationInputs.length === 0 && preprintOutputs.length === 1) {
    // preprint input, preprint output, but no evaluations = superceed input preprint with output Reviewed Preprint
    const preprint = findAndUpdateOrAddPreprintDescribedBy(preprintInputs[0], preprints);
    republishPreprintAs(preprintOutputs[0], preprint);
  }

  const preprintPeerReviewedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.PeerReviewed);
  if (preprintPeerReviewedAssertion) {
    const preprint = findAndUpdateOrAddPreprintDescribedBy(preprintPeerReviewedAssertion.item, preprints);
    setPeerReviewFrom(step.actions, preprint);
    preprint.reviewedDate = preprintPeerReviewedAssertion.happened;
  } else if (preprintInputs.length === 1 && evaluationOutputs.length > 0 && preprintOutputs.length === 0 && evaluationInputs.length === 0) {
    const preprint = findAndUpdateOrAddPreprintDescribedBy(preprintInputs[0], preprints);
    setPeerReviewFrom(step.actions, preprint);
    preprint.reviewedDate = preprint.peerReview?.evaluationSummary?.date;
  }

  // Parse Logic: If we have an author response in output
  // Parse result: include in the preprint evaluation
  const authorResponseOutputs = step.actions.flatMap((action) => action.outputs.filter((output) => output.type === ExpressionType.AuthorResponse));
  if (authorResponseOutputs.length > 0) {
    const preprint = findAndUpdateOrAddPreprintDescribedBy(preprintInputs[0], preprints);
    setPeerReviewFrom(step.actions, preprint);
    preprint.authorResponseDate = authorResponseOutputs[0].published;
  }

  return preprints;
};

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
      currentStep = currentStep['next-step'];
    }
  }
}

const getEventsFromPreprints = (preprint: VersionedReviewedPreprint) => {
  const events = [];
  if (preprint.preprint.publishedDate !== undefined) {
    const contentUrl = preprint.preprint.content;
    const bioRxiv = preprint.preprint.doi.startsWith('10.1101') ?? false;
    const bioRxivUrl = bioRxiv ? `https://doi.org/${preprint.preprint.doi}` : undefined;
    const url = contentUrl ?? bioRxivUrl;
    const link = url ? { text: bioRxiv ? 'Go to BioRxiv' : 'Go to preprint', url } : undefined;
    const version = preprint.versionIdentifier ?? preprint.preprint.versionIdentifier;

    events.push({
      name: `Preprint ${version ? `v${version} ` : ''}posted`,
      date: preprint.preprint.publishedDate,
      link,
    });
  }

  if (preprint.sentForReviewDate) {
    events.push({
      name: 'Preprint sent for review',
      date: preprint.sentForReviewDate,
    });
  }

  if (preprint.reviewedDate) {
    events.push({
      name: 'Reviews received for Preprint',
      date: preprint.reviewedDate,
    });
  }

  if (preprint.publishedDate && preprint.doi !== preprint.preprint.doi) {
    events.push({
      name: 'Reviewed Preprint posted',
      date: preprint.publishedDate,
    });
  }

  // sort by event dates
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const getTimelineFromPreprints = (preprints: VersionedReviewedPreprint[]): TimelineEvent[] => preprints.flatMap((preprint): TimelineEvent[] => getEventsFromPreprints(preprint));

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
  const versions = preprints.map((preprint, index) => {
    const reviewed = !!preprint.peerReview?.evaluationSummary;
    return {
      ...preprint,
      versionIdentifier: preprint.versionIdentifier ?? preprint.preprint.versionIdentifier ?? `${index + 1}`,
      status: `Enhanced Preprint${!reviewed ? ' (preview)' : ''}`,
    };
  });

  const { id } = preprints.slice(-1)[0];

  return {
    id,
    versions,
  };
};

export const parsePreprintDocMap = (docMap: DocMap | string): ManuscriptData | undefined => {
  const docMapStruct = typeof docMap === 'string' ? parseDocMapJson(docMap) : docMap;

  const steps = Array.from(docMapStruct.steps.values());
  if (steps.length === 0) {
    return undefined;
  }

  const stepsIterator = getSteps(docMapStruct);
  let currentStep = stepsIterator.next().value;
  let preprints: Array<ReviewedPreprint> = [];
  while (currentStep) {
    preprints = parseStep(currentStep, preprints);
    currentStep = stepsIterator.next().value;
  }

  if (preprints.length === 0) {
    return undefined;
  }

  const { id, versions } = finaliseVersions(preprints);
  return {
    id,
    versions,
    timeline: getTimelineFromPreprints(versions),
  };
};
