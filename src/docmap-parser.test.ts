import { generateAction, generateDocMap, generatePeerReview, generatePeerReviewedAssertion, generatePersonParticipant, generatePreprintWithDoiAndUrl, generateStep, generateWebContent } from './docmap-generator';
import { parsePreprintDocMap } from './docmap-parser';

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

describe('docmap-parser', () => {
  it('finds a preprint from a docmap describing a sent for peer review', () => {
    const preprint = generatePreprintWithDoiAndUrl('preprint/article1', new Date('2022-03-01'), 'https://doi.org/preprint/article1');
    const anonymousReviewer = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-12'),
      [generateWebContent('https://sciety.org/articles/activity/preprint/article1#hypothesis:peerreview1')],
      'elife/peerreview1',
      'https://doi.org/elife/peerreview1'
    );
    const peerReview1Action = generateAction([anonymousReviewer], [peerReview1]);

    const firstStep = generateStep(
      [preprint],
      [peerReview1Action],
      [generatePeerReviewedAssertion()],
    );
    const docmap = generateDocMap('test', publisher, firstStep);


    const parsedEPPData = parsePreprintDocMap(docmap);

    expect(parsedEPPData.doi).toStrictEqual('preprint/article1');
    expect(parsedEPPData.timeline.length).toStrictEqual(2);
    expect(parsedEPPData.timeline[0].date).toStrictEqual('2022-03-01');
    expect(parsedEPPData.timeline[0].name).toStrictEqual('Preprint posted');
    expect(parsedEPPData.timeline[0].link?.text).toStrictEqual('Go to preprint');
    expect(parsedEPPData.timeline[0].link?.url).toStrictEqual('https://doi.org/preprint/article1');
  });

  it('finds a bioRxiv preprint and labels it', () => {
    const preprint = generatePreprintWithDoiAndUrl('10.1101/article1', new Date('2022-03-01'), 'https://doi.org/10.1101/article1');
    const anonymousReviewer = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-12'),
      [generateWebContent('https://sciety.org/articles/activity/preprint/article1#hypothesis:peerreview1')],
      'elife/peerreview1',
      'https://doi.org/elife/peerreview1'
    );
    const peerReview1Action = generateAction([anonymousReviewer], [peerReview1]);

    const firstStep = generateStep(
      [preprint],
      [peerReview1Action],
      [generatePeerReviewedAssertion()],
    );
    const docmap = generateDocMap('test', publisher, firstStep);


    const parsedEPPData = parsePreprintDocMap(docmap);

    expect(parsedEPPData.doi).toStrictEqual('10.1101/article1');
    expect(parsedEPPData.timeline.length).toStrictEqual(2);
    expect(parsedEPPData.timeline[0].date).toStrictEqual('2022-03-01');
    expect(parsedEPPData.timeline[0].name).toStrictEqual('Preprint posted');
    expect(parsedEPPData.timeline[0].link?.text).toStrictEqual('Go to BioRxiv');
    expect(parsedEPPData.timeline[0].link?.url).toStrictEqual('https://doi.org/10.1101/article1');
  });

  it.todo('finds reviews and editor evaluations from a docmap');
  it.todo('finds a revised preprint from a docmap');
  it.todo('finds a revised preprint reviews and evaluations from a docmap');
  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');
  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');
})
