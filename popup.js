let scrapedData = null;
let currentTabId = null;

document.getElementById('startBtn').addEventListener('click', async () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');

  startBtn.disabled = true;
  startBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  statusDiv.textContent = 'Starting scrape...';
  statusDiv.className = 'progress';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;

    if (!tab.url.includes('oddsjam.com')) {
      statusDiv.textContent = 'Error: Please navigate to oddsjam.com/betting-tools/arbitrage first';
      statusDiv.className = 'error';
      startBtn.disabled = false;
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    chrome.runtime.onMessage.addListener(function listener(message) {
      if (message.type === 'progress') {
        statusDiv.textContent = message.text;
        statusDiv.className = 'progress';
      } else if (message.type === 'complete') {
        scrapedData = message.data;
        statusDiv.textContent = `Done! Scraped ${message.regionCount} regions.`;
        statusDiv.className = 'done';
        document.getElementById('downloadBtn').style.display = 'block';
        startBtn.disabled = false;
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        chrome.runtime.onMessage.removeListener(listener);
      } else if (message.type === 'stopped') {
        scrapedData = message.data;
        const count = Object.keys(message.data || {}).length;
        statusDiv.textContent = `Stopped. Scraped ${count} regions so far.`;
        statusDiv.className = 'stopped';
        if (count > 0) {
          document.getElementById('downloadBtn').style.display = 'block';
        }
        startBtn.disabled = false;
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        chrome.runtime.onMessage.removeListener(listener);
      } else if (message.type === 'error') {
        statusDiv.textContent = 'Error: ' + message.text;
        statusDiv.className = 'error';
        startBtn.disabled = false;
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        chrome.runtime.onMessage.removeListener(listener);
      }
    });

  } catch (err) {
    statusDiv.textContent = 'Error: ' + err.message;
    statusDiv.className = 'error';
    startBtn.disabled = false;
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
  }
});

document.getElementById('stopBtn').addEventListener('click', async () => {
  if (currentTabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        func: () => {
          window.OJ_SCRAPER_STOP = true;
        }
      });
    } catch (err) {
      console.error('Failed to stop:', err);
    }
  }
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!scrapedData) return;

  let csv = 'region,sportsbook\n';
  for (const [region, books] of Object.entries(scrapedData)) {
    for (const book of books) {
      csv += `"${region}","${book}"\n`;
    }
  }

  chrome.runtime.sendMessage({
    type: 'download',
    csv: csv
  });
});
