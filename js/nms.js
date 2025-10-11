;(function($) {

"use strict";

const $body = $(document.body);

///////////////////////////////
// Download Fake File
///////////////////////////////

// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

///////////////////////////////
// Merge JSON
///////////////////////////////

function fix(target, fixer) {
  let newTarget = JSON.parse(JSON.stringify(target));
  newTarget = recursiveFix(newTarget, fixer);
  return newTarget;
}

function recursiveFix(target, fixer) {
  let keys = Object.keys(fixer);
  const ifundefined = fixer['[[ifundefinedorblank]]'];
  const iflessthan = fixer['[[iflessthan]]'];
  const ifkeyexists = fixer['[[ifkeyexists]]'];
  const rename = fixer['[[rename]]'];

  if (ifkeyexists && typeof target[ifkeyexists] === 'undefined') {
    // don't do rename
  } else if (rename) {
    target[rename.to] = target[rename.from];
    delete target[rename.from];
  }

  if (isArray(fixer) && fixer[0] === '[[append]]') {
    // Assume target is an array as well
    fixer.forEach((v, k) => {
      if (v === '[[append]]') {
        // skip
      } else {
        target.push(v);
      }
    });
  } else {
    // loop backwards in case we have an array to avoid issues when deleting items
    for (let i = keys.length - 1; i >= 0; i--) {
      let prop = keys[i];

      if (ifundefined && (typeof target[prop] !== 'undefined' && target[prop] !== '^')) continue;
      if (iflessthan && target[prop] && iflessthan <= target[prop]) continue;
      if (ifkeyexists && typeof target[ifkeyexists] === 'undefined') continue;

      if (prop === '[[ifundefinedorblank]]' || prop === '[[iflessthan]]' || prop === '[[ifkeyexists]]' || prop === '[[rename]]') {
        // skip
      } else if (fixer[prop] === '[[removed]]') {
        if (isArray(fixer)) {
          target.splice(prop, 1);
        } else {
          // remove property
          delete target[prop];
        }
      } else if (fixer[prop] === null) {
        // skip
      } else if (typeof target[prop] === 'undefined') {
        // doesn't exist in source, add the whole thing
        if (isArray(fixer[prop])) {
          // Clean the array in case of [[]]'s
          fixer[prop] = recursiveFix([], fixer[prop]);
        }
        target[prop] = fixer[prop];
      } else if (typeof target[prop] === 'object') {
        // objet or array, pass it on
        target[prop] = recursiveFix(target[prop], fixer[prop]);
      } else {
        // not an object, add the value
        target[prop] = fixer[prop];
      }
    }
  }

  return target;
}

///////////////////////////////
// Expedition Selection
///////////////////////////////

const $props = $('.cust_prop_input');
const $download = $('.download');
let exp = null;
let expId = null;

$body.on('change', 'input[name="expeditions"]', (ev) => {
  const $checked = $('input[name="expeditions"]:checked');
  expId = $checked.data('id');
  exp = JSON.parse(document.getElementById(expId).textContent);

  // Show correct notice element if one exists
  $('.notice').removeClass('selected');
  $('#notice_' + expId).addClass('selected');

  $('.warning').removeClass('selected');
  $('#warning_' + expId).addClass('selected');

  $props.each((index, el) => {
    const $el = $(el);
    const property = $el.attr('name');
    const subproperty = $el.data('subprop');
    const parentProperty = $el.data('parentprop');
    const type = $el.data('type');
    let defaultValue = '--';

    const parent = (parentProperty) ? exp[parentProperty] : exp;
    if (parent && ((subproperty && typeof parent[property] !== 'undefined' && typeof parent[property][subproperty] !== 'undefined') || (!subproperty && typeof parent[property] !== 'undefined'))) {
      defaultValue = (subproperty) ? parent[property][subproperty] : parent[property];
    }

    if (defaultValue !== '--' && type === 'float') defaultValue = parseFloat(defaultValue).toFixed(2);

    const $defaultEl = $el.closest('.cust_item').find('.default');

    // If we have a select mapping, show the select's text rather than the value
    if ($el.is('select')) {
      const $option = $el.find('[value="' + defaultValue + '"]');
      defaultValue = $option.text() || defaultValue;
    }

    $defaultEl.text(defaultValue);
  });

  $download.removeAttr('disabled');
  updatePatches();
  checkWarnings();
  updateDebug();
});

///////////////////////////////
// Expedition Customization
///////////////////////////////

let overrides = null;

// Presets //

const presets = {};

// Load preset jsons
$('.cust_preset').each((index, el) => {
  const $el = $(el);
  const id = $el.data('id');
  const presetData = JSON.parse(document.getElementById(id).textContent);

  presets[id] = presetData;

  checkWarnings();
});

// Preset button event
$body.on('click', '.cust_preset', function () { // ES5 because of "this"
  const $el = $(this);
  const id = $el.data('id');
  const presetData = presets[id];

  for (const preset in presetData) {
    const value = presetData[preset];
    const $input = $('.cust_prop_input[name="' + preset + '"]');
    $input.val(value);
  }

  updateProps();
});

// Data massaging, right now just to calculate UTC
function filterProp(name, value) {
  if (name === 'EndTimeUTC') {
    const matches = value.match(/^\+([0-9]+) ([a-zA-Z]+)$/);
    const count = parseInt(matches[1]) || 6;
    const unit = matches[2];
    let days = 1;

    if (unit === 'Weeks') {
      days = 7;
    } else if (unit === 'Months') {
      days = 30;
    }

    value = Math.round((Date.now() / 1000)) + (days * count * 24 * 60 * 60);
  }

  return value;
}

// Update overrieds when custom properties are changed
function updateProps() {
  overrides = {};
  let hasUpdates = false;
  const counts = {};
  const currentProps = {};

  $props.each((index, el) => {
    const $el = $(el);
    const sectionId = $el.data('section-id');
    const $row = $el.closest('.cust_item');
    let value = $el.val();
    const property = $el.attr('name');
    const subproperty = $el.data('subprop');
    const parentProperty = $el.data('parentprop');
    let obj = overrides;
    const storageName = 'property-' + property;
    counts[sectionId] = counts[sectionId] || 0;

    if (value === '') {
      $row.removeClass('filled');
      localStorage.removeItem(storageName);
      return;
    }

    $row.addClass('filled');
    localStorage.setItem(storageName, value);
    currentProps[property] = value;

    if (value === 'true') value = true;
    if (value === 'false') value = false;
    if (/^[0-9]+$/.test(value)) value = parseInt(value);
    if (/^[0-9.]+$/.test(value)) value = parseFloat(value);

    hasUpdates = true;

    counts[sectionId]++;

    if (parentProperty) {
      if (typeof overrides[parentProperty] === 'undefined') overrides[parentProperty] = {};
      obj = overrides[parentProperty];
    }

    if (subproperty) {
      if (typeof obj[property] === 'undefined') obj[property] = {};
      obj[property][subproperty] = filterProp(property, value);
    }  else {
      obj[property] = filterProp(property, value);
    }
  });

  for (const sectionId in counts) {
    const count = counts[sectionId];
    const $text = $('#' + sectionId + '-count');
    let tpl = $text.data('count-template-other');
    if (!count) {
      tpl = $text.data('count-template-0');
    } else if (count === 1) {
      tpl = $text.data('count-template-1');
    }

    $text.text(tpl.replace('%n', count));
  }

  // Mark preset as active if objects match
  $('.cust_preset').removeClass('selected');

  for (const id in presets) {
    const preset = presets[id];
    const diff = getDiff(presets[id], currentProps);
    delete diff._generatedBy;

    if (JSON.stringify(diff) === '{}') {
      $('.cust_preset[data-id="' + id + '"]').addClass('selected');
      break;
    }
  }

  if (!hasUpdates) {
    overrides = null;
  }

  checkWarnings();

  updateDebug();
}

$body.on('input', '.cust_prop_input', updateProps);

// Check for warnings
const $warningContent = $('#modal-warning-content');

function checkWarnings() {
  $('.warning_message').removeClass('selected');

  if (expId && overrides) {
    $('#warning_' + expId + ' .warning_message').each((index, el) => {
      const $el = $(el);
      const prop = $el.data('prop');
      const subprop = $el.data('subprop');
      const value = $el.data('value');
      let override = null;

      if (prop && subprop) {
        override = overrides[prop][subprop];
      } else {
        override = overrides[prop];
      }

      if (override === value) {
        $el.addClass('selected');

        MicroModal.show('modal-warning');
        $warningContent.html($el.html());
      }
    })
  }
}

//load saved values
$props.each((index, el) => {
  const $el = $(el);
  const property = $el.attr('name');
  let value = localStorage.getItem('property-' + property);

  if (typeof value === 'undefined') return;

  $el.val(value);
});

// Reset values to default
$('.cust_reset').on('click', () => {
  $props.each((index, el) => {
    const $el = $(el);
    $el.val('');
  });

  updateProps();
});

// Export customizations to file
$('.cust_export').on('click', () => {
  const customizations = {};
  let hasCustomizations = false;

  $props.each((index, el) => {
    const $el = $(el);
    const property = $el.attr('name');
    const value = $el.val();

    if (value !== '') {
      hasCustomizations = true;
      customizations[property] = value;
    }
  });

  if (!hasCustomizations) {
    alert('No customizations selected.');
    return;
  }

  download('NMS_EXPEDITION_CUSTOMIZATIONS.JSON', JSON.stringify(customizations, null, 2).replace('{', '{' + "\n" + '  "_generatedBy": "Generated by https://cwmonkey.github.io/nms-expeditions/",'));
});

// Import customizations from file

// https://stackoverflow.com/questions/16505333/get-the-data-of-uploaded-file-in-javascript

function importFromFile(evt) {
  // console.info ( "[Event] file chooser" );

  let fl_files = evt.target.files; // JS FileList object

  // use the 1st file from the list
  let fl_file = fl_files[0];

  let reader = new FileReader(); // built in API

  let display_file = (e) => { // set the contents of the <textarea>
    // console.info( '. . got: ', e.target.result.length, e );
    // document.getElementById( 'upload_file' ).innerHTML = e.target.result;
    try {
      const customizations = JSON.parse(e.target.result);

      for (const cust in customizations) {
        const val = customizations[cust];
        $('.cust_prop_input[name="' + cust + '"]').val(val);
      }

      updateProps();
    } catch(err) {
      alert('Error reading uploaded file');
    }
  };

  let on_reader_load = (fl) => {
    // console.info( '. file reader load', fl );
    return display_file; // a function
  };

  // Closure to capture the file information.
  reader.onload = on_reader_load(fl_file);

  // Read the file as text.
  reader.readAsText( fl_file );
}

// add a function to call when the <input type=file> status changes, but don't "submit" the form
$('#upload').on('change', importFromFile);


// Patches

let patches = null;
function updatePatches() {
  if (!expId) return;

  const $selecteds = $('.patch_check[data-exp-id="' + expId + '"]:checked, .patch_check[data-exp-id="*"]:checked');
  patches = null;

  $selecteds.each((index, el) => {
    const $selected = $(el);
    const jsonId = $selected.attr('value');

    if (jsonId) {
      if (!patches) patches = [];
      patches.push(JSON.parse(document.getElementById(jsonId).textContent));
    }
  });

  updateDebug();
}

$body.on('change', '.patch_check', function() { // es5 because "this"
  const $el = $(this);
  const name = $el.attr('name');
  const jsonId = $el.attr('value');

  if (jsonId) {
    localStorage.setItem('patch-' + name, jsonId);
  } else {
    localStorage.removeItem('patch-' + name);
  }

  updatePatches();
});

// load patch selections
/*$('.patch_check').each((index, el) => {
  const $el = $(el);
  const name = $el.attr('name');
  const value = $el.val();
  const sValue = localStorage.getItem('patch-' + name);

  if (sValue === value) {
    $el.prop('checked', true);
  }
});*/

///////////////////////////////
// Download/Copy
///////////////////////////////

function getExpeditionJson() {
  let merged = fix(exp, overrides || {});

  if (patches) {
    patches.forEach((patch) => {
      merged = fix(merged, patch);
    })
  }

  if ($('#sort').prop('checked')) {
    merged = sortObject(merged, JSON.parse(document.getElementById('e19r00').textContent));
  }

  let json = JSON.stringify(merged, null, 2);
  // credit
  json = json.replace('{', '{' + "\n" + '  "_generatedBy": "Generated by https://cwmonkey.github.io/nms-expeditions/ (Original files from BorisDeLeodium & /)",');
  // remove possible keywords
  json = json.replace(/[ \t]*"\[\[append\]\]"(,?)\n/g, '');

  return json;
}

$download.on('click', () => {
  if (!exp) return;
  const json = getExpeditionJson();

  download('SEASON_DATA_CACHE.JSON', json);
});

$('#copy').on('click', () => {
  if (!exp) return;
  const json = getExpeditionJson();

  navigator.clipboard.writeText(json);
});

///////////////////////////////
// Debug
///////////////////////////////

const $debugOutput = $('.debug_output');

function updateDebug() {
  $debugOutput.text(
    '// Overrides:' + "\n" +
    JSON.stringify(overrides, null, 2) +
    "\n\n" +
    '// Patches:' + "\n" +
    JSON.stringify(patches, null, 2)
  );
}

$('#download_all').on('click', async () => {
  // Load JSZip dynamically if not already present
  if (typeof JSZip === "undefined") {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const zip = new JSZip();

  // Helper to pause (useful if clicking triggers async UI updates)
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  // Get all radio buttons matching [name="expeditions"]
  const radios = document.querySelectorAll('[name="expeditions"]');
  if (!radios.length) {
    console.error('No radio buttons found with name="expeditions"');
    return;
  }

  for (const radio of radios) {
    const expVersion = radio.dataset.version;
    const expName    = radio.dataset.name;
    const expLatest  = radio.dataset.latest;
    const prepend1   = expName.replace(': ', '_').toUpperCase() + '_';
    const prepend2   = ((expVersion === '0') ? 'ORIGINAL' : 'REDUX_' + expVersion) + '_';

    radio.click(); // trigger the selection
    // await sleep(300); // wait for data to update (adjust if needed)

    try {
      const content = typeof getExpeditionJson === "function" ? getExpeditionJson() : null;

      if (!content) {
        console.warn(`Skipping ${expName}: getExpeditionJson() returned nothing`);
        continue;
      }

      // If content is object, serialize to JSON
      const text = typeof content === "object" ? JSON.stringify(content, null, 2) : String(content);

      zip.file(`${prepend1}${prepend2}SEASON_DATA_CACHE.JSON`, text);
      console.log(`Added: ${prepend1}${prepend2}SEASON_DATA_CACHE.JSON`);

      if (expLatest) {
        zip.file(`${prepend1}LATEST_SEASON_DATA_CACHE.JSON`, text);
        console.log(`Added: ${prepend1}LATEST_SEASON_DATA_CACHE.JSON`);
      }
    } catch (err) {
      console.error("Error processing one expedition:", err);
    }
  }

  // Generate ZIP and trigger download
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "patched.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  console.log("ZIP download started.");
});

///////////////////////////////
// Patch maker
///////////////////////////////

$body.on('click', '#make_patch', () => {
  const before = JSON.parse($('#before').val());
  const after = JSON.parse($('#after').val());
  const $patch = $('#patch');

  const patch = getDiff(before, after);

  $patch.val(JSON.stringify(patch, null, 2));
});

// https://stackoverflow.com/questions/31295545/how-to-get-only-the-changed-values-from-two-json-objects

function isArray(obj) {
  return (Object.prototype.toString.call(obj) === '[object Array]');
}

function getDiff(a, b) {
  let diff = (isArray(a) ? [] : {});
  recursiveDiff(a, b, diff);
  return diff;
}

function recursiveDiff(a, b, node) {
  var checked = [];

  // Handle updating/removing from b
  for (var prop in a) {
    // debug(prop, 1);
    if (typeof b[prop] == 'undefined') {
      addNode(prop, '[[removed]]', node);
    } else if (JSON.stringify(a[prop]) != JSON.stringify(b[prop])) {
      // debug(typeof b[prop], 2);
      // if value
      if (typeof b[prop] != 'object' || b[prop] == null) {
        addNode(prop, b[prop], node);
        // debug("(added)", 3);
      } else {
        // if array
        if (isArray(b[prop])) {
         addNode(prop, [], node);
         recursiveDiff(a[prop], b[prop], node[prop]);
        // if object
        } else {
          addNode(prop, {}, node);
          recursiveDiff(a[prop], b[prop], node[prop]);
        }
      }
    }
  }

  // Handle adding new keys from b
  for (var prop in b) {
    if (typeof a[prop] == 'undefined') {
      addNode(prop, b[prop], node);
    }
  }
}

function addNode(prop, value, parent) {
  parent[prop] = value;
}

///////////////////////////////
// Sorting
///////////////////////////////

function sortObject(lobj, robj) {
  const sorted = {};

  if (typeof lobj !== "object") return lobj;

  Object.keys(robj).forEach(key => {
    const ltype = typeof lobj[key];

    if (ltype === 'undefined') {
      // skip
    } else if (ltype === 'object') {
      if (Array.isArray(lobj[key])) {
        sorted[key] = [];

        lobj[key].forEach((v, k) => {
          if (robj[key][k]) {
            sorted[key].push(sortObject(v, robj[key][k]));
          } else {
            sorted[key].push(v);
          }
        });
      } else {
        sorted[key] = sortObject(lobj[key], robj[key]);
      }
    } else {
      sorted[key] = lobj[key];
    }
  });

  return sorted;
}

$body.on('click', '#sort_left', () => {
  const before = JSON.parse($('#before').val());
  const after = JSON.parse($('#after').val());
  const $patch = $('#patch');

  const sorted = sortObject(before, after);

  $patch.val(JSON.stringify(sorted, null, 2));
});

///////////////////////////////
// Check for updates
///////////////////////////////

async function checkForUpdates() {
  const url = 'latest.json';

  clearTimeout(checkForUpdatesTO);

  try {
    const response = await fetch(`${url}?${Date.now()}`);

    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();

    if (result.post && result.post.id !== newsId) {
      console.log('News IDs do not match, refreshing...');
      newsId = result.post.id;
      $newsTitle.text(result.post.title);
      $newsExerpt.html(result.post.excerpt);
      MicroModal.show('modal-news');
    }

    checkForUpdatesTO = setTimeout(checkForUpdates, 1000 * 60 * 10);
  } catch (error) {
    console.error(error.message);
  }
}

let checkForUpdatesTO = null;
const $news = $('#news');
let newsId = $news.data('news-id');

const $newsTitle = $('#modal-news-title');
const $newsExerpt = $('#modal-news-excerpt');

$('#refresh').on('click', () => {
  window.location.reload(true);
});

window.addEventListener("focus", function(event) {
  checkForUpdates();
});

checkForUpdates();

///////////////////////////////
// Cheat/debug code
///////////////////////////////

const code = 'cheater';
let typed = '';

$body.on('keydown', (e) => {
  typed += e.key;

  if (typed === code) {
    if ($body.is('.public')) {
      localStorage.setItem('ischeater', 'true');
      $body.removeClass('public');
    } else {
      localStorage.setItem('ischeater', 'false');
      $body.addClass('public');
    }
  } else if (code.indexOf(typed) === 0) {
    // typing code
  } else {
    // not typing code
    typed = '';
  }
});

const ischeater = localStorage.getItem('ischeater');

if (ischeater === 'true') {
  $body.removeClass('public');
} else if (ischeater === 'false') {
  $body.addClass('public');
}
///////////////////////////////
// On page load
///////////////////////////////

updateProps();
$.checkToggles();

})(window.jQuery);