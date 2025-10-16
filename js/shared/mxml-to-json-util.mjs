////////////////////////////////
// Convert `metadata/gamestate/defaultseasonaldata.MXML` to .json
////////////////////////////////

export function defaultseasonaldataMXMLtoJSON(xmlText) {
  // TODO: Figure out when to use "^KEY_NAME" vs "KEY_NAME"

  let json = xmlText
    .replace(/\r/g, '')
    .replace(/\0/g, '')
    .replace(/<\?xml.+?\?>\n/, '')
    .replace(/<!--.+?-->\n/, '')
    .replace(/<Data.+?>/, '{')
    .replace(/<\/Data>/, '}')
    ;

  let matches;

  // Find the objects
  while(matches = json.match(/(\t+)<Property name="([^"]+)" value="([^"]*)">/)) {
    const idx = json.indexOf(matches[0]);

    const prefix = json.substring(0, idx);
    const suffix = json.substring(idx + matches[0].length).replace(`\n${matches[1]}</Property>\n`, `\n${matches[1]}}\n`);

    json = `${prefix}${matches[1]}"${matches[2]}": {${suffix}`;
  }

  // Find the arrays
  while(matches = json.match(/(\t+)<Property name="([^"]*)">/)) {
    const idx = json.indexOf(matches[0]);

    const prefix = json.substring(0, idx);
    const suffix = json.substring(idx + matches[0].length).replace(`\n${matches[1]}</Property>\n`, `\n${matches[1]}]\n`);

    json = `${prefix}${matches[1]}"${matches[2]}": [${suffix}`;
  }

  // Replace properties for key: value pairs
  json = json
    .replace(/<Property name="([^"]+)" value="([^"]*)" \/>/g, (m, p1, p2) => {
      const r2 = (p2 === 'true' || p2 === 'false' || p2.match(/^-?[0-9]+$/) || p2.match(/^-?[0-9]\.[0-9]+$/) || p2.match(/^-?[1-9][0-9]+\.[0-9]+$/)) ? p2 : `"${p2}"`;
      return `"${p1}": ${r2}`
    })
    .replace(/<Property name="([^"]+)" \/>/g, '"$1": []')
    .replace(/<Property name="[^"]+" value="[^"]+" _index="[^"]+">/g, '{')
    .replace(/<\/Property>/g, '}')
    ;

  let maxIndent = 0;
  // Find biggest indent
  matches = json.match(/\n(\t+)[^\t]/g);
  maxIndent = matches.reduce((acc, cur) => cur.length - 2 > acc ? cur.length - 2 : acc, maxIndent);

  // Add commas
  const tabString = "\t";
  for (let i = 1; i <= maxIndent; i++) {
    const tabs = tabString.repeat(i);
    const reg = new RegExp(`\n${tabs}([^\t]+)(?=\n${tabs}[^\t])`, 'g');
    json = json.replace(reg, `\n${tabs}$1,`);
  }

  // fix array properties that looked like object properties
  for (let i = 1; i < maxIndent; i++) {
    const tabs = tabString.repeat(i);
    const tabsplus = tabString.repeat(i + 1);
    const reg = new RegExp(`(?<=\n${tabs}"[^"]+": \\[)(\n(${tabsplus})("[^"]+": ([^\n]+)))+(?=\n${tabs}\\],?\n)`, 'g');

    json = json.replace(reg, (m, p1, p2, p3, p4, p5) => {
      // Ideally I wouldn't have to do a replace here but whatever
      return m.replace(/"[^"]+": /g, '');
    });
  }

  return json;
}

////////////////////////////////
// Convert `language/*.MXML` to key:value .json
////////////////////////////////

export function languageMXMLtoJSON(xmlText) {
  return xmlText
    .replace(/[\r]/g, '')
    .replace(/<\?xml.+?\?>\n/, '')
    .replace(/<!--.+?-->\n/, '')
    .replace(/\t+<Property name="Table"[^>]*>\n/g, '')
    .replace(/\t+<Property name="Id" value="([^"]+)"[\s\S]+?name="USEnglish" value="([^"]+)" \/>/g, '"$1":"$2",')
    .replace(/\t+<\/Property>\n/g, '')
    .replace(/\\/g, '\\\\') // Fix broken escapes
    .replace(/<Data.+?>/, '{')
    .replace(/<\/Data>/, '}')
    .replace(/,\n}/, "\n}")
    ;
}

////////////////////////////////
// Convert item/title MXMLs to key:value .json
////////////////////////////////

export function itemsMXMLtoJSON(xmlText) {
  return xmlText
    .replace(/[\r\0]/g, '')
    .replace(/<\?xml.+?\?>\n/, '')
    .replace(/<!--.+?-->\n/, '')
    .replace(/<Data.+?>/, '{')
    .replace(/(?<=\n)\t\t<Property name="Table" value="[^"]+" _id="([^"]+)">[\s\S]+?<Property name="NameLower" value="([^"]+)" \/>[\s\S]+?\n\t\t<\/Property>/g, '"$1": "$2",')
    .replace(/(?<=\n)\t\t<Property name="Titles" value="[^"]+" _id="([^"]+)">[\s\S]+?<Property name="Title" value="([^"]+)" \/>[\s\S]+?\n\t\t<\/Property>/g, '"$1": "$2",')
    .replace(/(?<=\n)\t<Property name="[^"]+" \/>\n/, '')
    .replace(/(?<=\n)\t<\/Property>\n/, '')
    .replace(/(?<=\n)\t<Property name="(Table|Titles)">\n/, '')
    .replace(/<\/Data>/, '}')
    .replace(/,\n}/, "\n}")
    ;
}

////////////////////////////////
// Convert Other .MXML files to .json
////////////////////////////////

export function otherMXMLtoJSON(xmlText) {
  let json = xmlText
    // Remove windowsy characters
    .replace(/\r/g, '')
    // Remove null terminators
    .replace(/\0/g, '')
    // Data open
    .replace(/<Data template="([^"]+)">/, '{ "_TEMPLATE": "$1",')
    // Data close
    .replace(/<\/Data>/, '}')
    // Possible array open
    .replace(/<Property name="([^"]+)">/g, '"$1": [')
    // Object open
    .replace(/<Property value="([^"]+)">/g, '{ "_SCHEMA": "$1",')
    // Named object open
    .replace(/<Property name="([^"]+)" value="([^"]+)">/g, '"$1": { "_SCHEMA": "$2",')
    // Named object open 2?
    .replace(/<Property name="([^"]+)" value="([^"]+)" _id="[^"]*">/g, '{ "_SCHEMA": "$2",')
    // Named object open 3?
    .replace(/<Property name="([^"]+)" value="([^"]+)" _index=("[^"]+")>/g, '{ "_SCHEMA": "$2",')
    // Named object open 4?
    .replace(/<Property name="([^"]+)" value="([^"]+)" _id=("[^"]*") _index=("[^"]+")>/g, '{ "_SCHEMA": "$2",')
    // key value pair
    .replace(/<Property name="([^"]*)" value="([^"]*)" \/>/g, '"$1": "$2",')
    // key empty value pair
    .replace(/<Property name="([^"]*)" \/>/g, '"$1": "",')
    // only value?
    .replace(/<Property name="([^"]*)" value="([^"]*)" _index="[0-9]+" \/>/g, '"$2",')
    // Empty object
    .replace(/<Property value="([^"])" \/>/g, '{ "_SCHEMA": "$1" },')
    // Ending object or array tag
    .replace(/<\/Property>/g, '},')
    // Integer array value
    .replace(/<Property value=([^\/]+) \/>/g, '$1,')
    // String array value
    .replace(/<Property value=("[^\/]+") \/>/g, '$1,')
    // Fix trailing commas
    .replace(/,\n([\t]*)(\}|\])/g, "\n$1$2")
    // Fix array that is actually object
    .replace(/\[(\n[\t]+"[^"]+":)/g, '{$1')
    ;

  // fix } to ] for arrays
  let maxIndent = 0;
  // Find biggest indent
  const matches = json.match(/\n(\t+)[^\t]/g);
  maxIndent = matches.reduce((acc, cur) => cur.length - 2 > acc ? cur.length - 2 : acc, maxIndent);

  let loop = 0;
  for (let i = 1; i <= maxIndent; i++) {
    // Find mismatched brackets and replace them
    let reg = new RegExp(`(?<=\n)\t{${i}}"[^"]+": \\[`, 'g'); // "
    let regreplace = new RegExp(`(?<=\n\t{${i}})\\}`); // "
    const matches = [...json.matchAll(reg)];
    console.log(matches.length);

    for (let match of matches) {
      json = json.substring(0, match.index + match[0].length) + json.substring(match.index + match[0].length).replace(regreplace, ']');
    }
  }

  json = json
    // Remove quotes from integers
    .replace(/"(-?[0-9]+(\.[0-9]+)?)"/g, '$1')
    // Boolean true
    .replace(/"True"/gi, 'true')
    // Boolean false
    .replace(/"False"/gi, 'false')
    // Remove xml header
    .replace(/^<\?xml[^\{]+/, '')
    ;

  return json;
}