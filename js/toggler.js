;(function($) {

"use strict";

///////////////////////////////
// Toggler
///////////////////////////////

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
      $target.removeClass('toggle-on');
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

$.checkToggles = function() {
  const $toggles = $('[data-toggler]');

  // set saved states
  $toggles.each((index, el) => {
    // TODO: DRY
    const $el = $(el);

    // Only run this once
    const toggleChecked = $el.data('toggleChecked');
    if (toggleChecked) return;
    $el.data('toggleChecked', true);

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
};

// bind clicks
$('body').on('click', '[data-toggler]', function() { // es5 because "this"
  toggle(this);
});

})(window.jQuery);
