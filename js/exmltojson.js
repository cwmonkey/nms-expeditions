(() => {

///////////////////////////////
// General
///////////////////////////////

// File upload reading helper
function readFile(file, binary) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);

    if (binary) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}

// chatGPT's version of the file downloader
function downloadFile(data, fileName) {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Enable/Disable a button

function disableButton($el) {
  $el.prop('disabled', true).addClass('disabled');
}

function enableButton($el) {
  $el.prop('disabled', false).removeClass('disabled');
}

///////////////////////////////
// EXML Files
///////////////////////////////

let jsonText = null;
let jsonObject = null;
let regs = [];

// Mostly because of bad highlighting issues
function addReg(reg, replace) {
  regs.push([reg, replace]);
}

// Quick, dirty, and probably broken exml to json conversion

// Remove windowsy characters
addReg(/\r/g, '');
// Data open
addReg(/<Data template="([^"]+)">/, '{ "_TEMPLATE": "$1",');
// Data close
addReg(/<\/Data>/, '}');
// Possible array open
addReg(/<Property name="([^"]+)">/g, '"$1": [');
// Object open
addReg(/<Property value="([^"]+)">/g, '{ "_SCHEMA": "$1",');
// Named object open
addReg(/<Property name="([^"]+)" value="([^"]+)">/g, '"$1": { "_SCHEMA": "$2",');
// key value pair
addReg(/<Property name="([^"]*)" value="([^"]*)" \/>/g, '"$1": "$2",');
// key empty value pair
addReg(/<Property name="([^"]*)" \/>/g, '"$1": "",');
// Empty object
addReg(/<Property value="([^"])" \/>/g, '{ "_SCHEMA": "$1" },');
// Ending object or array tag
addReg(/<\/Property>/g, '},');
// Integer array value
addReg(/<Property value=([^\/]+) \/>/g, '$1,');
// String array value
addReg(/<Property value=("[^\/]+") \/>/g, '$1,');
// Fix trailing commas
addReg(/,\n([ ]*)(\}|\])/g, "\n$1$2");
// Fix array that is actually object
addReg(/\[(\n[ ]+"[^"]+":)/g, '{$1');
// Fix ending array brace
// This works by finding objects with something other than strings after the "{"
//  then finding the ending brace with the same amount of indentation to replace
for (let i = 2; i <= 64; i += 2) {
  const reg = new RegExp('(\\n {' + i + '})"([^"]+)": (\\[[\\s\\S]+?)(\\n {' + i + '})\\}', 'g');
  addReg(reg, '$1"$2":  $3$4]');
}
// Remove quotes from integers
addReg(/"(-?[0-9]+(\.[0-9]+)?)"/g, '$1');
// Boolean true
addReg(/"True"/g, 'true');
// Boolean false
addReg(/"False"/g, 'false');
// Remove xml header
addReg(/^<\?xml[^\{]+/, '');

// Uploaded file -> json text
async function convertExmlToJson() {
  const fileInput = document.getElementById('fileInput');
  file = fileInput.files[0];
  if (!file) {
    alert('Please select a file.');
    return;
  }

  disableButton($convert);

  jsonText = await readFile(file);

  regs.forEach((reg) => {
    jsonText = jsonText.replace(reg[0], reg[1]);
  });

  window.jsonText = jsonText;

  enableButton($convert);
}

// Download parsed/validated json
function downloadJson() {
  disableButton($downloadJson);

  if (!jsonText) {
    alert('No EXML file converted');
  }

  try {
    jsonObject = JSON.parse(jsonText);
    window.jsonObject = jsonObject;
    downloadFile(JSON.stringify(jsonObject, false, 2), file.name.replace('.EXML', '.EXML.json'));
  } catch(err) {
    alert('Error parsing JSON: ' + err);
  }

  enableButton($downloadJson);
}

// Just download the regexed text in case of error
function downloadBrokenJson() {
  disableButton($downloadBrokenJson);

  if (!jsonText) {
    alert('No EXML file converted');
  }

  downloadFile(jsonText, file.name.replace('.EXML', '.EXML.json'));

  enableButton($downloadBrokenJson);
}

// Binds

const $convert = $('#convert').on('click', convertExmlToJson);
const $downloadJson = $('#downloadJson').on('click', downloadJson);
const $downloadBrokenJson = $('#downloadBrokenJson').on('click', downloadBrokenJson);

})();