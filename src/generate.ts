import { addNextStep, generateAction, generateAssertion, generateContent, generateDocMap, generateInput, generateOutput, generatePersonParticipant, generateStep } from './docmap-generator'
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

const preprint = generateInput('preprint/article1', 'https://doi.org/preprint/article1', new Date('2022-03-01'));

const anonymousReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
const peerReview1Content = generateContent('web-content', 'https://doi.org/elife/peerreview1');
const peerReview1Output = generateOutput('peer-review', new Date('2022-04-12'), [peerReview1Content]);
const peerReview1 = generateAction([anonymousReviewerParticipant], [peerReview1Output]);

const peerReview2Content = generateContent('web-content', 'https://doi.org/elife/peerreview2');
const peerReview2Output = generateOutput('peer-review', new Date('2022-04-12'), [peerReview2Content]);
const peerReview2 = generateAction([anonymousReviewerParticipant], [peerReview2Output]);

const editor1 = generatePersonParticipant('Aloke Finn', 'editor');
const editor2 = generatePersonParticipant('Carlos Isales', 'senior-editor');
const editorsEvaluationContent = generateContent('web-content', 'https://doi.org/elife/editorsevalation1');
const editorsEvaluationOutput = generateOutput('evaluation-summary', new Date('2022-04-14'), [editorsEvaluationContent]);
const editorsEvaluation = generateAction([editor1, editor2], [editorsEvaluationOutput]);

const firstStep = generateStep(
  [preprint],
  [peerReview1, peerReview2, editorsEvaluation],
  [generateAssertion('peer-reviewed')],
);

const publishedPeerReview1 = generateInput('elife/peerreview1', 'https://doi.org/elife/peerreview1', new Date('2022-04-12'));
const publishedPeerReview2 = generateInput('elife/peerreview2', 'https://doi.org/elife/peerreview2', new Date('2022-04-12'));
const publishedEditorsEvaluation = generateInput('elife/editorsevalation1', 'https://doi.org/elife/editorsevalation1', new Date('2022-04-14'));
const reviewedPreprintContent = generateContent('web-content', 'https://doi.org/elife/reviewedpreprint1');
const reviewedPreprintOutput = generateOutput('review-article', new Date('2022-04-15'), [reviewedPreprintContent]);
const reviewedPreprint1 = generateAction([anonymousReviewerParticipant], [reviewedPreprintOutput]);


addNextStep(firstStep, generateStep(
  [preprint, publishedPeerReview1, publishedPeerReview2, publishedEditorsEvaluation],
  [reviewedPreprint1],
  [generateAssertion('enhanced')],
));

const docmap = generateDocMap("testID", publisher, firstStep);

const replacer = (key: string, value: any) => {
  if (key === 'steps') {
    return Object.fromEntries(value);
  } else {
    return value;
  }
}
// console.log(docmap);
console.log(JSON.stringify(docmap, replacer, "  "));
const parsedDocMap = parsePreprintDocMap(docmap);
console.log(JSON.stringify(parsedDocMap, undefined, "  "));
