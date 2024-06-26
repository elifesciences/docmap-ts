import { Expression } from './expressions';
import { Url } from './properties';

export type Account = {
  id: string,
  service: string,
};

export type Publisher = {
  id: string,
  name: string,
  logo: Url,
  homepage: Url,
  account: Account,
};

export type Item = Expression;
export type Input = Item;
export type Output = Item;

export type Organization = {
  type: string,
  name: string,
  location?: string,
};

export type Person = {
  type: string,
  name: string,
  affiliation?: Organization,
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
  Draft = 'draft',
  Published = 'manuscript-published',
  UnderReview = 'under-review',
  PeerReviewed = 'peer-reviewed',
  Enhanced = 'enhanced',
  VersionOfRecord = 'version-of-record',
  Revised = 'revised',
  Republished = 'republished',
  Corrected = 'corrected',
}

export type Assertion = {
  item: Item,
  status: AssertionStatus,
  happened?: Date,
};

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

/* eslint-disable quote-props */
/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable @typescript-eslint/comma-dangle */
export const JsonLDAddonFrame = {
  'updated': {
    '@id': 'dcterms:updated',
    '@type': 'xsd:date'
  },
  'author-response': 'fabio:Reply',
  'decision-letter': 'fabio:Letter',
  'preprint': 'fabio:Preprint',
  'version-of-record': 'fabio:DefinitiveVersion',
  'update-summary': 'fabio:ExecutiveSummary',
  'draft': 'pso:draft',
  'manuscript-published': 'pso:published',
  'republished': 'pso:republished',
  'identifier': 'dcterms:identifier',
  'happened': {
    '@id': 'pwo:happened',
    '@type': 'xsd:date'
  },
  'versionIdentifier': 'prism:versionIdentifier'
};
/* eslint-enable quote-props */
/* eslint-enable @typescript-eslint/quotes */
/* eslint-enable @typescript-eslint/comma-dangle */
