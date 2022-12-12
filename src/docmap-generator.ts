import { Action, Assertion, AssertionStatus, DocMap, DOI, EvaluationSummary, Expression, ExpressionType, Input, Item, JsonLDAddonFrame, JsonLDFrameUrl, ManifestationType, Output, Participant, PeerReview, Preprint, Publisher, Step, Url, WebPage } from './docmap';

type Steps = {
  'first-step': string,
  steps: Map<string, Step>
}

export const generatePreprint = (doi: DOI, published?: Date, url?: Url): Input => ({
  type: ExpressionType.Preprint,
  doi,
  url,
  published,
});

export const generatePeerReview = (published: Date, content: WebPage[], doi?: DOI, url?: Url): PeerReview => ({
  type: ExpressionType.PeerReview,
  doi,
  published,
  url,
  content,
});

export const generateEvaluationSummary = (published: Date, content: WebPage[], doi?: DOI, url?: Url): EvaluationSummary => ({
  type: ExpressionType.EvaluationSummary,
  doi,
  published,
  url,
  content,
});

export const generateEnhancedPreprint = (identifier: string, version: string, doi: DOI, published: Date, url: Url, content: WebPage[]): Preprint => ({
  identifier,
  versionIdentifier: version,
  type: ExpressionType.Preprint,
  doi,
  url,
  published,
  content,
});

export const generateWebContent = (url: Url): WebPage => ({
  type: ManifestationType.WebPage,
  url,
});

export const generatePersonParticipant = (name: string, role: string): Participant => ({
  actor: {
    name,
    type: 'person',
  },
  role,
});

export const generateAction = (participants: Participant[], outputs: Output[]): Action => ({
  participants,
  outputs,
});

export const generatePeerReviewAction = (participants: Participant[], outputs: Output[]): Action => ({
  participants,
  outputs,
});

export const generateStep = (inputs: Input[], actions: Action[], assertions: Assertion[]): Step => ({
  assertions,
  inputs,
  actions,
});

export const addNextStep = (previousStep: Step, nextStep: Step): Step => {
  previousStep['next-step'] = nextStep;
  nextStep['previous-step'] = previousStep;

  return nextStep
};

export const generatePublishedAssertion = (item: Item): Assertion => {
  return {
    item,
    status: AssertionStatus.Published
  };
}

export const generatePeerReviewedAssertion = (item: Item): Assertion => {
  return {
    item,
    status: AssertionStatus.PeerReviewed
  };
}

export const generateEnhancedAssertion = (item: Item): Assertion => {
  return {
    item,
    status: AssertionStatus.Enhanced
  };
}

export const generateUnderReviewAssertion = (item: Item): Assertion => {
  return {
    item,
    status: AssertionStatus.UnderReview
  };
}

export const generateVersionOfRecordAssertion = (item: Item): Assertion => {
  return {
    item,
    status: AssertionStatus.VersionOfRecord
  };
}

const dereferenceSteps = (firstStep: Step): Steps => {
  const steps = new Map<string, Step>();

  let currentStep: Step | undefined = firstStep;
  let currentStepId: number | undefined = 0;
  let previousStepId: number | undefined = undefined;
  let nextStepId: number | undefined = undefined;

  while (currentStep !== undefined) {
    nextStepId = currentStep['next-step'] !== undefined ? currentStepId + 1 : undefined;

    steps.set('_:b'+currentStepId, {
      actions: currentStep.actions,
      assertions: currentStep.assertions,
      inputs: currentStep.inputs,
      "next-step": nextStepId ? '_:b'+nextStepId : undefined,
      "previous-step": previousStepId ? '_:b'+previousStepId : undefined,
    });

    previousStepId = currentStepId;
    if (typeof currentStep['next-step'] === 'string') {
      currentStep = steps.get(currentStep['next-step']);
    } else {
      currentStep = currentStep['next-step'];
    }
    currentStepId++;
  }

  return {
    'first-step': '_:b0',
    steps,
  };
};

export const generateDocMap = (id: string, publisher: Publisher, firstStep: Step): DocMap => {
  const steps = dereferenceSteps(firstStep);
  return {
    '@context': [ JsonLDFrameUrl, JsonLDAddonFrame ],
    type: 'docmap',
    id: id,
    created: new Date('2022-09-06T09:10:16.834Z'),
    updated: new Date('2022-09-06T09:10:20.344Z'),
    publisher: publisher,
    ...steps,
  };
};
