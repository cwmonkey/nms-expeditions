import fs from 'fs';
import path from 'path';
import { itemsMXMLtoJSON } from '../shared/mxml-to-json-util.mjs';

const dir = process.argv[2];
const files = [
  '/metadata/reality/tables/nms_reality_gcproceduraltechnologytable.MXML',
  '/metadata/reality/tables/nms_reality_gcproducttable.MXML',
  // '/metadata/reality/tables/nms_reality_gcrecipetable.MXML',
  '/metadata/reality/tables/nms_reality_gcsubstancetable.MXML',
  '/metadata/reality/tables/nms_reality_gctechnologytable.MXML',
  '/metadata/gamestate/playerdata/playertitledata.MXML'
];

let allFormatted = [];

for (const file of files) {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`${file}...`);
  console.log(`Length before: ${content.length}`);
  const formatted = itemsMXMLtoJSON(content);
  console.log(`Length after: ${formatted.length}`);
  // trum opening/closing braces
  allFormatted.push(formatted.slice(2, -2));
}

const content = allFormatted
  .join(',\n') + ',';

// Write to output file
fs.writeFileSync(`${dir}/metadata/reality/tables/nms_reality_all_items_titles.json`, "{\n" + content.slice(0, -1) + "\n}", 'utf8');

console.log(`Sorting...`);

// Concatenate and sort alphabetically (case-insensitive)
const sorted = content
  .split(/\r?\n/)
  .filter(line => line.trim().length > 0)
  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  .join('\n');

// Write to output file
fs.writeFileSync(`${dir}/metadata/reality/tables/nms_reality_all_items_titles.sorted.json`, "{\n" + sorted.slice(0, -1) + "\n}", 'utf8');

console.log(`Processed ${files.length} MXML file(s). Output written to nms_reality_all_items_titles.json`);