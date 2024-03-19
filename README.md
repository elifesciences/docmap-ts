# Description

This repository holds the work of defining and understanding [docmaps](https://docmaps.knowledgefutures.org/pub/sgkf1pqa/release/7) as used in [eLife's Enhanced preprints platform](https://github.com/orgs/elifesciences/repositories?q=enhanced-preprints).

Primarily the value is as a nodejs library you can import. This exports types, functions to generate different aspects of a docmap, and a parser intended to understand the current state of a document described in a docmap.

There are also additional tools in this repository, including:
- yarn scripts to parse a docmap and viewing the parsing output
- yarn script to generate some example docmaps, and the resulting output is stored in `examples/generated`

## Getting started as a library

The library is not published to NPM as of time of writing, but you can import the library direct from git:

```
yarn add  "@elifesciences/docmap-ts@https://github.com/elifesciences/docmap-ts#v0.0.37"
```

The most useful part, the parser, can be invoked by passing a docmap as a string to `parseDocmap()`:
```
import { parser } from '@elifesciences/docmap-ts';

const parsedOutput = parser.parsePreprintDocMap();
```

## Developing or using the repo

### prerequisites

- nodejs
- yarn

## Running tests

To run the test suite, just run `yarn test`.

## Scripts

### test the parser

run `yarn parse ./path/to/docmap.json`

### regenerate the example docmaps

run `yarn generate`

### parse eLife's docmap index

run `yarn fetch-and-test-data-hub-docmap`
