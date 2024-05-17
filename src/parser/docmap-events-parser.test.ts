import { generateAction, generateAuthorResponse, generateDraftAssertion, generateOrganization, generatePeerReview, generatePersonParticipant, generatePreprint, generatePublishedAssertion, generateStep, generateUnderReviewAssertion } from '../generators/docmap-generators';
import { fixtures } from '../test-fixtures/docmap-parser';
import { parseStepToEvents } from './docmap-events-parser';

describe('docmap-events-parser', () => {
  it('returns no events when it cant find any preprints', () => {
    const docmap = fixtures.emptyStep();

    const events = parseStepToEvents(generateStep([], [], []));
    expect(events).toStrictEqual([]);
  });

  it('returns an DraftEvent when a Draft assertion exists', () => {
    const preprint = generatePreprint('12345/12345');

    const events = parseStepToEvents(generateStep([], [], [generateDraftAssertion(preprint)]));
    expect(events).toStrictEqual([{
      type: 'Draft',
      asserted: true,
      item: preprint,
    }]);
  });

  it('returns an UnderReviewEvent when an under review assertion exists', () => {
    const preprint = generatePreprint('12345/12345');
    const underReviewDate = new Date('2024-05-17');

    const events = parseStepToEvents(generateStep([], [], [generateUnderReviewAssertion(preprint, underReviewDate)]));
    expect(events).toStrictEqual([{
      type: 'UnderReview',
      asserted: true,
      date: underReviewDate,
      item: preprint,
    }]);
  });

  it('returns a PublishedEvent when a published assertion exists', () => {
    const preprint = generatePreprint('12345/12345');
    const publishedDate = new Date('2024-05-16');

    const events = parseStepToEvents(generateStep([], [], [generatePublishedAssertion(preprint, publishedDate)]));
    expect(events).toStrictEqual([{
      type: 'Published',
      asserted: true,
      date: publishedDate,
      item: preprint,
    }]);
  });

  it('returns a PublishedEvent when a published preprint exists in output alone', () => {
    const preprint = generatePreprint('12345/12345');

    const events = parseStepToEvents(generateStep([], [generateAction([], [preprint])], []));
    expect(events).toStrictEqual([{
      type: 'Published',
      asserted: false,
      item: preprint,
    }]);
  });

  it('returns an RepublishedEvent when a different Expression is in the input and output', () => {
    const oldPreprint = generatePreprint('12345/12345');
    const newPreprint = generatePreprint('12345/12346');

    const events = parseStepToEvents(generateStep([oldPreprint], [generateAction([], [newPreprint])], []));
    expect(events).toStrictEqual([{
      type: 'Republished',
      asserted: false,
      item: newPreprint,
      originalItem: oldPreprint,
    }]);
  });

  it('returns an PeerReviewedEvent when an Manuscript is in the input and Evaluations in the output', () => {
    const preprint = generatePreprint('12345/12345');
    const eval1 = generatePeerReview(new Date('2024-05-18'), []);
    const eval2 = generatePeerReview(new Date('2024-05-19'), []);
    const reviewer1 = generatePersonParticipant('Bugs Bunny', 'peer-reviewer');
    const reviewer2 = generatePersonParticipant('Daffy Duck', 'peer-reviewer');

    const events = parseStepToEvents(generateStep([preprint], [generateAction([reviewer1], [eval1]), generateAction([reviewer2], [eval2])], []));
    expect(events).toStrictEqual([{
      type: 'PeerReviewed',
      asserted: false,
      item: preprint,
      evaluations: [
        {...eval1, participants: [{name: 'Bugs Bunny', role: 'peer-reviewer'}]},
        {...eval2, participants: [{name: 'Daffy Duck', role: 'peer-reviewer'}]}
      ],
    }]);
  });

  it('returns an PeerReviewedEvent and a RepublishedEvent when an Manuscript is in the input and Evaluations and Manuscript in the output', () => {
    const oldPreprint = generatePreprint('12345/12345');
    const newPreprint = generatePreprint('12345/12346');
    const eval1 = generatePeerReview(new Date('2024-05-18'), []);
    const eval2 = generatePeerReview(new Date('2024-05-19'), []);
    const reviewer1 = generatePersonParticipant('Bugs Bunny', 'peer-reviewer', generateOrganization('ACME Labs', 'California'));
    const reviewer2 = generatePersonParticipant('Daffy Duck', 'peer-reviewer');

    const events = parseStepToEvents(generateStep([oldPreprint], [generateAction([reviewer1], [eval1]), generateAction([reviewer2], [eval2]), generateAction([], [newPreprint])], []));
    expect(events).toStrictEqual([
      {
        type: 'PeerReviewed',
        asserted: false,
        item: oldPreprint,
        evaluations: [
          {...eval1, participants: [{name: 'Bugs Bunny', role: 'peer-reviewer', institution: {name: 'ACME Labs', location: 'California'}}]},
          {...eval2, participants: [{name: 'Daffy Duck', role: 'peer-reviewer'}]}
        ],
      },
      {
        type: 'Republished',
        asserted: false,
        item: newPreprint,
        originalItem: oldPreprint,
      }
    ]);
  });

  it('returns an AuthorRespondedEvent when an Manuscript is in the input and AuthorResponse in the output', () => {
    const preprint = generatePreprint('12345/12345');
    const authorResponse = generateAuthorResponse(new Date('2024-05-18'), []);

    const events = parseStepToEvents(generateStep([preprint], [generateAction([], [authorResponse])], []));
    expect(events).toStrictEqual([{
      type: 'AuthorResponded',
      asserted: false,
      item: preprint,
      response: authorResponse,
    }]);
  });
});
