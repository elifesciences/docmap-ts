import { DocMap, ManifestationType } from '..';
import {
  addNextStep,
  generateAction,
  generateAuthorResponse,
  generateContent,
  generateDocMap,
  generateEvaluationSummary,
  generatePeerReview,
  generatePeerReviewedAssertion,
  generatePersonParticipant,
  generatePreprint,
  generatePublishedAssertion,
  generateRepublishedAssertion,
  generateStep,
  generateUnderReviewAssertion,
  generateWebContent,
} from '../docmap-generator';

const publisher = {
  id: 'https://elifesciences.org/',
  name: 'eLife',
  logo: 'https://sciety.org/static/groups/elife--b560187e-f2fb-4ff9-a861-a204f3fc0fb0.png',
  homepage: 'https://elifesciences.org/',
  account: {
    id: 'https://sciety.org/groups/elife',
    service: 'https://sciety.org',
  },
};

export const fixtures = {
  noSteps: () => {
    const docmap = generateDocMap('test', publisher, { assertions: [], inputs: [], actions: [] });
    docmap.steps = new Map();
    return docmap;
  },

  emptyStep: () => {
    const firstStep = generateStep([], [], []);
    return generateDocMap('test', publisher, firstStep);
  },

  simplePreprintAsOutput: (): DocMap => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep([], [generateAction([], [preprint])], []);
    return generateDocMap('test', publisher, firstStep);
  },

  simplePreprintWithUrlAsOutput: (): DocMap => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'), 'https://somewhere.org/preprint/article1');
    const firstStep = generateStep([], [generateAction([], [preprint])], []);
    return generateDocMap('test', publisher, firstStep);
  },

  simplePreprintWithS3Manifestation: (): DocMap => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, undefined, [generateContent(ManifestationType.DigitalManifestation, 's3://bucket/path/to/article.meca')]);
    const firstStep = generateStep([], [generateAction([], [preprint])], []);
    return generateDocMap('test', publisher, firstStep);
  },

  assertPreprintUnderReview: (): DocMap => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'), 'https://something.org/preprint/article1');
    const firstStep = generateStep(
      [],
      [],
      [generateUnderReviewAssertion(preprint, new Date('2022-04-12'))],
    );
    return generateDocMap('test', publisher, firstStep);
  },

  assertPreprintPublished: (): DocMap => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprint, new Date('2022-03-01'))],
    );

    return generateDocMap('test', publisher, firstStep);
  },

  preprintPublishedDataInLaterSteps: (): DocMap => {
    const preprint1 = generatePreprint('preprint/article1');
    const preprint2 = generatePreprint('preprint/article1', new Date('2023-06-23'));
    const firstStep = generateStep(
      [],
      [generateAction([], [preprint1])],
      [],
    );
    addNextStep(firstStep, generateStep(
      [],
      [generateAction([], [preprint2])],
      [],
    ));

    return generateDocMap('test', publisher, firstStep);
  },

  preprintUrlAndContentDataInLaterSteps: (): DocMap => {
    const preprint1 = generatePreprint('preprint/article1', new Date('2023-06-23'));
    const preprint2 = generatePreprint(
      'preprint/article1',
      undefined,
      'http://somewhere.org/preprint/article1',
      undefined,
      [generateContent(ManifestationType.DigitalManifestation, 's3://somewhere-org-storage-bucket/preprint/article1.meca')],
    );
    const firstStep = generateStep(
      [],
      [generateAction([], [preprint1])],
      [],
    );
    addNextStep(firstStep, generateStep(
      [],
      [generateAction([], [preprint2])],
      [],
    ));

    return generateDocMap('test', publisher, firstStep);
  },

  assertPreprintPublishedThenUnderReview: (): DocMap => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprint, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep(
      [],
      [],
      [generateUnderReviewAssertion(preprint, new Date('2022-04-12'))],
    ));

    return generateDocMap('test', publisher, firstStep);
  },

  assertTwoPreprintsUnderReview: (): DocMap => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const preprintv2 = generatePreprint('preprint/article1', new Date('2022-04-12'), undefined, '4');
    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep(
      [preprintv1],
      [],
      [generatePublishedAssertion(preprintv2, new Date('2022-04-12'))],
    ));

    return generateDocMap('test', publisher, firstStep);
  },

  preprintRepublishedViaAssertion: (): DocMap => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '4');
    const preprintv2 = generatePreprint('elife/12345.1', new Date('2022-04-12'), undefined, '1');

    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep(
      [preprintv1],
      [generateAction([], [preprintv2])],
      [generateRepublishedAssertion(preprintv2, new Date('2022-04-12'))],
    ));

    return generateDocMap('test', publisher, firstStep);
  },

  preprintAndRevision: (): DocMap => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const preprintv2 = generatePreprint('preprint/article1v2', new Date('2022-06-01'), undefined, '2');

    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv2, new Date('2022-06-01'))],
    ));

    return generateDocMap('test', publisher, firstStep);
  },

  preprintReviewed: (): DocMap => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const anonReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-06'),
      [
        generateWebContent('https://content.com/12345.sa1'),
      ],
      'elife/eLife.12345.sa1',
    );
    const peerReview2 = generatePeerReview(
      new Date('2022-04-07'),
      [
        generateWebContent('https://content.com/12345.sa2'),
      ],
      'elife/eLife.12345.sa2',
    );
    const editor = generatePersonParticipant('Daffy Duck', 'editor');
    const editorsEvaluation = generateEvaluationSummary(
      new Date('2022-04-10'),
      [
        generateWebContent('https://content.com/12345.sa3'),
      ],
      'elife/eLife.12345.sa3',
    );

    const firstStep = generateStep([], [generateAction([], [preprintv1])], []);
    addNextStep(firstStep, generateStep(
      [preprintv1],
      [
        generateAction([anonReviewerParticipant], [peerReview1]),
        generateAction([anonReviewerParticipant], [peerReview2]),
        generateAction([editor], [editorsEvaluation]),
      ],
      [generatePeerReviewedAssertion(preprintv1, new Date('2022-04-10'))],
    ));

    return generateDocMap('test', publisher, firstStep);
  },

  preprintReviewedAndAuthorResponded: (): DocMap => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const anonReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-06'),
      [
        generateWebContent('https://content.com/12345.sa1'),
      ],
      'elife/eLife.12345.sa1',
    );
    const peerReview2 = generatePeerReview(
      new Date('2022-04-07'),
      [
        generateWebContent('https://content.com/12345.sa2'),
      ],
      'elife/eLife.12345.sa2',
    );
    const editor = generatePersonParticipant('Daffy Duck', 'editor');
    const editorsEvaluation = generateEvaluationSummary(
      new Date('2022-04-10'),
      [
        generateWebContent('https://content.com/12345.sa3'),
      ],
      'elife/eLife.12345.sa3',
    );
    const author = generatePersonParticipant('Bugs Bunny', 'author');
    const authorResponse = generateAuthorResponse(
      new Date('2022-05-09'),
      [
        generateWebContent('https://content.com/12345.sa4'),
      ],
      'elife/eLife.12345.sa4',
    );

    const firstStep = generateStep([], [generateAction([], [preprintv1])], []);
    const nextStep = addNextStep(firstStep, generateStep( //
      [preprintv1],
      [
        generateAction([anonReviewerParticipant], [peerReview1]),
        generateAction([anonReviewerParticipant], [peerReview2]),
        generateAction([editor], [editorsEvaluation]),
      ],
      [generatePeerReviewedAssertion(preprintv1, new Date('2022-04-01'))],
    ));
    addNextStep(nextStep, generateStep( //
      [preprintv1],
      [
        generateAction([author], [authorResponse]),
      ],
      [],
    ));

    return generateDocMap('test', publisher, firstStep);
  },

  inferredReviewedPreprint: (): DocMap => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const anonReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-06'),
      [
        generateWebContent('https://content.com/12345.sa1'),
      ],
      'elife/eLife.12345.sa1',
    );
    const peerReview2 = generatePeerReview(
      new Date('2022-04-07'),
      [
        generateWebContent('https://content.com/12345.sa2'),
      ],
      'elife/eLife.12345.sa2',
    );
    const editor = generatePersonParticipant('Daffy Duck', 'editor');
    const editorsEvaluation = generateEvaluationSummary(
      new Date('2022-04-10'),
      [
        generateWebContent('https://content.com/12345.sa3'),
      ],
      'elife/eLife.12345.sa3',
    );

    const firstStep = generateStep(
      [preprintv1],
      [
        generateAction([anonReviewerParticipant], [peerReview1]),
        generateAction([anonReviewerParticipant], [peerReview2]),
        generateAction([editor], [editorsEvaluation]),
      ],
      [],
    );

    return generateDocMap('test', publisher, firstStep);
  },

  inferredRevisedPreprint: (): DocMap => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const anonReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-06'),
      [
        generateWebContent('https://content.com/12345.sa1'),
      ],
      'elife/eLife.12345.sa1',
    );
    const peerReview2 = generatePeerReview(
      new Date('2022-04-07'),
      [
        generateWebContent('https://content.com/12345.sa2'),
      ],
      'elife/eLife.12345.sa2',
    );
    const editor = generatePersonParticipant('Daffy Duck', 'editor');
    const editorsEvaluation = generateEvaluationSummary(
      new Date('2022-04-10'),
      [
        generateWebContent('https://content.com/12345.sa3'),
      ],
      'elife/eLife.12345.sa3',
    );

    const firstStep = generateStep(
      [preprintv1],
      [
        generateAction([anonReviewerParticipant], [peerReview1]),
        generateAction([anonReviewerParticipant], [peerReview2]),
        generateAction([editor], [editorsEvaluation]),
      ],
      [],
    );

    const preprintv2 = generatePreprint('preprint/article1', new Date('2022-05-01'), undefined, '2');
    addNextStep(firstStep, generateStep(
      [preprintv1, peerReview1, peerReview2, editorsEvaluation],
      [
        generateAction([], [preprintv2]),
      ],
      [],
    ));

    return generateDocMap('test', publisher, firstStep);
  },

  preprintWithPublishedDateAndNoAssertedPublishDate: (): DocMap => {
    const preprint = generatePreprint('preprint/article1');
    const preprintWithDate = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep(
      [],
      [generateAction([], [preprintWithDate])],
      [generatePublishedAssertion(preprint)],
    );

    return generateDocMap('test', publisher, firstStep);
  },
};
