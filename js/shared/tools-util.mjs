// Enable/Disable a button
export function disableButton($el) {
  $el.prop('disabled', true).addClass('disabled');
}

export function enableButton($el) {
  $el.prop('disabled', false).removeClass('disabled');
}

// File upload reading helper
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

// chatGPT's version of the file downloader
export function downloadFile(data, fileName) {
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

