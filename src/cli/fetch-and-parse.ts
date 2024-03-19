/* eslint-disable no-console */
import { DocMap } from '../types';
import { parsePreprintDocMap } from '../parser/docmap-parser';

fetch('https://data-hub-api--stg.elifesciences.org/enhanced-preprints/docmaps/v2/index')
  .then((data) => data.json())
  .then((data) => {
    // Limiting to 3 for demonstration purposes.
    data.docmaps.slice(0, 3).forEach((docMapStruct: DocMap) => {
      const docMapEditableStruct = JSON.parse(JSON.stringify(docMapStruct));
      // You can make edits here

      const docMapJson = JSON.stringify(docMapEditableStruct);
      const parsedDocMap = parsePreprintDocMap(docMapJson);
      console.log(JSON.stringify(docMapEditableStruct, undefined, '  '));
      console.log(JSON.stringify(parsedDocMap, undefined, '  '));
    });
  });
