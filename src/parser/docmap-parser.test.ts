import { DocMap } from '../types';
import {
  parsePreprintDocMap,
  ManuscriptData,
  ReviewType,
  VersionedReviewedPreprint,
  VersionedPreprint,
} from './docmap-parser';
import { fixtures } from '../test-fixtures/docmap-parser';

const parseDocMap = (docmap: DocMap | string): ManuscriptData => {
  const parsedDocMap = parsePreprintDocMap(docmap);
  if (parsedDocMap === undefined) {
    throw Error('This docmap resulted in an undefined return');
  }
  return parsedDocMap;
};

describe('docmap-parser', () => {
  it('returns error without any steps', () => {
    const docmap = fixtures.noSteps();
    docmap.steps = new Map();

    expect(() => parsePreprintDocMap(docmap)).toThrowError('Docmap has no steps');
  });

  it('returns error when it cant find the first step', () => {
    const docmap = fixtures.noSteps();
    docmap['first-step'] = 'wrongid';

    expect(() => parsePreprintDocMap(docmap)).toThrowError('Docmap has no steps');
  });

  it('returns error when it cant find any preprints', () => {
    const docmap = fixtures.emptyStep();

    expect(() => parsePreprintDocMap(docmap)).toThrowError('Docmap has no preprints');
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
      url: 'https://somewhere.org/preprint/article1',
    });
  });

  it('finds a published preprint from output step with URL', () => {
    const parsedData = parseDocMap(fixtures.simplePreprintWithS3Manifestation());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      content: [
        's3://bucket/path/to/article.meca',
      ],
    });
  });

  it('finds a preprint from a docmap describing under review assertion', () => {
    const parsedData = parseDocMap(fixtures.assertPreprintUnderReview());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      url: 'https://something.org/preprint/article1',
      preprint: {
        doi: 'preprint/article1',
        id: 'preprint/article1',
        url: 'https://something.org/preprint/article1',
      },
    });
  });

  it('only parses 1 version when a step makes an assertion about an existing version', () => {
    const parsedData = parseDocMap(fixtures.assertPreprintPublishedThenUnderReview());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
    });
  });

  it('finds a preprint when a step makes an published assertion', () => {
    const parsedData = parseDocMap(fixtures.assertPreprintPublished());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      versionIdentifier: '1',
    });
  });

  it('finds two versions when a step makes an assertion about a new version', () => {
    const parsedData = parseDocMap(fixtures.assertTwoPreprintsUnderReview());

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

  it('detect when a republish is inferred from a step', () => {
    const parsedData = parseDocMap(fixtures.inferRepublishedPreprint());

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
      license: 'http://creativecommons.org/licenses/by/4.0/',
    });
  });

  it('finds a revised preprint from a docmap', () => {
    const parsedData = parseDocMap(fixtures.preprintAndRevision());

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
            doi: 'elife/eLife.12345.sa1',
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
            }],
          },
          {
            reviewType: ReviewType.Review,
            contentUrls: ['https://content.com/12345.sa2'],
            date: new Date('2022-04-07'),
            doi: 'elife/eLife.12345.sa2',
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          contentUrls: ['https://content.com/12345.sa3'],
          date: new Date('2022-04-10'),
          doi: 'elife/eLife.12345.sa3',
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: {
              name: 'Acme Looniversity',
              location: 'United States',
            },
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
            doi: 'elife/eLife.12345.sa1',
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
            }],
          },
          {
            reviewType: ReviewType.Review,
            contentUrls: ['https://content.com/12345.sa2'],
            date: new Date('2022-04-07'),
            doi: 'elife/eLife.12345.sa2',
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          contentUrls: ['https://content.com/12345.sa3'],
          date: new Date('2022-04-10'),
          doi: 'elife/eLife.12345.sa3',
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: {
              name: 'Acme Looniversity',
              location: 'United States',
            },
          }],
        },
        authorResponse: {
          reviewType: ReviewType.AuthorResponse,
          contentUrls: ['https://content.com/12345.sa4'],
          date: new Date('2022-05-09'),
          doi: 'elife/eLife.12345.sa4',
          participants: [{
            name: 'Bugs Bunny',
            role: 'author',
            institution: {
              name: 'Acme Looniversity',
              location: 'United States',
            },
          }],
        },
      },
    });
  });

  it('finds author repl after publishing reviewed preprint', () => {
    const parsedData = parseDocMap(fixtures.preprintReviewedAndAuthorReplied());
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<VersionedReviewedPreprint>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
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
            doi: 'elife/eLife.12345.sa1',
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
            }],
          },
          {
            reviewType: ReviewType.Review,
            contentUrls: ['https://content.com/12345.sa2'],
            date: new Date('2022-04-07'),
            doi: 'elife/eLife.12345.sa2',
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          contentUrls: ['https://content.com/12345.sa3'],
          date: new Date('2022-04-10'),
          doi: 'elife/eLife.12345.sa3',
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: {
              name: 'Acme Looniversity',
              location: 'United States',
            },
          }],
        },
        authorResponse: {
          reviewType: ReviewType.AuthorResponse,
          contentUrls: ['https://content.com/12345.sa4'],
          date: new Date('2022-05-09'),
          doi: 'elife/eLife.12345.sa4',
          participants: [{
            name: 'Bugs Bunny',
            role: 'author',
            institution: {
              name: 'Acme Looniversity',
              location: 'United States',
            },
          }],
        },
      },
    });
  });

  it('finds author repl after publishing reviewed preprint - same step', () => {
    const parsedData = parseDocMap(fixtures.preprintReviewedAndAuthorRepliedSameStep());
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<VersionedReviewedPreprint>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
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
            doi: 'elife/eLife.12345.sa1',
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
            }],
          },
          {
            reviewType: ReviewType.Review,
            contentUrls: ['https://content.com/12345.sa2'],
            date: new Date('2022-04-07'),
            doi: 'elife/eLife.12345.sa2',
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          contentUrls: ['https://content.com/12345.sa3'],
          date: new Date('2022-04-10'),
          doi: 'elife/eLife.12345.sa3',
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: {
              name: 'Acme Looniversity',
              location: 'United States',
            },
          }],
        },
        authorResponse: {
          reviewType: ReviewType.AuthorResponse,
          contentUrls: ['https://content.com/12345.sa4'],
          date: new Date('2022-05-09'),
          doi: 'elife/eLife.12345.sa4',
          participants: [{
            name: 'Bugs Bunny',
            role: 'author',
            institution: {
              name: 'Acme Looniversity',
              location: 'United States',
            },
          }],
        },
      },
    });
  });

  it('can parse a docmap with an inference of version of record from input/outputs', () => {
    const parsedData = parseDocMap(fixtures.inferredVersionOfRecord());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<VersionedPreprint>({
      doi: 'vor/article1',
      id: 'vor/article1',
      publishedDate: new Date('2024-05-09'),
      url: 'https://version-of-record',
      content: [
        'https://doi.org/version-of-record',
      ],
      versionIdentifier: '1',
    });
  });

  it('can parse corrections on a published version of record', () => {
    const parsedData = parseDocMap(fixtures.assertVersionOfRecordPublishedThenCorrected());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<VersionedPreprint>({
      doi: 'vor/article1',
      id: 'vor/article1',
      publishedDate: new Date('2024-05-09'),
      url: 'https://version-of-record',
      content: [
        'https://doi.org/version-of-record',
        'https://doi.org/version-of-record-corrected',
        'https://doi.org/version-of-record-corrected-again',
      ],
      versionIdentifier: '1',
      corrections: [
        {
          content: [
            'https://doi.org/version-of-record-corrected',
          ],
          correctedDate: new Date('2024-06-09'),
        },
        {
          content: [
            'https://doi.org/version-of-record-corrected-again',
          ],
          correctedDate: new Date('2024-06-10'),
        },
      ],
    });
  });

  it('inference of reviewed preprint from input/outputs', () => {
    const parsedData = parseDocMap(fixtures.inferredReviewedPreprint());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<VersionedReviewedPreprint>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
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
            doi: 'elife/eLife.12345.sa1',
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
            }],
          },
          {
            reviewType: ReviewType.Review,
            contentUrls: ['https://content.com/12345.sa2'],
            date: new Date('2022-04-07'),
            doi: 'elife/eLife.12345.sa2',
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          contentUrls: ['https://content.com/12345.sa3'],
          date: new Date('2022-04-10'),
          doi: 'elife/eLife.12345.sa3',
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: {
              name: 'Acme Looniversity',
              location: 'United States',
            },
          }],
        },
      },
    });
  });

  it('inference of revised preprint from input/outputs', () => {
    const parsedData = parseDocMap(fixtures.inferredRevisedPreprint());

    expect(parsedData.versions.length).toStrictEqual(2);
    expect(parsedData.versions[0]).toMatchObject<VersionedReviewedPreprint>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
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

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
    });
  });

  it('updates published date from a later step', () => {
    const parsedData = parseDocMap(fixtures.preprintPublishedDataInLaterSteps());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      publishedDate: new Date('2023-06-23'),
    });
  });

  it('updates url and content from a later step, but keeps published date from earlier step', () => {
    const parsedData = parseDocMap(fixtures.preprintUrlAndContentDataInLaterSteps());

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      preprint: {
        publishedDate: new Date('2023-06-23'),
        url: 'http://somewhere.org/preprint/article1',
        content: [
          's3://somewhere-org-storage-bucket/preprint/article1.meca',
        ],
      },
    });
  });

  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');

  it('extracts license url if in an expression', () => {
    const parsedData = parseDocMap(fixtures.preprintRepublishedViaAssertion());

    expect(parsedData.versions[0]).toMatchObject({
      preprint: {
        license: 'http://creativecommons.org/licenses/by/4.0/',
      },
      license: 'http://creativecommons.org/licenses/by/4.0/',
    });
  });

  it('extracts a content array if in an expression', () => {
    const parsedData = parseDocMap(fixtures.preprintRepublishedViaAssertion());

    expect(parsedData.versions[0]).toMatchObject({
      content: [
        's3://somewhere-org-storage-bucket/preprint/article1.meca',
      ],
    });
  });

  it('extracts partOf, if present', () => {
    const parsedData = parseDocMap(fixtures.preprintWithManuscriptAsOutput());

    expect(parsedData.manuscript).toStrictEqual({
      doi: '10.1101/123456',
      volume: '1',
      eLocationId: 'RP123456',
      subjects: [
        'Biochemistry and Chemical Biology',
        'Neuroscience',
      ],
    });
  });

  it('extracts partial partOf, if present', () => {
    const parsedData = parseDocMap(fixtures.preprintWithPartialManuscriptAsOutput());

    expect(parsedData.manuscript).toStrictEqual({
      doi: '10.1101/123456',
      eLocationId: 'RP123456',
    });
  });

  it('parse draft assertions for expressions', () => {
    const parsedData = parseDocMap(fixtures.assertDraftPublished());

    expect(parsedData.versions[0]).toMatchObject({
      id: 'preprint/article1',
      doi: 'preprint/article1',
      preprint: {
        id: 'preprint/article1',
        doi: 'preprint/article1',
        publishedDate: new Date('2022-03-01'),
      },
      publishedDate: new Date('2022-03-01'),
      versionIdentifier: '1',
    });
  });

  it('parses umbrella expressions from multiple locations', () => {
    const docmap = fixtures.preprintWithUmbrellaExpressionsFromMultipleLocations();
    const parsedData = parseDocMap(docmap);

    expect(parsedData.versions.length).toEqual(1);

    expect(parsedData.manuscript).toStrictEqual({
      doi: '10.1101/123456',
      volume: '1',
      eLocationId: 'RP123456',
      subjects: [
        'subject 1',
      ],
    });
  });

  it('parses relatedContent', () => {
    const docmap = fixtures.preprintWithPartialManuscriptWithRelatedContent();
    const parsedData = parseDocMap(docmap);

    expect(parsedData.manuscript?.relatedContent).toEqual([{
      type: 'insight',
      title: 'Insight Title',
      url: 'https://somewhere.org/insight',
    }]);
  });

  it('parses publishedDate', () => {
    const docmap = fixtures.preprintWithPartialManuscriptWithPublishedDate();
    const parsedData = parseDocMap(docmap);

    expect(parsedData.manuscript?.publishedDate).toEqual(new Date('2022-03-01'));
  });
});
