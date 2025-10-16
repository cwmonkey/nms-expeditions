import { defaultseasonaldataMXMLtoJSON, languageMXMLtoJSON, otherMXMLtoJSON, itemsMXMLtoJSON } from '../shared/mxml-to-json-util.mjs';
import { disableButton, enableButton, downloadFile } from '../shared/tools-util.mjs';

///////////////////////////////
// General
///////////////////////////////

// File upload reading helper
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

///////////////////////////////
// Convert
///////////////////////////////

const $buttons = $('button');

const $mxml = $('#mxml');

// Language
async function convertLanguage(download) {
  disableButton($buttons);

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  let xmlText = '';

  if (file) {
    xmlText = await readFile(file);
  } else {
    xmlText = $mxml.val();
  }

  const json = languageMXMLtoJSON(xmlText);


  enableButton($buttons);

  if (download === true) {
    downloadFile(json, file.name.replace('.MXML', '.MXML.json'));
  } else {
    $('#json').val(json);
  }
}

async function downloadLanguage() {
  convertLanguage(true);
}

$('#convert_language').on('click', convertLanguage);
$('#download_language').on('click', downloadLanguage);

// Expedition
async function convertSeasonal(download) {
  disableButton($buttons);

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  let xmlText = '';

  if (file) {
    xmlText = await readFile(file);
  } else {
    xmlText = $mxml.val();
    // localStorage.setItem('mxml', xmlText);
  }

  const json = defaultseasonaldataMXMLtoJSON(xmlText);

  enableButton($buttons);

  if (download === true) {
    downloadFile(json, file.name.replace('.MXML', '.MXML.json'));
  } else {
    $('#json').val(json);
  }
}

async function downloadSeasonal() {
  convertSeasonal(true);
}

$('#convert').on('click', convertSeasonal);
$('#download').on('click', downloadSeasonal);

// Items
async function convertItems(download, format) {
  disableButton($buttons);

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  let xmlText = '';

  if (file) {
    xmlText = await readFile(file);
  } else {
    xmlText = $mxml.val();
    // localStorage.setItem('mxml', xmlText);
  }

  let json = itemsMXMLtoJSON(xmlText);

  enableButton($buttons);

  if (download === true) {
    downloadFile(json, file.name.replace('.MXML', '.MXML.json'));
  } else {
    if (format === true) {
      try {
        json = JSON.stringify(JSON.parse(json), false, "\t");
      } catch(err) {
        console.log('ERROR', err);
      }
    }

    $('#json').val(json);
  }
}

async function downloadItems() {
  convertItems(true);
}

async function formatItems() {
  convertItems(false, true);
}

$('#convert_items').on('click', convertItems);
$('#format_items').on('click', formatItems);
$('#download_items').on('click', downloadItems);

// Other
async function convertOther(download, format) {
  disableButton($buttons);

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  let xmlText = '';

  if (file) {
    xmlText = await readFile(file);
  } else {
    xmlText = $mxml.val();
    // localStorage.setItem('mxml', xmlText);
  }

  let json = otherMXMLtoJSON(xmlText);

  enableButton($buttons);

  if (download === true) {
    downloadFile(json, file.name.replace('.MXML', '.MXML.json'));
  } else {
    if (format === true) {
      try {
        json = JSON.stringify(JSON.parse(json), false, "\t");
      } catch(err) {
        console.log('ERROR', err);
      }
    }

    $('#json').val(json);
  }
}

async function downloadOther() {
  convertOther(true);
}

async function formatOther() {
  convertOther(false, true);
}

$('#convert_other').on('click', convertOther);
$('#format_other').on('click', formatOther);
$('#download_other').on('click', downloadOther);

/*const mxml = localStorage.getItem('mxml');
if (mxml) $mxml.val(mxml);*/