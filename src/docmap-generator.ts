import { Action, Assertion, Content, DocMap, Input, Output, Participant, Publisher, Step, Url } from './docmap';

type Steps = {
  'first-step': string,
  steps: Map<string, Step>
}

export const generateInput = (doi: string, url: Url, published?: Date): Input => ({
  doi,
  url,
  published,
});

export const generatePersonParticipant = (name: string, role: string): Participant => ({
  actor: {
    name,
    type: 'person',
  },
  role,
});

export const generateContent = (type: string, url: Url): Content => ({
  type,
  url,
});

export const generateOutput = (type: string, published: Date, content: Content[]): Output => ({
  published,
  type,
  content,
});

export const generateAction = (participants: Participant[], outputs: Output[]): Action => ({
  participants,
  outputs,
});

export const generatePeerReviewAction = (participants: Participant[], outputs: Output[]): Action => ({
  participants,
  outputs,
});

export const generateStep = (inputs: Input[], actions: Action[], assertions: Assertion[]): Step => ({
  assertions,
  inputs,
  actions,
});

export const addNextStep = (previousStep: Step, nextStep: Step): Step => {
  previousStep['next-step'] = nextStep;
  nextStep['previous-step'] = previousStep;

  return nextStep
};

export const generateAssertion = (status: string): Assertion => ({
  status,
});

const dereferenceSteps = (firstStep: Step): Steps => {
  const steps = new Map<string, Step>();

  let currentStep: Step | undefined = firstStep;
  let currentStepId: number | undefined = 0;
  let previousStepId: number | undefined = undefined;
  let nextStepId: number | undefined = undefined;

  while (currentStep !== undefined) {
    nextStepId = currentStep['next-step'] !== undefined ? currentStepId + 1 : undefined;

    steps.set('_:b'+currentStepId, {
      actions: currentStep.actions,
      assertions: currentStep.assertions,
      inputs: currentStep.inputs,
      "next-step": nextStepId ? '_:b'+nextStepId : undefined,
      "previous-step": previousStepId ? '_:b'+previousStepId : undefined,
    });

    previousStepId = currentStepId;
    if (typeof currentStep['next-step'] === 'string') {
      currentStep = steps.get(currentStep['next-step']);
    } else {
      currentStep = currentStep['next-step'];
    }
    currentStepId++;
  }

  return {
    'first-step': '_:b0',
    steps,
  };
};

export const generateDocMap = (id: string, publisher: Publisher, firstStep: Step): DocMap => {
  const steps = dereferenceSteps(firstStep);
  return {
    '@context': 'https://w3id.org/docmaps/context.jsonld',
    type: 'docmap',
    id: id,
    created: new Date('2022-09-06T09:10:16.834Z'),
    updated: new Date('2022-09-06T09:10:20.344Z'),
    publisher: publisher,
    ...steps,
  };
};


const JsonLDFrame =  {
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
    "decision-letter": "fabio:Letter"
  }
};
