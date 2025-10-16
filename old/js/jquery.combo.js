(function($) {

let combos = [];

///////////////////////////////
// escape strings for use with variable regex creation
///////////////////////////////

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

///////////////////////////////
// Recursively <mark> search strings
///////////////////////////////

function markRecur(value, search, markRegFn, meta) {
  // Replaces are for searching the underscoreless keys, probably shouldn't be here
  let reg;
  if (markRegFn) {
    reg = markRegFn(search, meta);
  } else {
    reg = new RegExp('(.*?)(' + escapeRegExp(search) + ')(.*)', 'i');
  }

  const match = value.match(reg);

  if (!match) {
    return value;
  }

  const matches = Array.from(match);

  if (matches[3]) {
    matches[3] = markRecur(matches[3], search, markRegFn, meta);
  }

  return matches[1] + '<mark>' + matches[2] + '</mark>' + matches[3];
}

///////////////////////////////
// Constrain dropdowns to viewport
///////////////////////////////

/* Many assumptions:

* max-height, min-height, max-width, min-width set and in px
* prefer bottom left of input
  then top left, right, left, over

*/

// https://stackoverflow.com/questions/13382516/getting-scroll-bar-width-using-javascript

function getScrollbarWidth() {
  // Creating invisible container
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll'; // forcing scrollbar to appear
  outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
  document.body.appendChild(outer);

  // Creating inner element and placing it in the container
  const inner = document.createElement('div');
  outer.appendChild(inner);

  // Calculating difference between container's full width and the child width
  const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);

  // Removing temporary elements from the DOM
  outer.parentNode.removeChild(outer);

  return scrollbarWidth;
}

function getStyles(el, styleProps) {
  const defaultView = (el.ownerDocument || document).defaultView;
  const props = {};

  styleProps.forEach((styleProp) => {
    props[styleProp] = defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
  });

  return props;
}

function getViewportProps() {
  let width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  let height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  let x = window.scrollX;
  let y = window.scrollY;

  return {
    width: width,
    height: height,
    x: x,
    y: y
  };
}

const scrollbarWidth = getScrollbarWidth();

// move dropdowns
function adjust($el, vp) {
  const $dropdown = $el.data('combo.$dropdown');
  const props = getStyles($dropdown[0], [
    'display',
    'min-height',
    'max-height',
    'min-width',
    'max-width'
  ]);
  const display = props['max-height'];
  if (display === 'none') return;

  const el = $el[0];
  const vpOffset = el.getBoundingClientRect();
  const elTop = vpOffset.top;
  const elLeft = vpOffset.left;
  const elHeight = el.offsetHeight;
  const elWidth = el.offsetWidth;
  const vpHeight = vp.height - scrollbarWidth;
  const vpWidth = vp.width - scrollbarWidth;
  const maxHeight = parseInt(props['max-height']);
  const maxWidth = parseInt(props['max-width']);
  const minHeight = parseInt(props['min-height']);
  const minWidth = parseInt(props['min-width']);

  let newLeft = elLeft;
  let newWidth = maxWidth;
  let newHeight = maxHeight;

  const css = {};

  if (newLeft + newWidth > vpWidth) newWidth = maxWidth - ((newLeft + maxWidth) - vpWidth);
  if (newWidth < minWidth) newWidth = minWidth;
  if (newLeft + newWidth > vpWidth) newLeft = elLeft - ((newLeft + newWidth) - vpWidth);
  if (newLeft < 0) newLeft = 0;

  css.left = newLeft + 'px';
  css.width = newWidth + 'px';

  if (vpHeight - (elTop + elHeight) < maxHeight && elTop >= maxHeight) {
    css.top = '';
    let newBottom = vpHeight - elTop + elHeight;

    if (newBottom + newHeight > vpHeight) newHeight = vpHeight - (vpHeight - elTop);
    if (newHeight < minHeight) newBottom = vpHeight - minHeight;

    css.bottom = newBottom;
  } else {
    css.bottom = '';
    let newTop = elTop + elHeight;

    if (newTop + newHeight > vpHeight) newHeight = maxHeight - ((newTop + maxHeight) - vpHeight);
    if (newHeight < minHeight) newHeight = minHeight;
    if (newTop + newHeight > vpHeight) newTop = elTop - ((newTop + newHeight) - vpHeight);
    if (newTop < 0) newTop = 0;

    css.top = newTop + 'px';
  }

  css.height = newHeight + 'px';

  // console.log(`vpHeight: ${vpHeight}, elTop: ${elTop}, elHeight: ${elHeight}, maxHeight: ${maxHeight}`, css);
  // console.log(`newLeft: ${newLeft}, newWidth: ${newWidth}, vpWidth: ${vpWidth}`, css);

  $dropdown.css(css);
}

function adjustCombos() {
  const vp = getViewportProps();

  combos.forEach(($el) => {
    adjust($el, vp);
  });
}

// on scroll/resize
$(window).on('scroll', adjustCombos);
$(window).on('resize', adjustCombos);

///////////////////////////////
// Plugin
///////////////////////////////

$.fn.combo = function(options) {
  const $this = this.attr('data-combo', true);
  combos.push($this);
  const $value = $(options.value || $this.data('combo-value-selector'));
  const $dropdown = $(options.dropdown || $this.data('combo-dropdown-selector'));
  const $count = $(options.count || $this.data('combo-count-selector'));
  const $showing = $(options.showing || $this.data('combo-showing-selector'));
  const markRegFn = options.markRegFn || null;
  const getResult = options.getResult;

  $this.data({
    'combo.$combo': $this,
    'combo.$value': $value,
    'combo.$dropdown': $dropdown,
    'combo.$count': $count,
    'combo.$showing': $showing
  });

  $dropdown.attr('data-combo-dropdown', true);

  $this.on('input', () => {
    const value = $this.val();
    const result = getResult(value);
    const {search, results, count, showing, meta} = result;

    $count.text(count);
    $showing.text(showing);
    $dropdown.empty();
    let buttons = [];
    let selected = false;

    for (k in results) {
      const value = results[k];
      const markedV = markRecur(value, search, markRegFn, meta);

      $button = $('<button type="button" data-combo-dropdown-item></button>')
        .html(markedV) // TODO: Going to assume we can trust HG, escape as a setting?
        .attr('title', k + ': ' + value)
        .data({
          'combo.$combo': $this,
          'combo.$value': $value,
          'combo.$dropdown': $dropdown,
          'combo.$count': $count,
          'combo.$showing': $showing,
          'combo.value': value,
          'combo.key': k
        });

      if (!selected) {
        $button.attr('data-combo-selected', true);
        selected = true;
      }

      buttons.push($button);
    }

    $dropdown.append(buttons).show();
    adjust($this, getViewportProps());
  });

  return this;
};

///////////////////////////////
// Combo item events
///////////////////////////////

// On page load
$(() => {
  $(document.body).on('click', '[data-combo-dropdown-item]', function() {
    const $this = $(this);
    const $combo = $this.data('combo.$combo');
    const $value = $this.data('combo.$value');
    const $dropdown = $this.data('combo.$dropdown');
    const $count = $this.data('combo.$count');
    const $showing = $this.data('combo.$showing');
    const value = $this.data('combo.value');
    const key = $this.data('combo.key');

    $combo.val(key);
    $value.html(value); // Going to assume we can trust HG
    $count.text('0');
    $showing.text('0');

    $dropdown.hide();
  }).on('keydown', '[data-combo]', function(ev) {
    const $this = $(this);
    const $dropdown = $this.data('combo.$dropdown');
    const $selected = $dropdown.find('[data-combo-selected]');

    if (!$selected.length) return;

    // Arrows
    if (ev.keyCode === 38 || ev.keyCode === 40) {
      ev.preventDefault();

      // Down
      if (ev.keyCode === 40) {
        $newEl = $selected.next();

        if (!$newEl.length) {
          $newEl = $selected.parent().find('[data-combo-dropdown-item]').first();
        }
      // Up
      } else {
        $newEl = $selected.prev();

        if (!$newEl.length) {
          $newEl = $selected.parent().find('[data-combo-dropdown-item]').last();
        }
      }

      $selected.removeAttr('data-combo-selected');
      $newEl.attr('data-combo-selected', true);
    // Enter
    } else if (ev.keyCode === 13) {
      ev.preventDefault();

      $selected.click();
    }
  });
})
}(jQuery));
