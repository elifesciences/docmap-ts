import { addNextStep, generateAction, generateDocMap, generatePersonParticipant, generateStep, generatePreprint, generateWebContent, generatePeerReview, generateEvaluationSummary, generatePeerReviewedAssertion, generateEnhancedAssertion, generateEnhancedPreprint } from './docmap-generator'
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

const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'), 'https://doi.org/preprint/article1');

const anonymousReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
const peerReview1 = generatePeerReview(
  new Date('2022-04-12'),
  [generateWebContent('https://sciety.org/articles/activity/preprint/article1#hypothesis:peerreview1')],
  'elife/peerreview1',
  'https://doi.org/elife/peerreview1'
);
const peerReview1Action = generateAction([anonymousReviewerParticipant], [peerReview1]);

const peerReview2 = generatePeerReview(
  new Date('2022-04-12'),
  [generateWebContent('https://sciety.org/articles/activity/preprint/article1#hypothesis:peerreview2')],
  'elife/peerreview2',
  'https://doi.org/elife/peerreview2'
);
const peerReview2Action = generateAction([anonymousReviewerParticipant], [peerReview2]);

const editor1 = generatePersonParticipant('Aloke Finn', 'editor');
const editor2 = generatePersonParticipant('Carlos Isales', 'senior-editor');
const editorsEvaluation = generateEvaluationSummary(
  new Date('2022-04-14'),
  [generateWebContent('https://sciety.org/articles/activity/preprint/article1#hypothesis:editorsevalation1')],
  'elife/editorsevalation1',
  'https://doi.org/elife/editorsevalation1'
);
const editorsEvaluationAction = generateAction([editor1, editor2], [editorsEvaluation]);

const firstStep = generateStep(
  [preprint],
  [peerReview1Action, peerReview2Action, editorsEvaluationAction],
  [generatePeerReviewedAssertion(preprint)],
);

const reviewedPreprint = generateEnhancedPreprint(
  '12345',
  '1',
  'elife/12345.1',
  new Date('2022-04-15'),
  'https://doi.org/elife/12345.1',
  [generateWebContent('https://elifesciences.org/review-preprints/reviewedpreprint1')],
);
const reviewedPreprintAction = generateAction([anonymousReviewerParticipant], [reviewedPreprint]);


addNextStep(firstStep, generateStep(
  [preprint, peerReview1, peerReview2, editorsEvaluation],
  [reviewedPreprintAction],
  [generateEnhancedAssertion(preprint)],
));

const docmap = generateDocMap("testID", publisher, firstStep);

const replacer = (key: string, value: any) => {
  if (key === 'steps' && value['@id'] !== 'pwo:hasStep') {
    return Object.fromEntries(value);
  }
  return value;
}
// console.log(docmap);
console.log(JSON.stringify(docmap, replacer, "  "));
const parsedDocMap = parsePreprintDocMap(docmap);
console.log(JSON.stringify(parsedDocMap, undefined, "  "));
