import { DocMap, Step } from './docmap';
import { addNextStep, generateAction, generateDocMap, generateEnhancedAssertion, generateEnhancedPreprint, generateEvaluationSummary, generatePeerReview, generatePeerReviewedAssertion, generatePersonParticipant, generatePreprint, generatePublishedAssertion, generateRepublishedAssertion, generateRevisedPreprint, generateStep, generateUnderReviewAssertion, generateWebContent } from './docmap-generator';
import { parsePreprintDocMap, ParseResult, ReviewType, Version } from './docmap-parser';

const publisher = {
  id: "https://elifesciences.org/",
  name: "eLife",
  logo: "https://sciety.org/static/groups/elife--b560187e-f2fb-4ff9-a861-a204f3fc0fb0.png",
  homepage: "https://elifesciences.org/",
  account: {
    id: "https://sciety.org/groups/elife",
    service: "https://sciety.org"
  }
};

const parseDocMapFromFirstStep = (step: Step): ParseResult => {
  const docmap = generateDocMap('test', publisher, step);
  return parsePreprintDocMap(docmap);
}

const formatDate = (date: Date): string => date.toISOString().substring(0, 10);

describe('docmap-parser', () => {
  it('returns empty result without any steps', () => {
    const docmap = generateDocMap('test', publisher, {assertions: [], inputs: [], actions: []});
    docmap.steps = new Map();
    const parsedData = parsePreprintDocMap(docmap);

    expect(parsedData.timeline.length).toStrictEqual(0);
    expect(parsedData.versions.length).toStrictEqual(0);
  });

  it('returns empty result when it cant find the first step', () => {
    const docmap = generateDocMap('test', publisher, {assertions: [], inputs: [], actions: []});
    docmap['first-step'] = 'wrongid';
    const parsedData = parsePreprintDocMap(docmap);

    expect(parsedData.timeline.length).toStrictEqual(0);
    expect(parsedData.versions.length).toStrictEqual(0);
  });

  it('finds a published preprint from input step with URL', () => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'), 'https://somewhere.org/preprint/article1');
    const firstStep = generateStep([preprint], [], []);
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.timeline.length).toStrictEqual(1);
    expect(formatDate(parsedData.timeline[0].date)).toStrictEqual('2022-03-01');
    expect(parsedData.timeline[0].name).toStrictEqual('Preprint posted');
    expect(parsedData.timeline[0].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[0].link?.url).toStrictEqual('https://somewhere.org/preprint/article1');

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].url).toStrictEqual('https://somewhere.org/preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Preprint');
  });


  it('finds a bioRxiv preprint and labels it', () => {
    const preprint = generatePreprint('10.1101/article1', new Date('2022-03-01'));
    const firstStep = generateStep([preprint], [], []);
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.timeline.length).toStrictEqual(1);
    expect(parsedData.timeline[0].link?.text).toStrictEqual('Go to BioRxiv');
    expect(parsedData.timeline[0].link?.url).toStrictEqual('https://doi.org/10.1101/article1');
  });

  it('finds a published preprint from input step with DOI', () => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep([preprint], [], []);
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.timeline.length).toStrictEqual(1);
    expect(formatDate(parsedData.timeline[0].date)).toStrictEqual('2022-03-01');
    expect(parsedData.timeline[0].name).toStrictEqual('Preprint posted');
    expect(parsedData.timeline[0].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[0].link?.url).toStrictEqual('https://doi.org/preprint/article1');

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Preprint');
  });

  it('finds a preprint from a docmap describing under review assertion', () => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'), 'https://something.org/preprint/article1');

    const firstStep = generateStep(
      [],
      [],
      [generateUnderReviewAssertion(preprint, new Date('2022-04-12'))],
    );
    const parsedData = parseDocMapFromFirstStep(firstStep);


    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(formatDate(parsedData.timeline[0].date)).toStrictEqual('2022-03-01');
    expect(parsedData.timeline[0].name).toStrictEqual('Preprint posted');
    expect(parsedData.timeline[0].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[0].link?.url).toStrictEqual('https://something.org/preprint/article1');
    expect(formatDate(parsedData.timeline[1].date)).toStrictEqual('2022-04-12');
    expect(parsedData.timeline[1].name).toStrictEqual('Preprint sent for review');

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Preprint');
    expect(parsedData.versions[0].status).toStrictEqual('(Preview) Reviewed');
  });

  it('finds a preprint from a docmap describing under review assertion without URL', () => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'));

    const firstStep = generateStep(
      [],
      [],
      [generateUnderReviewAssertion(preprint, new Date('2022-04-12'))],
    );
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(formatDate(parsedData.timeline[0].date)).toStrictEqual('2022-03-01');
    expect(parsedData.timeline[0].name).toStrictEqual('Preprint posted');
    expect(parsedData.timeline[0].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[0].link?.url).toStrictEqual('https://doi.org/preprint/article1');
    expect(formatDate(parsedData.timeline[1].date)).toStrictEqual('2022-04-12');
    expect(parsedData.timeline[1].name).toStrictEqual('Preprint sent for review');

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Preprint');
    expect(parsedData.versions[0].status).toStrictEqual('(Preview) Reviewed');
  });

  it('finds a single version when a step makes an assertion about an existing version', () => {
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
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(formatDate(parsedData.timeline[0].date)).toStrictEqual('2022-03-01');
    expect(parsedData.timeline[0].name).toStrictEqual('Preprint posted');
    expect(parsedData.timeline[0].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[0].link?.url).toStrictEqual('https://doi.org/preprint/article1');

    expect(formatDate(parsedData.timeline[1].date)).toStrictEqual('2022-04-12');
    expect(parsedData.timeline[1].name).toStrictEqual('Preprint sent for review');

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Preprint');
    expect(parsedData.versions[0].status).toStrictEqual('(Preview) Reviewed');
  });

  it('finds two versions when a step makes an assertion about a new version', () => {
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
    const parsedData = parseDocMapFromFirstStep(firstStep);


    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(formatDate(parsedData.timeline[0].date)).toStrictEqual('2022-03-01');
    expect(parsedData.timeline[0].name).toStrictEqual('Preprint posted');
    expect(parsedData.timeline[0].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[0].link?.url).toStrictEqual('https://doi.org/preprint/article1');

    expect(formatDate(parsedData.timeline[1].date)).toStrictEqual('2022-04-12');
    expect(parsedData.timeline[1].name).toStrictEqual('Preprint v4 posted');
    expect(parsedData.timeline[1].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[1].link?.url).toStrictEqual('https://doi.org/preprint/article1');

    expect(parsedData.versions.length).toStrictEqual(2);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Preprint');
    expect(parsedData.versions[0].versionIdentifier).toBeUndefined();

    expect(parsedData.versions[1].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[1].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[1].type).toStrictEqual('Preprint');
    expect(parsedData.versions[1].versionIdentifier).toStrictEqual('4');
  });

  it.failing('detect when a step makes a republished assertion', () => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined);
    const preprintv2 = generatePreprint('elife/12345.1', new Date('2022-03-01'), undefined, '1');

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
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.timeline.length).toStrictEqual(1);
    expect(formatDate(parsedData.timeline[0].date)).toStrictEqual('2022-03-01');
    expect(parsedData.timeline[0].name).toStrictEqual('Preprint posted');
    expect(parsedData.timeline[0].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[0].link?.url).toStrictEqual('https://doi.org/preprint/article1');

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0].doi).toStrictEqual('elife/12345.1');
    expect(parsedData.versions[0].id).toStrictEqual('elife/12345.1');
    expect(parsedData.versions[0].type).toStrictEqual('Reviewed preprint');
    expect(parsedData.versions[0].versionIdentifier).toStrictEqual('1');
  });

  it('finds a revised preprint from a docmap', () => {
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

    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(formatDate(parsedData.timeline[0].date)).toStrictEqual('2022-03-01');
    expect(parsedData.timeline[0].name).toStrictEqual('Preprint v1 posted');
    expect(parsedData.timeline[0].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[0].link?.url).toStrictEqual('https://doi.org/preprint/article1');
    expect(formatDate(parsedData.timeline[1].date)).toStrictEqual('2022-06-01');
    expect(parsedData.timeline[1].name).toStrictEqual('Preprint v2 posted');
    expect(parsedData.timeline[1].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[1].link?.url).toStrictEqual('https://doi.org/preprint/article1v2');

    expect(parsedData.versions.length).toStrictEqual(2);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Preprint');
    expect(parsedData.versions[0].versionIdentifier).toStrictEqual('1');
    expect(parsedData.versions[1].doi).toStrictEqual('preprint/article1v2');
    expect(parsedData.versions[1].id).toStrictEqual('preprint/article1v2');
    expect(parsedData.versions[1].type).toStrictEqual('Preprint');
    expect(parsedData.versions[1].versionIdentifier).toStrictEqual('2');
  });

  it('finds reviews and editor evaluations from a docmap', () => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const anonReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-06'),
      [
        generateWebContent('https://content.com/12345.sa1'),
      ],
      'elife/eLife.12345.sa1'
    );
    const peerReview2 = generatePeerReview(
      new Date('2022-04-07'),
      [
        generateWebContent('https://content.com/12345.sa2'),
      ],
      'elife/eLife.12345.sa2'
    );
    const editor = generatePersonParticipant('Daffy Duck', 'editor');
    const editorsEvaluation = generateEvaluationSummary(
      new Date('2022-04-10'),
      [
        generateWebContent('https://content.com/12345.sa3'),
      ],
      'elife/eLife.12345.sa3'
    );

    const firstStep = generateStep( // preprint published
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep( //
      [preprintv1],
      [
        generateAction([anonReviewerParticipant], [peerReview1]),
        generateAction([anonReviewerParticipant], [peerReview2]),
        generateAction([editor], [editorsEvaluation]),
      ],
      [generatePeerReviewedAssertion(preprintv1, new Date('2022-04-01'))],
    ));

    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      name: 'Preprint v1 posted',
      date: new Date('2022-03-01'),
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      }
    });
    expect(parsedData.timeline[1]).toMatchObject({
      name: 'Reviews received for Preprint',
      date: new Date('2022-04-01'),
    });

    expect(parsedData.versions.length).toStrictEqual(1);

    expect(parsedData.versions[0]).toMatchObject<Version>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      type: 'Preprint',
      status: 'Reviewed',
      versionIdentifier: '1',
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
          }
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
        }
      },
    });
  });

  it.todo('finds a revised preprint reviews and evaluations from a docmap');
  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');
  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');
})
