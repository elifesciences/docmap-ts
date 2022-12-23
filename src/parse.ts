import { R_OK } from 'constants';
import { accessSync, readFileSync } from 'fs';
import { argv, exit } from 'process';
import { parsePreprintDocMap } from './docmap-parser';

if (argv[2] === undefined) {
  console.log('Please provide a filename');
  exit(1);
}
try {
  accessSync(argv[2], R_OK);
} catch (error) {
  console.log('cannot read the provided file');
  exit(1);
}

const docMapJson = readFileSync(argv[2]).toString('utf-8');
const parsedDocMap = parsePreprintDocMap(docMapJson);
console.log(JSON.stringify(parsedDocMap, undefined, '  '));
