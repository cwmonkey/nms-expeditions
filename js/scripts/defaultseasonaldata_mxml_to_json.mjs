import fs from 'fs';
import path from 'path';
import { defaultseasonaldataMXMLtoJSON } from '../shared/mxml-to-json-util.mjs';

const file = process.argv[2];

const content = fs.readFileSync(file, 'utf8');
console.log(`${file}...`);
console.log(`Length before: ${content.length}`);
const formatted = defaultseasonaldataMXMLtoJSON(content);
console.log(`Length after: ${formatted.length}`);

// Write to output file
fs.writeFileSync(file.replace(/\.MXML$/, '.MXML.json'), formatted, 'utf8');

console.log(`Processed ${file}.`);
