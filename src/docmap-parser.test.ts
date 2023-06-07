import { DocMap } from './docmap';
import {
  parsePreprintDocMap,
  ManuscriptData,
  ReviewType,
  VersionedReviewedPreprint,
} from './docmap-parser';
import { fixtures } from '../test-fixtures/docmapGenerators';

const parseDocMap = (docmap: DocMap | string): ManuscriptData => {
  const parsedDocMap = parsePreprintDocMap(docmap);
  if (parsedDocMap === undefined) {
    throw Error('This docmap resulted in an undefined return');
  }
  return parsedDocMap;
};

describe('docmap-parser', () => {
  it('returns empty result without any steps', () => {
    const docmap = fixtures.noSteps();
    docmap.steps = new Map();
    const parsedData = parsePreprintDocMap(docmap);

    expect(parsedData).toBeUndefined();
  });

  it('returns empty result when it cant find the first step', () => {
    const docmap = fixtures.noSteps();
    docmap['first-step'] = 'wrongid';
    const parsedData = parsePreprintDocMap(docmap);

    expect(parsedData).toBeUndefined();
  });

  it('finds a published preprint from output step with DOI', () => {
    const parsedData = parseDocMap(fixtures.simplePreprintAsOutput());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
    });
  });

  it('finds a published preprint from output step with URL', () => {
    const parsedData = parseDocMap(fixtures.simplePreprintWithUrlAsOutput());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
    });
  });

  it('finds a preprint from a docmap describing under review assertion', () => {
    const parsedData = parseDocMap(fixtures.assertPreprintUnderReview());

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

  it('only parses 1 version when a step makes an assertion about an existing version', () => {
    const parsedData = parseDocMap(fixtures.assertPreprintPublishedThenUnderReview());

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      status: 'Enhanced Preprint (preview)',
    });
  });

  it.failing('finds two versions when a step makes an assertion about a new version', () => {
    const parsedData = parseDocMap(fixtures.assertTwoPreprintsUnderReview());

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
    const parsedData = parseDocMap(fixtures.preprintRepublishedViaAssertion());

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
    const parsedData = parseDocMap(fixtures.preprintAndRevision());

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

  it('finds a reviewed preprint reviews and evaluations from a docmap', () => {
    const parsedData = parseDocMap(fixtures.preprintReviewed());

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
            contentUrls: ['https://content.com/12345.sa1'],
            date: new Date('2022-04-06'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
          {
            reviewType: ReviewType.Review,
            contentUrls: ['https://content.com/12345.sa2'],
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
          contentUrls: ['https://content.com/12345.sa3'],
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

  it('finds author response after publishing reviewed preprint', () => {
    const parsedData = parseDocMap(fixtures.preprintReviewedAndAuthorResponded());

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
            contentUrls: ['https://content.com/12345.sa1'],
            date: new Date('2022-04-06'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
          {
            reviewType: ReviewType.Review,
            contentUrls: ['https://content.com/12345.sa2'],
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
          contentUrls: ['https://content.com/12345.sa3'],
          date: new Date('2022-04-10'),
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: 'unknown',
          }],
        },
        authorResponse: {
          reviewType: ReviewType.AuthorResponse,
          contentUrls: ['https://content.com/12345.sa4'],
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

  it('inference of reviewed preprint from input/outputs', () => {
    const parsedData = parseDocMap(fixtures.inferredReviewedPreprint());

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
            contentUrls: ['https://content.com/12345.sa1'],
            date: new Date('2022-04-06'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
          {
            reviewType: ReviewType.Review,
            contentUrls: ['https://content.com/12345.sa2'],
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
          contentUrls: ['https://content.com/12345.sa3'],
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
    const parsedData = parseDocMap(fixtures.inferredRevisedPreprint());

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
    const parsedData = parseDocMap(fixtures.preprintWithPublishedDateAndNoAssertedPublishDate());

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
