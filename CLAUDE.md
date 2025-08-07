# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome browser extension called "IMDB W2W: IMDB Where to Watch" that enhances IMDB pages by displaying streaming service information. When users hover over movie titles on IMDB, the extension shows available streaming options with prices and provider icons via a floating popup.

## Architecture

### Core Components

- **manifest.json**: Chrome extension configuration with permissions for IMDB and JustWatch domains
- **scripts/content.js**: Content script that runs on IMDB pages, handles UI interactions and hover events
- **scripts/scrape.js**: Background service worker that fetches and parses streaming data from JustWatch
- **jw_sample_page.html**: Sample JustWatch page used for testing/development (currently used instead of live requests)
- **lib/**: Vendored dependencies for HTML parsing and text entity handling
  - parse5.min.js: HTML parser for processing JustWatch pages
  - entities_decode/escape.min.js: Text entity handling utilities

### Data Flow

1. User hovers over movie title on IMDB page
2. Content script extracts movie title and year, establishes port connection to background script
3. Background script fetches JustWatch data (currently from sample file, not live API)
4. Background script parses HTML using parse5 and extracts streaming offers by category
5. Content script receives offer data and creates styled popup with provider icons and pricing
6. Popup displays streaming options organized by categories: stream, rent, buy

### Key Functions

- **extractMovieTitle()**: Parses IMDB DOM to get clean movie title with year
- **showOffersPopup()**: Manages popup creation and display logic
- **findOffers()**: HTML parsing logic to extract streaming offers from JustWatch pages
- **createPopup()**: Builds styled popup DOM with streaming service information

## Development Notes

- Extension uses Manifest V3 with service worker architecture
- Currently fetches from local sample file instead of live JustWatch API (see line 17 in scrape.js)
- HTML parsing relies on specific JustWatch CSS classes like "buybox-row", "stream", "rent", "buy"
- Popup styling is inline CSS to avoid CSP issues with content scripts
- Uses Chrome's runtime.connect() for message passing between content and background scripts

## Testing

Load the extension in Chrome developer mode by pointing to the project directory. Test on IMDB pages like the Top 250 movies list where the extension targets elements with class `.ipc-metadata-list-summary-item`.