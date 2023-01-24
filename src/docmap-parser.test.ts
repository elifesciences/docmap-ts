import { Step } from './docmap';
import {
  addNextStep,
  generateAction,
  generateAuthorResponse,
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
} from './docmap-generator';
import {
  parsePreprintDocMap,
  ManuscriptData,
  ReviewType,
  VersionedReviewedPreprint,
} from './docmap-parser';

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

const parseDocMapFromFirstStep = (step: Step): ManuscriptData => {
  const docmap = generateDocMap('test', publisher, step);
  const parsedDocMap = parsePreprintDocMap(docmap);
  if (parsedDocMap === undefined) {
    throw Error('This docmap resulted in an undefined return');
  }
  return parsedDocMap;
};

describe('docmap-parser', () => {
  it('returns empty result without any steps', () => {
    const docmap = generateDocMap('test', publisher, { assertions: [], inputs: [], actions: [] });
    docmap.steps = new Map();
    const parsedData = parsePreprintDocMap(docmap);

    expect(parsedData).toBeUndefined();
  });

  it('returns empty result when it cant find the first step', () => {
    const docmap = generateDocMap('test', publisher, { assertions: [], inputs: [], actions: [] });
    docmap['first-step'] = 'wrongid';
    const parsedData = parsePreprintDocMap(docmap);

    expect(parsedData).toBeUndefined();
  });

  it('finds a published preprint from output step with DOI', () => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep([], [generateAction([], [preprint])], []);
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
    });
  });

  it('finds a published preprint from output step with URL', () => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'), 'https://somewhere.org/preprint/article1');
    const firstStep = generateStep([], [generateAction([], [preprint])], []);
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
    });
  });

  it('finds a preprint from a docmap describing under review assertion', () => {
    // Arrange
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'), 'https://something.org/preprint/article1');
    const firstStep = generateStep(
      [],
      [],
      [generateUnderReviewAssertion(preprint, new Date('2022-04-12'))],
    );

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint (preview)',
      preprint: {
        doi: 'preprint/article1',
        id: 'preprint/article1',
      },
    });
  });

  it('finds a preprint from a docmap describing under review assertion without URL', () => {
    // Arrange
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep(
      [],
      [],
      [generateUnderReviewAssertion(preprint, new Date('2022-04-12'))],
    );

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint (preview)',
    });
  });

  it('finds a single version when a step makes an assertion about an existing version', () => {
    // Arrange
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

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint (preview)',
    });
  });

  it.failing('finds two versions when a step makes an assertion about a new version', () => {
    // Arrange
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

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(2);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      versionIdentifier: '1',
    });
    expect(parsedData.versions[1]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      versionIdentifier: '4',
    });
  });

  it('detect when a step makes a republished assertion', () => {
    // Arrange
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

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'elife/12345.1',
      id: 'elife/12345.1',
      versionIdentifier: '1',
      preprint: {
        doi: 'preprint/article1',
        id: 'preprint/article1',
        versionIdentifier: '4',
      },
    });
  });

  it.failing('finds a revised preprint from a docmap', () => {
    // Arrange
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

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(2);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      versionIdentifier: '1',
    });
    expect(parsedData.versions[1]).toMatchObject({
      doi: 'preprint/article1v2',
      id: 'preprint/article1v2',
      versionIdentifier: '2',
    });
  });

  it('finds author response after publishing reviewed preprint', () => {
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

    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<VersionedReviewedPreprint>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint',
      versionIdentifier: '1',
      preprint: {
        doi: 'preprint/article1',
        id: 'preprint/article1',
        versionIdentifier: '1',
      },
      peerReview: {
        reviews: [
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa1',
            date: new Date('2022-04-06'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa2',
            date: new Date('2022-04-07'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          text: 'fetched content for https://content.com/12345.sa3',
          date: new Date('2022-04-10'),
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: 'unknown',
          }],
        },
        authorResponse: {
          reviewType: ReviewType.AuthorResponse,
          text: 'fetched content for https://content.com/12345.sa4',
          date: new Date('2022-05-09'),
          participants: [{
            name: 'Bugs Bunny',
            role: 'author',
            institution: 'unknown',
          }],
        },
      },
    });
  });

  it('finds a revised preprint reviews and evaluations from a docmap', () => {
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

    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<VersionedReviewedPreprint>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint',
      versionIdentifier: '1',
      preprint: {
        doi: 'preprint/article1',
        id: 'preprint/article1',
        versionIdentifier: '1',
      },
      peerReview: {
        reviews: [
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa1',
            date: new Date('2022-04-06'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa2',
            date: new Date('2022-04-07'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          text: 'fetched content for https://content.com/12345.sa3',
          date: new Date('2022-04-10'),
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: 'unknown',
          }],
        },
      },
    });
  });

  it('inference of reviewed preprint from input/outputs', () => {
    // Arrange
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

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<VersionedReviewedPreprint>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint',
      versionIdentifier: '1',
      preprint: {
        doi: 'preprint/article1',
        id: 'preprint/article1',
        versionIdentifier: '1',
      },
      peerReview: {
        reviews: [
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa1',
            date: new Date('2022-04-06'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa2',
            date: new Date('2022-04-07'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          text: 'fetched content for https://content.com/12345.sa3',
          date: new Date('2022-04-10'),
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: 'unknown',
          }],
        },
      },
    });
  });

  it('inference of revised preprint from input/outputs', () => {
    // Arrange
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

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(2);
    expect(parsedData.versions[0]).toMatchObject<VersionedReviewedPreprint>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint',
      publishedDate: new Date('2022-03-01'),
      reviewedDate: new Date('2022-04-10'),
      versionIdentifier: '1',
      preprint: {
        doi: 'preprint/article1',
        id: 'preprint/article1',
        versionIdentifier: '1',
      },
    });
    expect(parsedData.versions[1]).toMatchObject<VersionedReviewedPreprint>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint (preview)',
      publishedDate: new Date('2022-05-01'),
      versionIdentifier: '2',
      preprint: {
        doi: 'preprint/article1',
        id: 'preprint/article1',
        versionIdentifier: '2',
        publishedDate: new Date('2022-05-01'),
      },
    });
  });

  it('reads the published date from output when an assertion does not have a published date', () => {
    // Arrange
    const preprint = generatePreprint('preprint/article1');
    const preprintWithDate = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep(
      [],
      [generateAction([], [preprintWithDate])],
      [generatePublishedAssertion(preprint)],
    );

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint (preview)',
    });
  });

  it('reads the published date from outputs when an assertion does not have a published date', () => {
    // Arrange
    const preprint = generatePreprint('preprint/article1');
    const preprintWithDate = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep(
      [],
      [generateAction([], [preprintWithDate])],
      [generatePublishedAssertion(preprint)],
    );

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint (preview)',
    });
  });

  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');
  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');
});
