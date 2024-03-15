// export types useful to use this as a library
export * from './types/docmap';
export {
  VersionedReviewedPreprint,
  ManuscriptData,
  ReviewType,
  Evaluation,
} from './parser/docmap-parser';

// export parser and generators
export * as parser from './parser/docmap-parser';
export * as generators from './generators/docmap-generators';
