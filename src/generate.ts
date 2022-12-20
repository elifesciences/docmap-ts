import { writeFileSync } from 'fs';
import { addNextStep, generateAction, generateDocMap, generatePersonParticipant, generateStep, generatePreprint, generateWebContent, generatePeerReview, generateEvaluationSummary, generatePeerReviewedAssertion, generateEnhancedAssertion, generateEnhancedPreprint, simplifyExpression, generatePublishedAssertion } from './docmap-generator'
import { parsePreprintDocMap } from './docmap-parser';

// used for outputting JSON
const replacer = (key: string, value: any) => {
  if (key === 'steps' && value['@id'] !== 'pwo:hasStep') {
    return Object.fromEntries(value);
  }
  return value;
}

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

const preprint = generatePreprint('10.1101/2022.06.24.497502', new Date('2022-06-26'), 'https://doi.org/10.1101/2022.06.24.497502', '1');
const simplePreprint = simplifyExpression(preprint);
const preprintAction = generateAction([], [preprint]);
const preprintStep = generateStep(
  [],
  [preprintAction],
  [generatePublishedAssertion(simplePreprint)],
);
writeFileSync(
  'examples/generated/1.preprint.json',
  JSON.stringify(
    generateDocMap("http://docmaps.elifesciences.org/testid.docmap.json", publisher, preprintStep),
    replacer,
    "  ",
  ),
);


const anonymousReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
const peerReview1 = generatePeerReview(
  new Date('2022-09-06'),
  [
    generateWebContent('https://hypothes.is/a/hVq6MC3DEe2ERdPL5ARqAA'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:hVq6MC3DEe2ERdPL5ARqAA'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:hVq6MC3DEe2ERdPL5ARqAA/content'),
  ],
  '10.7554/eLife.80494.sa1',
  'https://doi.org/10.7554/eLife.80494.sa1'
);
const peerReview1Action = generateAction([anonymousReviewerParticipant], [peerReview1]);

const peerReview2 = generatePeerReview(
  new Date('2022-09-06'),
  [
    generateWebContent('https://hypothes.is/a/hgzitC3DEe2SBN9NIUxw5A'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:hgzitC3DEe2SBN9NIUxw5A'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:hgzitC3DEe2SBN9NIUxw5A/content'),
  ],
  '10.7554/eLife.80494.sa2',
  'https://doi.org/10.7554/eLife.80494.sa2'
);
const peerReview2Action = generateAction([anonymousReviewerParticipant], [peerReview2]);

const peerReview3 = generatePeerReview(
  new Date('2022-09-06'),
  [
    generateWebContent('https://hypothes.is/a/hmP-bi3DEe2C9QtcFZcxmQ'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:hmP-bi3DEe2C9QtcFZcxmQ'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:hmP-bi3DEe2C9QtcFZcxmQ/content'),
  ],
  '10.7554/eLife.80494.sa3',
  'https://doi.org/10.7554/eLife.80494.sa3'
);
const peerReview3Action = generateAction([anonymousReviewerParticipant], [peerReview2]);
const editor1 = generatePersonParticipant('Aloke Finn', 'editor');
const editor2 = generatePersonParticipant('Carlos Isales', 'senior-editor');
const editorsEvaluation = generateEvaluationSummary(
  new Date('2022-09-06'),
  [
    generateWebContent('https://hypothes.is/a/hrlVWC3DEe2hhdsGW6wNvg'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:hrlVWC3DEe2hhdsGW6wNvg'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:hrlVWC3DEe2hhdsGW6wNvg/content'),
  ],
  '10.7554/eLife.80494.sa4',
  'https://doi.org/10.7554/eLife.80494.sa4'
);
const editorsEvaluationAction = generateAction([editor1, editor2], [editorsEvaluation]);
const firstStep = addNextStep(preprintStep, generateStep(
  [preprint],
  [peerReview1Action, peerReview2Action, peerReview3Action, editorsEvaluationAction],
  [generatePeerReviewedAssertion(simplePreprint)],
));
writeFileSync(
  'examples/generated/1.preprintv1.json',
  JSON.stringify(
    generateDocMap("http://docmaps.elifesciences.org/testid.docmap.json", publisher, preprintStep),
    replacer,
    "  ",
  ),
);


const reviewedPreprint = generateEnhancedPreprint(
  '80494',
  '1',
  '10.7554/eLife.80494.1',
  new Date('2022-10-20'),
  'https://doi.org/10.7554/eLife.80494.1',
  [generateWebContent('https://elifesciences.org/review-preprints/80494v1')],
);
const reviewedPreprintAction = generateAction([], [reviewedPreprint]);
const secondStep = addNextStep(firstStep, generateStep(
  [simplePreprint, simplifyExpression(peerReview1), simplifyExpression(peerReview2), simplifyExpression(editorsEvaluation)],
  [reviewedPreprintAction],
  [generateEnhancedAssertion(simplePreprint)],
));
writeFileSync(
  'examples/generated/2.enhanced_preprintv1.json',
  JSON.stringify(
    generateDocMap("http://docmaps.elifesciences.org/testid.docmap.json", publisher, preprintStep),
    replacer,
    "  ",
  ),
);

const preprint2 = generatePreprint('10.1101/2022.06.24.497502', new Date('2022-04-21'), 'https://doi.org/10.1101/2022.06.24.497502');
const simplePreprint2 = simplifyExpression(preprint2);
const thirdStep = addNextStep(secondStep, generateStep(
  [preprint2],
  [reviewedPreprintAction],
  [],
));
writeFileSync(
  'examples/generated/3.preprintv2.json',
  JSON.stringify(
    generateDocMap("http://docmaps.elifesciences.org/testid.docmap.json", publisher, preprintStep),
    replacer,
    "  ",
  ),
);

const editorsEvaluation2 = generateEvaluationSummary(
  new Date('2022-04-14'),
  [generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:editorsevalation1')],
  'elife/editorsevalation1',
  'https://doi.org/elife/editorsevalation1'
);
const editorsEvaluationAction2 = generateAction([editor1, editor2], [editorsEvaluation]);
const fourthStep = addNextStep(thirdStep, generateStep(
  [preprint2],
  [editorsEvaluationAction2],
  [generatePeerReviewedAssertion(simplePreprint2)],
));
writeFileSync(
  'examples/generated/4.revised_preprintv2.json',
  JSON.stringify(
    generateDocMap("http://docmaps.elifesciences.org/testid.docmap.json", publisher, preprintStep),
    replacer,
    "  ",
  ),
);

const reviewedPreprint2 = generateEnhancedPreprint(
  '80494',
  '1',
  '10.7554/eLife.80494.1',
  new Date('2022-10-20'),
  'https://doi.org/10.7554/eLife.80494.1',
  [generateWebContent('https://elifesciences.org/review-preprints/80494v1')],
);
const reviewedPreprint2Action = generateAction([], [reviewedPreprint]);
const fifthStep = addNextStep(fourthStep, generateStep(
  [simplePreprint2, simplifyExpression(editorsEvaluation2)],
  [reviewedPreprint2Action],
  [generateEnhancedAssertion(simplePreprint2)],
));
writeFileSync(
  'examples/generated/5.enhanced_revised_preprintv2.json',
  JSON.stringify(
    generateDocMap("http://docmaps.elifesciences.org/testid.docmap.json", publisher, preprintStep),
    replacer,
    "  ",
  ),
);

const docmap = generateDocMap("http://docmaps.elifesciences.org/testid.docmap.json", publisher, firstStep);
const parsedDocMap = parsePreprintDocMap(docmap);
console.log(JSON.stringify(parsedDocMap, undefined, "  "));
