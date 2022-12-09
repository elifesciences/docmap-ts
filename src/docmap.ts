
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

export type Input = Preprint | PeerReview | PeerReview | EvaluationSummary | VersionOfRecord | Expression;
export type Output = Preprint | PeerReview | PeerReview | EvaluationSummary | VersionOfRecord | Expression;

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
  '@context': typeof JsonLDFrameUrl | typeof JsonLDFrame,
  type: 'docmap',
  id: Url,
  created: Date,
  updated: Date,
  publisher: Publisher,
  'first-step': string,
  steps: Map<string, Step>,
};


export const JsonLDFrameUrl = 'https://w3id.org/docmaps/context.jsonld';

export const JsonLDFrame =  {
  "@context": {
    "@version": 1.1,
    "dcterms": "http://purl.org/dc/terms/",
    "atom": "http://www.w3.org/2005/Atom",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "cnt": "http://www.w3.org/2011/content#",
    "fabio": "http://purl.org/spar/fabio/",
    "frbr": "http://purl.org/vocab/frbr/core#",
    "pso": "http://purl.org/spar/pso/",
    "pwo": "http://purl.org/spar/pwo/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "prism": "http://prismstandard.org/namespaces/basic/2.0/",
    "pro": "http://purl.org/spar/pro/",
    "prov": "https://www.w3.org/TR/prov-o/",
    "taskex": "http://www.ontologydesignpatterns.org/cp/owl/taskexecution.owl#",
    "ti": "http://www.ontologydesignpatterns.org/cp/owl/timeinterval.owl#",
    "id": "@id",
    "type": "@type",
    "docmap": "pwo:Workflow",
    "created": {
        "@id": "dcterms:created",
        "@type": "xsd:date"
    },
    "updated": {
        "@id": "atom:updated",
        "@type": "xsd:date"
    },
    "description": "dcterms:description",
    "title": {
        "@id": "dcterms:title",
        "@container": "@language"
    },
    "doi": "prism:doi",
    "creator": {
        "@id": "dcterms:creator",
        "@container": "@set",
        "@type": "@id"
    },
    "published": {
        "@id": "prism:publicationDate",
        "@type": "xsd:date"
    },
    "name": "foaf:name",
    "person": "foaf:Person",
    "publisher": {
        "@id": "dcterms:publisher",
        "@type": "foaf:Organization"
    },
    "logo": {
        "@id": "foaf:logo",
        "@type": "xsd:anyURI"
    },
    "homepage": {
        "@id": "foaf:homepage",
        "@type": "xsd:anyURI"
    },
    "account": {
        "@id": "foaf:OnlineAccount",
        "@type": "xsd:anyURI"
    },
    "service": {
        "@id": "foaf:accountServiceHomepage",
        "@type": "xsd:anyURI"
    },
    "provider": {
        "@id": "foaf:Organization",
        "@type": "@id"
    },
    "process": {
        "@id": "prov:process",
        "@type": "xsd:string"
    },
    "inputs": {
        "@id": "pwo:needs",
        "@container": "@set",
        "@type": "@id"
    },
    "outputs": {
        "@id": "pwo:produces",
        "@container": "@set",
        "@type": "@id"
    },
    "assertions": {
        "@id": "pso:resultsInAcquiring",
        "@container": "@set",
        "@type": "@id",
        "@context": {
            "item": {
                "@id": "pso:isStatusHeldBy",
                "@type": "@id"
            },
            "status": {
                "@id": "pso:withStatus",
                "@type": "@vocab",
                "@context": {
                    "@vocab": "http://purl.org/spar/pso/"
                }
            }
        }
    },
    "steps": {
        "@id": "pwo:hasStep",
        "@container": [
            "@id"
        ]
    },
    "first-step": {
        "@id": "pwo:hasFirstStep",
        "@type": "@id"
    },
    "next-step": {
        "@id": "pwo:hasNextStep",
        "@type": "@id"
    },
    "previous-step": {
        "@id": "pwo:hasPreviousStep",
        "@type": "@id"
    },
    "content": {
        "@id": "fabio:hasManifestation",
        "@type": "@id",
        "@container": "@set"
    },
    "url": {
        "@id": "fabio:hasURL",
        "@type": "xsd:anyURI"
    },
    "review": "fabio:ProductReview",
    "web-page": "fabio:WebPage",
    "participants": {
        "@id": "pro:isDocumentContextFor",
        "@container": "@set",
        "@type": "@id"
    },
    "role": {
        "@id": "pro:withRole",
        "@type": "@vocab",
        "@context": {
            "@vocab": "http://purl.org/spar/pro/"
        }
    },
    "actor": {
        "@id": "pro:isHeldBy",
        "@type": "@id"
    },
    "email": "fabio:Email",
    "file": {
        "@id": "fabio:DigitalManifestation",
        "@context": {
            "text": "cnt:chars"
        }
    },
    "letter": "fabio:Letter",
    "manuscript": "fabio:Manuscript",
    "format": {
        "@id": "dcterms:format",
        "@type": "@vocab",
        "@context": {
            "@vocab": "https://w3id.org/spar/mediatype/"
        }
    },
    "includes": "frbr:part",
    "actions": {
        "@id": "taskex:isExecutedIn",
        "@container": "@set",
        "@type": "@id"
    },
    "happened": {
        "@id": "pwo:happened",
        "@type": "@id"
    },
    "at-date": {
        "@id": "ti:hasIntervalDate",
        "@type": "xsd:date"
    },
    "realization-of": {
        "@id": "frbr:realizationOf",
        "@type": "@id"
    },
    "author-response": "fabio:Reply",
    "evaluation-summary": "fabio:ExecutiveSummary",
    "decision-letter": "fabio:Letter",
    "preprint": "fabio:Preprint",
    "review-article": "fabio:ReviewArticle",
    "version-of-record": "fabio:DefinitiveVersion",
  }
};
