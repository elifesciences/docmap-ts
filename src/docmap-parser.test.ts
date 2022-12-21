import { DocMap, Step } from './docmap';
import { addNextStep, generateAction, generateDocMap, generateEnhancedAssertion, generateEnhancedPreprint, generatePeerReview, generatePeerReviewedAssertion, generatePersonParticipant, generatePreprint, generatePublishedAssertion, generateRepublishedAssertion, generateStep, generateUnderReviewAssertion, generateWebContent } from './docmap-generator';
import { parsePreprintDocMap, ParseResult } from './docmap-parser';

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
    expect(parsedData.versions[0].preprintDoi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintURL).toStrictEqual('https://somewhere.org/preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Preprint');
    expect(parsedData.versions[0].version).toStrictEqual(1);
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
    expect(parsedData.versions[0].preprintDoi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintURL).toStrictEqual('https://doi.org/preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Preprint');
    expect(parsedData.versions[0].version).toStrictEqual(1);
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
    expect(parsedData.timeline[1].name).toStrictEqual('Sent for review');

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintDoi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintURL).toStrictEqual('https://something.org/preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Reviewed preprint (preview)');
    expect(parsedData.versions[0].version).toStrictEqual(1);
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
    expect(parsedData.timeline[1].name).toStrictEqual('Sent for review');

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintDoi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintURL).toStrictEqual('https://doi.org/preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Reviewed preprint (preview)');
    expect(parsedData.versions[0].version).toStrictEqual(1);
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
    expect(parsedData.timeline[1].name).toStrictEqual('Sent for review');

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintDoi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintURL).toStrictEqual('https://doi.org/preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Reviewed preprint (preview)');
    expect(parsedData.versions[0].version).toStrictEqual(1);
  });

  it('finds two versions when a step makes an assertion about a new version', () => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const preprintv2 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, 'v4');

    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep(
      [],
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
    expect(parsedData.timeline[1].name).toStrictEqual('Preprint posted');
    expect(parsedData.timeline[1].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[1].link?.url).toStrictEqual('https://doi.org/preprint/article1');

    expect(parsedData.versions.length).toStrictEqual(2);
    expect(parsedData.versions[0].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintDoi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintURL).toStrictEqual('https://doi.org/preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Preprint');
    expect(parsedData.versions[0].version).toStrictEqual(1);
    expect(parsedData.versions[0].versionIdentifier).toBeUndefined();

    expect(parsedData.versions[1].doi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[1].id).toStrictEqual('preprint/article1');
    expect(parsedData.versions[1].preprintDoi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[1].preprintURL).toStrictEqual('https://doi.org/preprint/article1');
    expect(parsedData.versions[1].type).toStrictEqual('Preprint');
    expect(parsedData.versions[1].version).toStrictEqual(2);
    expect(parsedData.versions[1].versionIdentifier).toStrictEqual('v4');
  });

  it('detect and find information when a step makes a republished assertion', () => {
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
    console.log(parsedData);

    expect(parsedData.timeline.length).toStrictEqual(1);
    expect(formatDate(parsedData.timeline[0].date)).toStrictEqual('2022-03-01');
    expect(parsedData.timeline[0].name).toStrictEqual('Preprint posted');
    expect(parsedData.timeline[0].link?.text).toStrictEqual('Go to preprint');
    expect(parsedData.timeline[0].link?.url).toStrictEqual('https://doi.org/preprint/article1');

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0].doi).toStrictEqual('elife/12345.1');
    expect(parsedData.versions[0].id).toStrictEqual('elife/12345.1');
    expect(parsedData.versions[0].preprintDoi).toStrictEqual('preprint/article1');
    expect(parsedData.versions[0].preprintURL).toStrictEqual('https://doi.org/preprint/article1');
    expect(parsedData.versions[0].type).toStrictEqual('Reviewed preprint');
    expect(parsedData.versions[0].version).toStrictEqual(1);
    expect(parsedData.versions[0].versionIdentifier).toStrictEqual('1');
  });

  it.todo('finds reviews and editor evaluations from a docmap');
  it.todo('finds a revised preprint from a docmap');
  it.todo('finds a revised preprint reviews and evaluations from a docmap');
  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');
  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');
})
