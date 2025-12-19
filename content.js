(async function() {
  // Reset stop flag
  window.OJ_SCRAPER_STOP = false;

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const log = (msg) => {
    console.log(`[OJ-Scraper] ${msg}`);
    chrome.runtime.sendMessage({ type: 'progress', text: msg });
  };

  const sendComplete = (data, regionCount) => {
    console.log('[OJ-Scraper] Complete!', data);
    chrome.runtime.sendMessage({ type: 'complete', data, regionCount });
  };

  const sendStopped = (data) => {
    console.log('[OJ-Scraper] Stopped!', data);
    chrome.runtime.sendMessage({ type: 'stopped', data });
  };

  const sendError = (text) => {
    console.error('[OJ-Scraper] Error:', text);
    chrome.runtime.sendMessage({ type: 'error', text });
  };

  // Check if stop was requested
  const shouldStop = () => window.OJ_SCRAPER_STOP === true;

  // Helper to simulate a real click (mousedown + mouseup + click)
  const simulateClick = (element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const mouseDownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y
    });

    const mouseUpEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y
    });

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y
    });

    element.dispatchEvent(mouseDownEvent);
    element.dispatchEvent(mouseUpEvent);
    element.dispatchEvent(clickEvent);
  };

  // Helper to wait for an element to appear
  const waitForElement = async (selector, maxWait = 3000) => {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const el = document.querySelector(selector);
      if (el) return el;
      await delay(100);
    }
    return null;
  };

  // Helper to open dropdown and get listbox
  const openDropdownAndGetListbox = async (regionInput, dropdownButton) => {
    log('  -> Focusing input...');
    regionInput.focus();
    await delay(100);

    log('  -> Clicking dropdown button...');
    if (dropdownButton) {
      simulateClick(dropdownButton);
    } else {
      simulateClick(regionInput);
    }
    await delay(300);

    log('  -> Waiting for listbox...');
    let listbox = await waitForElement('[role="listbox"]', 2000);

    if (!listbox) {
      log('  -> Listbox not found, trying input click...');
      simulateClick(regionInput);
      await delay(500);
      listbox = document.querySelector('[role="listbox"]');
    }

    if (!listbox) {
      log('  -> Still no listbox, trying arrow key...');
      regionInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await delay(500);
      listbox = document.querySelector('[role="listbox"]');
    }

    return listbox;
  };

  try {
    log('=== OddsJam Region Scraper Starting ===');

    log('Step 1: Looking for region dropdown input...');
    const regionInput = document.querySelector('input[role="combobox"]');
    if (!regionInput) {
      sendError('Could not find region dropdown (input[role="combobox"])');
      return;
    }
    const initialRegion = regionInput.placeholder;
    log(`Step 1: Found region input (current: "${initialRegion}")`);

    log('Step 2: Finding dropdown button...');
    const dropdownButton = document.querySelector('button[aria-haspopup="listbox"]');
    log(`Step 2: Dropdown button ${dropdownButton ? 'found' : 'NOT found'}`);

    log('Step 3: Opening dropdown to get region list...');
    const listbox = await openDropdownAndGetListbox(regionInput, dropdownButton);

    if (!listbox) {
      sendError('Could not find region listbox after multiple attempts.');
      return;
    }
    log('Step 3: Listbox found!');

    // Get all region options
    const allOptions = Array.from(listbox.querySelectorAll('[role="option"]'));
    log(`Step 3: Found ${allOptions.length} option elements`);

    // Extract region names from the text content
    const regionNames = allOptions.map(opt => {
      const span = opt.querySelector('span');
      if (span) {
        // Get text content, excluding nested elements (like checkmark divs)
        let text = '';
        for (const child of span.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            text += child.textContent;
          }
        }
        return text.trim();
      }
      return '';
    }).filter(name => name && name.length > 0);

    log(`Step 3: Extracted ${regionNames.length} region names`);
    log(`Step 3: Regions: ${regionNames.slice(0, 8).join(', ')}...`);

    // Close dropdown
    log('Step 4: Closing dropdown...');
    document.body.click();
    await delay(500);

    const results = {};

    for (let i = 0; i < regionNames.length; i++) {
      // Check for stop request
      if (shouldStop()) {
        log('=== STOPPED BY USER ===');

        // Auto-download partial CSV
        if (Object.keys(results).length > 0) {
          log(`Downloading partial results (${Object.keys(results).length} regions)...`);
          let csv = 'region,sportsbook\n';
          for (const [region, books] of Object.entries(results)) {
            for (const book of books) {
              csv += `"${region}","${book}"\n`;
            }
          }
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'region_books_partial.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        sendStopped(results);
        return;
      }

      const regionName = regionNames[i];
      log(`\n=== Region ${i + 1}/${regionNames.length}: ${regionName} ===`);

      // Step A: Open dropdown
      log(`[${regionName}] A: Opening dropdown...`);
      const currentListbox = await openDropdownAndGetListbox(regionInput, dropdownButton);

      if (!currentListbox) {
        log(`[${regionName}] A: ERROR - Could not open dropdown, skipping`);
        continue;
      }

      // Step B: Find and click the option
      log(`[${regionName}] B: Looking for option in list...`);
      const options = Array.from(currentListbox.querySelectorAll('[role="option"]'));

      const targetOption = options.find(opt => {
        const span = opt.querySelector('span');
        if (span) {
          let text = '';
          for (const child of span.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
              text += child.textContent;
            }
          }
          return text.trim() === regionName;
        }
        return false;
      });

      if (!targetOption) {
        log(`[${regionName}] B: ERROR - Could not find option, skipping`);
        document.body.click();
        await delay(300);
        continue;
      }

      // Scroll option into view and click with simulated events
      log(`[${regionName}] B: Found option, scrolling into view and clicking...`);
      targetOption.scrollIntoView({ block: 'center' });
      await delay(100);
      simulateClick(targetOption);
      await delay(1500); // Wait for page to update

      // Verify region changed
      const currentRegion = regionInput.placeholder;
      log(`[${regionName}] B: Region changed from "${initialRegion}" to "${currentRegion}"`);

      if (currentRegion !== regionName) {
        log(`[${regionName}] B: WARNING - Region did not change to expected value!`);
      }

      // Step C: Find and click filter button
      log(`[${regionName}] C: Looking for filter button...`);

      let filterButton = document.querySelector('.class-fake-filters-button');
      if (!filterButton) {
        const allButtons = document.querySelectorAll('button');
        for (const btn of allButtons) {
          if (btn.className && btn.className.includes('fake-filters-button')) {
            filterButton = btn;
            break;
          }
        }
      }

      if (!filterButton) {
        log(`[${regionName}] C: ERROR - Could not find filter button`);
        results[regionName] = [];
        continue;
      }

      log(`[${regionName}] C: Found filter button, clicking...`);
      simulateClick(filterButton);
      await delay(1000);

      // Step D: Extract sportsbooks
      log(`[${regionName}] D: Looking for sportsbooks grid...`);

      const sportsbooks = [];
      const regionGrid = document.querySelector('.grid.grid-cols-1.gap-2.mb-8');

      if (regionGrid) {
        log(`[${regionName}] D: Found region grid`);
        const nameElements = regionGrid.querySelectorAll('p.font-bold');
        log(`[${regionName}] D: Found ${nameElements.length} sportsbook elements`);

        nameElements.forEach(el => {
          const name = el.textContent.trim();
          if (name && !sportsbooks.includes(name)) {
            sportsbooks.push(name);
          }
        });
      } else {
        log(`[${regionName}] D: WARNING - No region grid found`);
      }

      results[regionName] = sportsbooks;
      log(`[${regionName}] D: Scraped ${sportsbooks.length} sportsbooks`);
      if (sportsbooks.length > 0) {
        log(`[${regionName}] D: Books: ${sportsbooks.slice(0, 5).join(', ')}${sportsbooks.length > 5 ? '...' : ''}`);
      }

      // Step E: Close drawer
      log(`[${regionName}] E: Closing drawer...`);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      await delay(300);
      document.body.click();
      await delay(500);
    }

    log(`\n=== COMPLETE ===`);
    log(`Scraped ${Object.keys(results).length} regions`);

    let totalBooks = 0;
    for (const region in results) {
      totalBooks += results[region].length;
    }
    log(`Total sportsbooks entries: ${totalBooks}`);

    // Auto-download CSV
    log(`Generating CSV and downloading...`);
    let csv = 'region,sportsbook\n';
    for (const [region, books] of Object.entries(results)) {
      for (const book of books) {
        csv += `"${region}","${book}"\n`;
      }
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'region_books.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    log(`CSV downloaded as region_books.csv`);

    sendComplete(results, Object.keys(results).length);

  } catch (err) {
    sendError(err.message + '\n' + err.stack);
  }
})();
