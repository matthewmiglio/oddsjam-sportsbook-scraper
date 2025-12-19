chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'download') {
    const blob = new Blob([message.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: 'region_books.csv',
      saveAs: false
    }, (downloadId) => {
      URL.revokeObjectURL(url);
    });
  }
});
