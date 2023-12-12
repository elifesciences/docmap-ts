/* eslint-disable no-console */
import { exit } from 'process';
import { DocMap } from './docmap';
import { parsePreprintDocMap } from './docmap-parser';

const input = process.argv[2] || '';

const msid = (input.match(/^[0-9]+$/)) ? input : null;
const docmapUrl = `https://data-hub-api--stg.elifesciences.org/enhanced-preprints/docmaps/v2/${msid ? `by-publisher/elife/get-by-manuscript-id?manuscript_id=${msid}` : 'index'}`;

const processDocmap = (docMapStruct: DocMap) => {
  const docMapEditableStruct = JSON.parse(JSON.stringify(docMapStruct));
  // You can make edits here

  const docMapJson = JSON.stringify(docMapEditableStruct);
  const parsedDocMap = parsePreprintDocMap(docMapJson);
  console.log(JSON.stringify(docMapEditableStruct, undefined, '  '));
  console.log(JSON.stringify(parsedDocMap, undefined, '  '));
};

if (msid || input.length === 0) {
  fetch(docmapUrl)
    .then((data) => data.json())
    .then((data) => {
      if (msid) {
        processDocmap(data);
        exit(1);
      }

      data.docmaps.forEach((docMapStruct: DocMap) => {
        processDocmap(docMapStruct);
        exit(1);
      });
    });
} else {
  processDocmap(JSON.parse(input));
  exit(1);
}
