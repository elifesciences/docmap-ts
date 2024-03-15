import { DOI, Url } from './properties';

export enum ManifestationType {
  WebPage = 'web-page',
  DigitalManifestation = 'digital-manifestation',
}

export type Manifestation = {
  type: ManifestationType,
  url?: Url,
  published?: Date,
  doi?: DOI,
};

export type WebPage = Manifestation & {
  type: ManifestationType.WebPage,
};
