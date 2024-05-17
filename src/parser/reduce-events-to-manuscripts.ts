import { Expression } from '../types';
import { EvaluationExpression, PublishingEvent, PublishingEventType } from './parse-step-to-events';

type Participant = {
  name: string,
  role: string,
  institution?: {
    name: string,
    location?: string,
  },
};
enum ReviewType {
  EvaluationSummary = 'evaluation-summary',
  Review = 'review-article',
  AuthorResponse = 'author-response',
}

const stringToReviewType = (reviewType: string): ReviewType => {
  if (reviewType === ReviewType.EvaluationSummary) {
    return ReviewType.EvaluationSummary;
  }
  if (reviewType === ReviewType.AuthorResponse || reviewType === 'reply') { // reply is also a valid author response value
    return ReviewType.AuthorResponse;
  }
  if (reviewType === ReviewType.Review) {
    return ReviewType.Review;
  }
  throw Error(`Unknown Review type string ${reviewType}`);
};

type Evaluation = {
  type: ReviewType,
  date?: Date,
  doi?: string,
  contentUrls?: string[],
  participants?: Participant[],
};
type EvaluationSummary = Evaluation & {
  type: ReviewType.EvaluationSummary,
};
const isEvaluationSummary = (evaluation: Evaluation): evaluation is EvaluationSummary => evaluation.type === ReviewType.EvaluationSummary;
type Review = Evaluation & {
  type: ReviewType.Review,
};
const isReview = (evaluation: Evaluation): evaluation is Review => evaluation.type === ReviewType.Review;
type AuthorResponse = Evaluation & {
  type: ReviewType.AuthorResponse,
};
const isAuthorResponse = (evaluation: Evaluation): evaluation is AuthorResponse => evaluation.type === ReviewType.AuthorResponse;

type PeerReview = {
  evaluationSummary?: EvaluationSummary,
  reviews: Review[],
  authorResponse?: AuthorResponse,
};

enum ManuscriptType {
  Preprint = 'preprint',
  VersionOfRecord = 'version-of-record',
}
const stringToManuscriptType = (manuscriptType: string): ManuscriptType => {
  if (manuscriptType === ManuscriptType.Preprint) {
    return ManuscriptType.Preprint;
  }
  if (manuscriptType === ManuscriptType.VersionOfRecord) {
    return ManuscriptType.VersionOfRecord;
  }
  throw Error(`Unknown manuscript type string ${manuscriptType}`);
};

type Manuscript = {
  id: string,
  type: ManuscriptType,
  versionIdentifier?: string,
  publishedDate?: Date,
  doi: string,
  url?: string,
  content?: string[],
  license?: string,
  sentForReviewDate?: Date,
  reviewedDate?: Date,
  authorResponseDate?: Date,
  peerReview?: PeerReview,
  republishedFrom?: Manuscript,
};

const createManuscriptFrom = (expression: Expression): Manuscript => {
  if (!expression.doi) {
    throw Error('Cannot identify Expression by DOI');
  }

  const content = (Array.isArray(expression.content) && expression.content.length > 0) ? { content: expression.content.map((contentItem) => contentItem.url).filter((url): url is string => !!url) } : {};
  const url = expression.url ? { url: expression.url } : {};
  const license = expression.license ? { license: expression.license } : {};

  return {
    id: expression.identifier ?? expression.doi,
    type: stringToManuscriptType(expression.type),
    doi: expression.doi,
    publishedDate: expression.published,
    versionIdentifier: expression.versionIdentifier,
    ...license,
    ...content,
    ...url,
  };
};

const isManuscriptAboutExpression = (manuscript: Manuscript, expression: Expression): boolean => {
  if (expression.doi !== manuscript.doi) {
    return false;
  }

  if (expression.versionIdentifier && expression.versionIdentifier !== manuscript.versionIdentifier) {
    return false;
  }

  return true;
};

const findManuscriptDescribedBy = (expression: Expression, manuscripts: Manuscript[]): Manuscript | undefined => manuscripts.find((manuscript) => isManuscriptAboutExpression(manuscript, expression));

const addManuscriptDescribedBy = (expression: Expression, manuscripts: Manuscript[]): Manuscript => {
  const newManuscript = createManuscriptFrom(expression);
  manuscripts.push(newManuscript);
  return newManuscript;
};

const updateManuscriptFrom = (manuscript: Manuscript, expression: Expression) => {
  const thisManuscript = manuscript;

  if (Array.isArray(expression.content) && expression.content.length > 0) {
    if (!Array.isArray(thisManuscript.content)) {
      thisManuscript.content = [];
    }
    thisManuscript.content.push(...expression.content.map((contentItem) => contentItem.url).filter((url): url is string => !!url));
  }

  if (expression.published) {
    thisManuscript.publishedDate = expression.published;
  }

  if (expression.url) {
    thisManuscript.url = expression.url;
  }

  if (expression.license) {
    thisManuscript.license = expression.license;
  }
};

const findAndUpdateOrAddManuscriptDescribedBy = (expression: Expression, manuscripts: Manuscript[]): Manuscript => {
  const foundManuscript = findManuscriptDescribedBy(expression, manuscripts);
  if (!foundManuscript) {
    return addManuscriptDescribedBy(expression, manuscripts);
  }
  // Update fields, default to any data already there.
  updateManuscriptFrom(foundManuscript, expression);

  return foundManuscript;
};

const mapEvaluationExpressionToEvaluation = (evaluation: EvaluationExpression): Evaluation => {
  const contentUrls = evaluation?.content?.filter((content) => content.type === 'web-page' && content.url).map((content) => content.url) as string[] ?? [];
  return {
    type: stringToReviewType(evaluation.type),
    participants: evaluation.participants,
    date: evaluation.published,
    contentUrls,
  };
};

const addEvaluationsToManuscript = (evaluationExpressions: EvaluationExpression[], manuscript: Manuscript) => {
  const evaluations = evaluationExpressions.map(mapEvaluationExpressionToEvaluation);
  const evaluationSummary = evaluations.filter(isEvaluationSummary);
  const reviews = evaluations.filter(isReview);

  const thisManuscript = manuscript;
  if (!thisManuscript.peerReview) {
    thisManuscript.peerReview = {
      reviews: [],
    };
  }
  thisManuscript.peerReview.reviews.push(...reviews);
  thisManuscript.peerReview.evaluationSummary = evaluationSummary.length > 0 ? evaluationSummary[0] : thisManuscript.peerReview.evaluationSummary;
};

const addAuthorResponseToManuscript = (authorResponseExpression: EvaluationExpression, manuscript: Manuscript) => {
  const authorResponse = mapEvaluationExpressionToEvaluation(authorResponseExpression);

  const thisManuscript = manuscript;
  if (!thisManuscript.peerReview) {
    thisManuscript.peerReview = {
      reviews: [],
    };
  }
  thisManuscript.peerReview.authorResponse = isAuthorResponse(authorResponse) ? authorResponse : thisManuscript.peerReview.authorResponse;
};
const republishManuscriptAs = (oldManuscript: Manuscript, newManuscript: Manuscript) => {
  const thisNewManuscript = newManuscript;
  thisNewManuscript.republishedFrom = oldManuscript;
};

export const reduceEventsToManuscripts = (events: PublishingEvent[]): Manuscript[] => {
  const manuscripts: Manuscript[] = [];

  events.forEach((event) => {
    switch (event.type) {
      case PublishingEventType.Draft: {
        findAndUpdateOrAddManuscriptDescribedBy(event.item, manuscripts);
        break;
      }
      case PublishingEventType.UnderReview: {
        const manuscript = findAndUpdateOrAddManuscriptDescribedBy(event.item, manuscripts);
        manuscript.sentForReviewDate = event.date ?? manuscript.sentForReviewDate;
        break;
      }
      case PublishingEventType.Published: {
        const manuscript = findAndUpdateOrAddManuscriptDescribedBy(event.item, manuscripts);
        manuscript.publishedDate = event.date ?? manuscript.publishedDate;
        break;
      }
      case PublishingEventType.PeerReviewed: {
        const manuscript = findAndUpdateOrAddManuscriptDescribedBy(event.item, manuscripts);
        addEvaluationsToManuscript(event.evaluations, manuscript);
        manuscript.reviewedDate = event.date ?? manuscript.peerReview?.evaluationSummary?.date ?? manuscript.reviewedDate;
        break;
      }
      case PublishingEventType.AuthorResponded: {
        const manuscript = findAndUpdateOrAddManuscriptDescribedBy(event.item, manuscripts);
        addAuthorResponseToManuscript(event.response, manuscript);
        manuscript.authorResponseDate = event.date ?? manuscript.authorResponseDate;
        break;
      }
      case PublishingEventType.Republished: {
        const newManuscript = findAndUpdateOrAddManuscriptDescribedBy(event.item, manuscripts);
        const oldManuscript = findAndUpdateOrAddManuscriptDescribedBy(event.originalItem, manuscripts);
        republishManuscriptAs(oldManuscript, newManuscript);
        break;
      }
      default:
        // this never happens
    }
  });

  return manuscripts;
};
