import { generateAction, generateAuthorResponse, generateDraftAssertion, generateOrganization, generatePeerReview, generatePersonParticipant, generatePreprint, generatePublishedAssertion, generateStep, generateUnderReviewAssertion } from '../generators/docmap-generators';
import { fixtures } from '../test-fixtures/docmap-parser';
import { parseStepToEvents } from './parse-step-to-events';

describe('parse-step-to-events', () => {
  it('returns no events when it cant find any preprints', () => {

  });
});
