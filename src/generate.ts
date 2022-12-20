import { writeFileSync } from 'fs';
import { Step } from './docmap';
import { addNextStep, generateAction, generateDocMap, generatePersonParticipant, generateStep, generatePreprint, generateWebContent, generatePeerReview, generateEvaluationSummary, generatePeerReviewedAssertion, generateEnhancedAssertion, generateEnhancedPreprint, simplifyExpression, generatePublishedAssertion, generateUnderReviewAssertion, generateDraftAssertion, generateAuthorResponse, generateRevisedAssertion, generateRevisedPreprint, generateUpdateSummary, generateVersionOfRecordAssertion, generateVersionOfRecord } from './docmap-generator'
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

const doStep = (step: () => Step, fileName: string, previousStep?: Step) => {
  const thisStep = step();
  const nextStep = previousStep ? addNextStep(previousStep, thisStep) : thisStep;

  writeFileSync(
    `examples/generated/${fileName}.json`,
    JSON.stringify(
      generateDocMap("http://docmaps.elifesciences.org/testid.docmap.json", publisher, nextStep),
      replacer,
      "  ",
    ),
  );

  return nextStep;
}


const fullPreprintv1 = generatePreprint('10.1101/2022.06.24.497502', new Date('2022-06-26'), 'https://doi.org/10.1101/2022.06.24.497502', '1');
const preprintv1 = simplifyExpression(fullPreprintv1);

let step: Step;
step = doStep(() => {
  const preprintAction = generateAction([], [fullPreprintv1]);
  return generateStep(
    [],
    [preprintAction],
    [generatePublishedAssertion(preprintv1)],
  );
}, '1.preprint');



const fullReviewedPreprintv1 = generateEnhancedPreprint(
  '80494',
  '1',
  '10.7554/eLife.80494.1',
  new Date('2022-10-20'),
  'https://doi.org/10.7554/eLife.80494.1',
  [generateWebContent('https://elifesciences.org/review-preprints/80494v1')],
);
const reviewedPreprintv1 = simplifyExpression(fullReviewedPreprintv1);
step = doStep(() => {
  return generateStep(
      [preprintv1],
      [generateAction([], [fullReviewedPreprintv1])],
      [generateUnderReviewAssertion(preprintv1), generateDraftAssertion(reviewedPreprintv1)],
    )
}, '2.sent_for_review_preprint', step);




const anonymousReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
const fullPeerReview1 = generatePeerReview(
  new Date('2022-09-06'),
  [
    generateWebContent('https://hypothes.is/a/hVq6MC3DEe2ERdPL5ARqAA'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:hVq6MC3DEe2ERdPL5ARqAA'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:hVq6MC3DEe2ERdPL5ARqAA/content'),
  ],
  '10.7554/eLife.80494.sa1',
  'https://doi.org/10.7554/eLife.80494.sa1'
);
const fullPeerReview2 = generatePeerReview(
  new Date('2022-09-06'),
  [
    generateWebContent('https://hypothes.is/a/hgzitC3DEe2SBN9NIUxw5A'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:hgzitC3DEe2SBN9NIUxw5A'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:hgzitC3DEe2SBN9NIUxw5A/content'),
  ],
  '10.7554/eLife.80494.sa2',
  'https://doi.org/10.7554/eLife.80494.sa2'
);
const fullPeerReview3 = generatePeerReview(
  new Date('2022-09-06'),
  [
    generateWebContent('https://hypothes.is/a/hmP-bi3DEe2C9QtcFZcxmQ'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:hmP-bi3DEe2C9QtcFZcxmQ'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:hmP-bi3DEe2C9QtcFZcxmQ/content'),
  ],
  '10.7554/eLife.80494.sa3',
  'https://doi.org/10.7554/eLife.80494.sa3'
);

const editor1 = generatePersonParticipant('Aloke Finn', 'editor');
const editor2 = generatePersonParticipant('Carlos Isales', 'senior-editor');
const fullEditorsEvaluation = generateEvaluationSummary(
  new Date('2022-09-06'),
  [
    generateWebContent('https://hypothes.is/a/hrlVWC3DEe2hhdsGW6wNvg'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:hrlVWC3DEe2hhdsGW6wNvg'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:hrlVWC3DEe2hhdsGW6wNvg/content'),
  ],
  '10.7554/eLife.80494.sa4',
  'https://doi.org/10.7554/eLife.80494.sa4'
);
step = doStep(() => {
  return generateStep(
      [preprintv1],
      [
        generateAction([anonymousReviewerParticipant], [fullPeerReview1]),
        generateAction([anonymousReviewerParticipant], [fullPeerReview2]),
        generateAction([anonymousReviewerParticipant], [fullPeerReview3]),
        generateAction([editor1, editor2], [fullEditorsEvaluation]),
      ],
      [generatePeerReviewedAssertion(preprintv1)],
    )
}, '3.preprint_peer_reviewed', step);



const peerReview1 = simplifyExpression(fullPeerReview1);
const peerReview2 = simplifyExpression(fullPeerReview2);
const peerReview3 = simplifyExpression(fullPeerReview3);
const editorEvaluation = simplifyExpression(fullEditorsEvaluation);

step = doStep(() => {
  return generateStep(
      [preprintv1, peerReview1, peerReview2, peerReview3, editorEvaluation],
      [
        generateAction([], [reviewedPreprintv1]),
      ],
      [generateEnhancedAssertion(preprintv1), generatePublishedAssertion(reviewedPreprintv1)],
    )
}, '4.reviewed_preprintv1', step);

const fullAuthorResponsev1 = generateAuthorResponse(
  new Date('2022-09-22'),
  [
    generateWebContent('https://hypothes.is/a/NotRealReponseId'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:NotRealReponseId'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:NotRealReponseId/content'),
  ],
  '10.7554/eLife.80494.sa5',
  'https://doi.org/10.7554/eLife.80494.sa5'
);
step = doStep(() => {
  return generateStep(
      [reviewedPreprintv1],
      [
        generateAction([], [fullAuthorResponsev1]),
      ],
      [generateRevisedAssertion(reviewedPreprintv1)],
    )
}, '5.author_responded_preprintv1', step);

const authorResponsev1 = simplifyExpression(fullAuthorResponsev1);
const fullPreprintv2 = generatePreprint('10.1101/2022.06.24.497502', new Date('2022-10-26'), 'https://doi.org/10.1101/2022.06.24.497502', '2');
const preprintv2 = simplifyExpression(fullPreprintv2);
step = doStep(() => {
  return generateStep(
      [reviewedPreprintv1, authorResponsev1],
      [
        generateAction([], [fullPreprintv2]),
      ],
      [generateRevisedAssertion(preprintv1), generatePublishedAssertion(preprintv2)],
    )
}, '6.preprintv2', step);


const fullReviewedPreprintv2 = generateEnhancedPreprint(
  '80494',
  '2',
  '10.7554/eLife.80494.2',
  new Date('2022-10-26'),
  'https://doi.org/10.7554/eLife.80494.2',
  [generateWebContent('https://elifesciences.org/review-preprints/80494v2')],
);
const reviewedPreprintv2 = simplifyExpression(fullReviewedPreprintv2);
step = doStep(() => {
  return generateStep(
      [preprintv2],
      [
        generateAction([], [fullReviewedPreprintv2]),
      ],
      [generateDraftAssertion(reviewedPreprintv2), generateUnderReviewAssertion(preprintv2)],
    )
}, '7.preprintv2_sent_for_review', step);

const fullUpdateSummary = generateUpdateSummary(
  new Date('2022-11-06'),
  [
    generateWebContent('https://hypothes.is/a/DoesntExistYet'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:DoesntExistYet'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:DoesntExistYet/content'),
  ],
  '10.7554/eLife.80494.sa4',
  'https://doi.org/10.7554/eLife.80494.sa6'
);
step = doStep(() => {
  return generateStep(
      [preprintv2],
      [
        generateAction([], [fullUpdateSummary]),
      ],
      [generatePeerReviewedAssertion(preprintv2)],
    )
}, '8.preprintv2_peer_reviewed', step);


const updateSummary = simplifyExpression(fullUpdateSummary);
step = doStep(() => {
  return generateStep(
      [preprintv2, updateSummary],
      [
        generateAction([], [preprintv2]),
      ],
      [generatePublishedAssertion(reviewedPreprintv2), generateEnhancedAssertion(preprintv2)],
    )
}, '9.reviewed_preprintv2', step);



const fullAuthorResponsev2 = generateAuthorResponse(
  new Date('2022-11-22'),
  [
    generateWebContent('https://hypothes.is/a/NotRealReponseId'),
    generateWebContent('https://sciety.org/articles/activity/10.1101/2022.06.24.497502#hypothesis:NotRealReponseId'),
    generateWebContent('https://sciety.org/evaluations/hypothesis:NotRealReponseId/content'),
  ],
  '10.7554/eLife.80494.sa5',
  'https://doi.org/10.7554/eLife.80494.sa5'
);
step = doStep(() => {
  return generateStep(
      [reviewedPreprintv2],
      [
        generateAction([], [fullAuthorResponsev2]),
      ],
      [generateRevisedAssertion(reviewedPreprintv2)],
    )
}, '10.author_responded_preprintv2', step);


const authorResponsev2 = simplifyExpression(fullAuthorResponsev2);
const vor = generateVersionOfRecord(
  new Date('2022-12-20'),
  [
    generateWebContent('https://elifesciences.org/articles/80494'),
  ],
  '10.7554/eLife.80494.3',
  'https://doi.org/10.7554/eLife.80494.3'
)
step = doStep(() => {
  return generateStep(
      [reviewedPreprintv2, authorResponsev2],
      [
        generateAction([], [vor]),
      ],
      [generateRevisedAssertion(reviewedPreprintv2), generateVersionOfRecordAssertion(vor), generatePublishedAssertion(vor)],
    )
}, '11.version_of_record', step);


const docmap = generateDocMap("http://docmaps.elifesciences.org/testid.docmap.json", publisher, step);
const parsedDocMap = parsePreprintDocMap(docmap);
console.log(JSON.stringify(parsedDocMap, undefined, "  "));
