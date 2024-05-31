;(function() {

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
  for (var prop in fixer) {
    if (fixer[prop] === '[[removed]]') {
      // remove property
      delete target[prop];
    } else if (fixer[prop] === null) {
      // skip
    } else if (typeof target[prop] === 'undefined') {
      // doesn't exist in source, add the whole thing
      target[prop] = fixer[prop];
    } else if (typeof target[prop] === 'object') {
      // objet or array, pass it on
      target[prop] = recursiveFix(target[prop], fixer[prop])
    } else {
      // not an object, add the value
      target[prop] = fixer[prop];
    }
  }

  return target;
}

///////////////////////////////
// Toggler
///////////////////////////////

const $toggles = $('[data-toggler]');

function toggle(el) {
  const $el = $(el);
  const name = 'toggle-' + $el.data('toggle-name');
  const hideText = $el.data('toggle-off-text');
  let onText = $el.data('toggle-on-text');
  const offText = $el.data('toggle-off-text');
  const $target = $($el.data('toggle-target'));
  const defaultHide = $target.data('toggle-default') === 'off';
  const showing = defaultHide ? $target.is('.toggle-on') : !$target.is('.toggle-off');
  const textTarget = $el.data('toggle-text-target');
  const $text = textTarget ? $(textTarget) : $el;

  if (!onText) {
    onText = $text.text();
    $el.data('toggle-on-text', onText);
  }

  if (showing) {
    if (defaultHide) {
      $target.removeClass('toggle-on');
      localStorage.removeItem(name);
    } else {
      $target.addClass('toggle-off');
      localStorage.setItem(name, 0);
    }

    $text.text(offText);
  } else {
    if (defaultHide) {
      $target.addClass('toggle-on');
      localStorage.setItem(name, 1);
    } else {
      $target.removeClass('toggle-off');
      localStorage.removeItem(name);
    }

    $text.text(onText);
  }
}

// bind clicks
$body.on('click', '[data-toggler]', function() { // es5 because "this"
  toggle(this);
});

// set saved states
$toggles.each((index, el) => {
  // TODO: DRY
  const $el = $(el);
  const name = 'toggle-' + $el.data('toggle-name');
  const hideText = $el.data('toggle-off-text');
  let onText = $el.data('toggle-on-text');
  const offText = $el.data('toggle-off-text');
  const $target = $($el.data('toggle-target'));
  const defaultHide = $target.data('toggle-default') === 'off';
  const showing = defaultHide ? $target.is('.toggle-on') : !$target.is('.toggle-off');
  const textTarget = $el.data('toggle-text-target');
  const $text = textTarget ? $(textTarget) : $el;

  if (!onText) {
    onText = $el.text();
    $el.data('toggle-on-text', onText);
  }

  const show = localStorage.getItem(name);

  if (defaultHide) {
    if (show === '1') {
      toggle(el);
    } else {
      $text.text(offText);
    }
  } else {
    if (show === '0') {
      toggle(el);
      $text.text(offText);
    }
  }
});

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
  updatePatches(expId);
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

    console.log(id, diff);

    if (JSON.stringify(diff) === '{}') {
      $('.cust_preset[data-id="' + id + '"]').addClass('selected');
      break;
    }
  }

  if (!hasUpdates) {
    overrides = null;
  }

  updateDebug();
}

$body.on('input', '.cust_prop_input', updateProps);

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
function updatePatches(pExpId) {
  const $selecteds = $('.patch_check[data-exp-id="' + pExpId + '"]:checked');
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
  const pExpId = $el.data('exp-id');
  const name = $el.attr('name');
  const jsonId = $el.attr('value');

  if (jsonId) {
    localStorage.setItem('patch-' + name, jsonId);
  } else {
    localStorage.removeItem('patch-' + name);
  }

  updatePatches(pExpId);
});

// load patch selections
$('.patch_check').each((index, el) => {
  const $el = $(el);
  const name = $el.attr('name');
  const value = $el.val();
  const sValue = localStorage.getItem('patch-' + name);

  if (sValue === value) {
    $el.prop('checked', true);
  }
});

///////////////////////////////
// Download
///////////////////////////////

$download.on('click', () => {
  if (!exp) return;
  let merged = fix(exp, overrides || {});

  if (patches) {
    patches.forEach((patch) => {
      merged = fix(merged, patch);
    })
  }

  download('SEASON_DATA_CACHE.JSON', JSON.stringify(merged, null, 2).replace('{', '{' + "\n" + '  "_generatedBy": "Generated by https://cwmonkey.github.io/nms-expeditions/ (Original files from Leodium & /)",'));
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
}

function addNode(prop, value, parent) {
  parent[prop] = value;
}

///////////////////////////////
// On page load
///////////////////////////////

updateProps();

})();