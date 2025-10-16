((exports) => {

///////////////////////////////
// Download Fake File
///////////////////////////////

// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server

function download(data, fileName) {
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

///////////////////////////////
// escape strings for use with variable regex creation
///////////////////////////////

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

///////////////////////////////
// Enable/disable button
///////////////////////////////

function disableButton($el) {
  $el.prop('disabled', true).addClass('disabled');
}

function enableButton($el) {
  $el.prop('disabled', false).removeClass('disabled');
}

///////////////////////////////
// Expose Utils
///////////////////////////////

exports.download = download;
exports.escapeRegExp = escapeRegExp;
exports.disableButton = disableButton;
exports.enableButton = enableButton;

})(window.exports = window.exports || {});