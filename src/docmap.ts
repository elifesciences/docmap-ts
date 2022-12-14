
export type Account = {
  id: string,
  service: string,
};

export type Url = string;
export type DOI = string;

export type Publisher = {
  id: string,
  name: string,
  logo: Url,
  homepage: Url,
  account: Account,
};

export enum ExpressionType {
  Preprint = 'preprint',
  RevisedPreprint = 'postprint',
  PeerReview = 'review-article',
  EvaluationSummary = 'evaluation-summary',
  VersionOfRecord = 'version-of-record',
};

export enum ManifestationType {
  WebPage = 'web-page',
};

export type Expression = {
  type: ExpressionType,
  identifier?: string,
  versionIdentifier?: string,
  url?: Url,
  published?: Date,
  doi?: DOI,
  content?: Manifestation[]
};

export type Manifestation = {
  type: ManifestationType,
  url?: Url,
  published?: Date,
  doi?: DOI,
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

export type RevisedPreprint = Expression & {
  type: ExpressionType.RevisedPreprint,
};

export type VersionOfRecord = Expression & {
  type: ExpressionType.VersionOfRecord,
};

export type WebPage = Manifestation & {
  type: ManifestationType.WebPage,
}

export type Item = Preprint | PeerReview | PeerReview | EvaluationSummary | VersionOfRecord | Expression;
export type Input = Item;
export type Output = Item;

export type Person = {
  type: string,
  name: string,
};

export type Participant = {
  actor: Person,
  role: string,
};


export type Action = {
  participants: Participant[],
  outputs: Output[],
};

export enum AssertionStatus {
  Published = 'published',
  UnderReview = 'under-review',
  PeerReviewed = 'peer-reviewed',
  Enhanced = 'enhanced',
  VersionOfRecord = 'version-of-record',
};

export type Assertion = {
  item: Item,
  status: AssertionStatus,
}

export type Step = {
  assertions: Assertion[],
  inputs: Input[],
  actions: Action[],
  'next-step'?: Step | string,
  'previous-step'?: Step | string,
};

export type DocMap = {
  '@context': typeof JsonLDFrameUrl | typeof JsonLDAddonFrame | Array<typeof JsonLDFrameUrl | typeof JsonLDAddonFrame>,
  type: 'docmap',
  id: Url,
  created: Date,
  updated: Date,
  publisher: Publisher,
  'first-step': string,
  steps: Map<string, Step>,
};

export const JsonLDFrameUrl = 'https://w3id.org/docmaps/context.jsonld';

export const JsonLDAddonFrame =  {
  "author-response": "fabio:Reply",
  "decision-letter": "fabio:Letter",
  "preprint": "fabio:Preprint",
  "review-article": "fabio:ReviewArticle",
  "version-of-record": "fabio:DefinitiveVersion",
  "identifier": "dcterms:identifier",
};
