# OddsJam Region Scraper Chrome Extension

Scrapes sportsbook availability per US region from OddsJam's arbitrage tool.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select this `extension` folder

## Usage

1. Navigate to https://oddsjam.com/betting-tools/arbitrage
2. Make sure you're logged in (if required)
3. Click the extension icon in Chrome toolbar
4. Click **Start Scraping**
5. Wait for the scraper to cycle through all regions (this may take a few minutes)
6. When complete, click **Download CSV**

## Output

The extension downloads a CSV file named `region_books.csv` to your Downloads folder.

Format:
```csv
region,sportsbook
Arizona,Novig
Arizona,DraftKings
Arkansas,BetMGM
...
```

Move the file to `../scrapes/region_books.csv` if needed.

## Troubleshooting

- **"Could not find region dropdown"**: Make sure you're on the arbitrage page and the page has fully loaded
- **Scraping seems stuck**: The page may have changed. Try refreshing and starting again
- **Missing sportsbooks**: Some regions may have no legal sportsbooks

## Files

- `manifest.json` - Extension configuration
- `popup.html` / `popup.js` - Extension popup UI
- `content.js` - Main scraping logic
- `background.js` - Handles file downloads
