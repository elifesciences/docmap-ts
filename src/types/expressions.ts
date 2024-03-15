import { Manifestation } from './manifestations';
import { DOI, Url } from './properties';

export enum ExpressionType {
  Preprint = 'preprint',
  RevisedPreprint = 'postprint',
  PeerReview = 'review-article',
  EvaluationSummary = 'evaluation-summary',
  VersionOfRecord = 'version-of-record',
  AuthorResponse = 'author-response',
  Reply = 'reply',
  UpdateSummary = 'update-summary',
  Insight = 'insight',
}

export type Expression = {
  type: ExpressionType,
  identifier?: string,
  versionIdentifier?: string,
  url?: Url,
  published?: Date,
  doi?: DOI,
  content?: Manifestation[],
  license?: string,
  partOf?: Manuscript,
  title?: string,
  description?: string,
  thumbnail?: Url,
};

export type Preprint = Expression & {
  type: ExpressionType.Preprint,
};

export type PeerReview = Expression & {
  type: ExpressionType.PeerReview,
};

export type EvaluationSummary = Expression & {
  type: ExpressionType.EvaluationSummary,
};

export type AuthorResponse = Expression & {
  type: ExpressionType.AuthorResponse,
};

export type Reply = Expression & {
  type: ExpressionType.Reply,
};

export type RevisedPreprint = Expression & {
  type: ExpressionType.RevisedPreprint,
};

export type UpdateSummary = Expression & {
  type: ExpressionType.UpdateSummary,
};

export type VersionOfRecord = Expression & {
  type: ExpressionType.VersionOfRecord,
};

export type Insight = Expression & {
  type: ExpressionType.Insight,
};

export type Manuscript = {
  type: 'manuscript',
  doi?: DOI,
  identifier?: string,
  volumeIdentifier?: string,
  electronicArticleIdentifier?: string,
  subjectDisciplines?: string[],
  complement?: Expression[],
  published?: Date,
};
