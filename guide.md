were gonna make a chrome extension that scrapes information from https://oddsjam.com/betting-tools/arbitrage
this tool will follow a flow like this:

FOR EACH REGION:
1. find the region input element as shown here H:\my_files\my_programs\signature_web\oddsjam-region-scraper\extension\region_select_example_element.html
2. select a new region
3. find the filter button as shown in this file H:\my_files\my_programs\signature_web\oddsjam-region-scraper\extension\example_filter_button_element.html 
4. click that filter button to open the filter drawer
5. Find the sportsbooks list for this region as shown in this file H:\my_files\my_programs\signature_web\oddsjam-region-scraper\extension\example_region_sportsbooks_element.html
6. save that list of sportsbooks names to a file here H:\my_files\my_programs\signature_web\oddsjam-region-scraper\scrapes\region_books.csv

You should loop over ALL possible regions.
We're making a chrome extension that I will load manually.