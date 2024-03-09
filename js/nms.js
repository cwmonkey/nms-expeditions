;(function() {

"use strict";

const $body = $(document.body);

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

  if (!onText) {
    onText = $el.text();
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

    $el.text(offText);
  } else {
    if (defaultHide) {
      $target.addClass('toggle-on');
      localStorage.setItem(name, 1);
    } else {
      $target.removeClass('toggle-off');
      localStorage.removeItem(name);
    }

    $el.text(onText);
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

  if (!onText) {
    onText = $el.text();
    $el.data('toggle-on-text', onText);
  }

  const show = localStorage.getItem(name);

  if (defaultHide) {
    if (show === '1') {
      toggle(el);
    } else {
      $el.text(offText);
    }
  } else {
    if (show === '0') {
      toggle(el);
      $el.text(offText);
    }
  }
});

///////////////////////////////
// Expedition Selection
///////////////////////////////

const $props = $('.cust_prop_input');
const $download = $('.download');
let exp = null;

$body.on('change', 'input[name="expeditions"]', (ev) => {
  const $checked = $('input[name="expeditions"]:checked');
  const id = $checked.data('json-id');
  exp = JSON.parse(document.getElementById(id).textContent);

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
    $defaultEl.text(defaultValue);
  });

  $download.removeAttr('disabled');
  updateDebug();
});

///////////////////////////////
// Expedition Customization
///////////////////////////////

let overrides = null;

function updateProps() {
  overrides = {};
  let hasUpdates = false;

  $props.each((index, el) => {
    const $el = $(el);
    const $row = $el.closest('.cust_item');
    let value = $el.val();
    const property = $el.attr('name');
    const subproperty = $el.data('subprop');
    const parentProperty = $el.data('parentprop');
    let obj = overrides;
    const storageName = 'property-' + property;

    if (value === '') {
      $row.removeClass('filled');
      localStorage.removeItem(storageName);
      return;
    }

    $row.addClass('filled');
    localStorage.setItem(storageName, value);

    if (value === 'true') value = true;
    if (value === 'false') value = false;
    if (/[0-9]+/.test(value)) value = parseInt(value);
    if (/[0-9.]+/.test(value)) value = parseFloat(value);

    hasUpdates = true;

    if (parentProperty) {
      if (typeof overrides[parentProperty] === 'undefined') overrides[parentProperty] = {};
      obj = overrides[parentProperty];
    }

    if (subproperty) {
      if (typeof obj[property] === 'undefined') obj[property] = {};
      obj[property][subproperty] = value;
    }  else {
      obj[property] = value;
    }
  });

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

///////////////////////////////
// Download
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

$download.on('click', () => {
  if (!exp) return;
  const merged = fix(exp, overrides || {});
  download('SEASON_DATA_CACHE.JSON', JSON.stringify(merged, null, 2).replace('{', '{' + "\n" + '  "_generatedBy": "Generated by https://cwmonkey.github.io/nms-expeditions/",'));
});

///////////////////////////////
// Debug
///////////////////////////////

const $debugPanel = $('.debug_panel');

function updateDebug() {
  $debugPanel.text('// Expedition JSON overrides:' + "\n" + JSON.stringify(overrides, null, 2));
}

///////////////////////////////
// On page load
///////////////////////////////

updateProps();

})();