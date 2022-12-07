
export type Account = {
  id: string,
  service: string,
};

export type Url = string;

export type Publisher = {
  id: string,
  name: string,
  logo: Url,
  homepage: Url,
  account: Account,
};

export type Input = {
  doi: string,
  url: Url,
  published?: Date,
};

export type Person = {
  type: string,
  name: string,
};

export type Participant = {
  actor: Person,
  role: string,
};

export type Content = {
  type: string,
  url: Url,
}

export type Output = {
  type: string,
  published: Date,
  content: Content[],
};

export type Action = {
  participants: Participant[],
  outputs: Output[],
};

export type Assertion = {
  status: string,
}

export type Step = {
  assertions: Assertion[],
  inputs: Input[],
  actions: Action[],
  'next-step'?: Step | string,
  'previous-step'?: Step | string,
};

export type DocMap = {
  '@context': 'https://w3id.org/docmaps/context.jsonld',
  type: 'docmap',
  id: Url,
  created: Date,
  updated: Date,
  publisher: Publisher,
  'first-step': string,
  steps: Map<string, Step>,
};
