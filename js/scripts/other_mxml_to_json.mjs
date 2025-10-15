import fs from 'fs';
import path from 'path';
import { otherMXMLtoJSON } from '../shared/mxml-to-json-util.mjs';

let allFormatted = [];
const files = process.argv.slice(2)

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  console.log(`${file}...`);
  console.log(`Length before: ${content.length}`);
  const formatted = otherMXMLtoJSON(content);
  console.log(`Length after: ${formatted.length}`);
  console.log(`Writing "${file.toLowerCase().replace('.mxml', '.MXML.json')}"...`);
  fs.writeFileSync(file.toLowerCase().replace('.mxml', '.MXML.json'), formatted, 'utf8');
}

console.log(`Processed ${files.length} MXML file(s).`);
