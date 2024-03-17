(() => {

///////////////////////////////
// General
///////////////////////////////

// escape strings for use with variable regex creation
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Fix obfuscated save file json keys
function fixMappings(decodedText) {
  decodedText = decodedText.replace(/\0$/, '');
  mappings = JSON.parse(document.getElementById('mapping').textContent).Mapping;
  mappings.forEach((mapping) => {
  const reg = new RegExp('"' + escapeRegExp(mapping.Key) + '":', 'g');
  decodedText = decodedText.replace(reg, '"' + mapping.Value + '":');
  });

  return decodedText;
}

// File upload reading helper
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
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
// Save Files
///////////////////////////////

// Lz4 stuff

const Buffer = require('buffer').Buffer;
const LZ4 = require('lz4');

// TODO: Make this work
async function compressSave() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select a file.');
    return;
  }

  const data = await readFile(file);
  const compressedData = compress(data);
  downloadFile(compressedData, file.name + '.compressed');
}

// Uploaded file -> json file
async function decompressSave() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select a file.');
    return;
  }

  disableButton($decompressSave);

  const fileData = await readFile(file);

  let decodedText = '';
  const size = fileData.byteLength;
  let tell = 0;

  do {
    // Slice the uploaded data for the next block
    const data = fileData.slice(tell);
    // Read No Man's Sky's magic number block
    const magicNumber = new Uint32Array(data, 0, 4)[0];
    // Get info on this block
    const compressedSize = new Uint32Array(data, 4, 4)[0];
    const uncompressedSize = new Uint32Array(data, 8, 4)[0];

    if (magicNumber !== 0xfeeda1e5) {
      alert('Invalid NMS Block, bad file');
      return;
    }

    // Read the current compressed block
    const compressedBlock = new Buffer.from(data.slice(16));
    // Set the uncompressed block up
    let uncompressedBlock = Buffer.alloc(uncompressedSize);
    // Decode the current compressed block
    const n = LZ4.decodeBlock(compressedBlock, uncompressedBlock, 0, compressedSize);
    // Trim the uncompressed block, for reasons
    uncompressedBlock = uncompressedBlock.slice(0, uncompressedSize);
    // Convert uncompressed block to text and append
    const decodedBlockText = uncompressedBlock.toString();
    decodedText += decodedBlockText;

    // Advance the file reader by the number of bytes we have read so far
    tell += 4 + 4 + 4 + 4 + compressedSize;
  } while (tell < size);

  // Clean up decoded text, json beautify and download
  decodedText = fixMappings(decodedText);
  downloadFile(JSON.stringify(JSON.parse(decodedText), false, 2), file.name.replace('.hg', '.hg.json'));

  enableButton($decompressSave);
}

// Binds

const $decompressSave = $('#decompressSave').on('click', decompressSave);
const $compressSave = $('#compressSave').on('click', compressSave);

})();