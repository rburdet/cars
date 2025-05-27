# Project Structure

## MercadoLibre Autos Scraper

A clean, production-ready Cloudflare Workers scraper for MercadoLibre's automotive section.

```
merk2-scrapper/
├── src/
│   └── autos-scraper.js          # Main Cloudflare Worker (production)
├── scripts/
│   └── scraper-client.js         # Node.js client for programmatic access
├── wrangler.toml                 # Cloudflare Workers configuration
├── package.json                  # Node.js dependencies
├── README.md                     # Main documentation
├── PROJECT_STRUCTURE.md          # This file
└── .gitignore                    # Git ignore patterns
```

## Core Files

### `src/autos-scraper.js`
- **Purpose**: Main Cloudflare Worker with infinite search capability
- **Features**: 
  - Infinite pagination with "Siguiente" button detection
  - Auto-store functionality to KV storage
  - CPU-optimized processing
  - Anti-detection measures
- **Endpoints**: `/search-autos`, `/store-cars`, `/get-cars`, `/get-all-cars`, `/debug-html`

### `scripts/scraper-client.js`
- **Purpose**: Node.js client for programmatic access to the API
- **Features**: 
  - Promise-based API calls
  - Built-in error handling
  - Support for all scraper endpoints

### `wrangler.toml`
- **Purpose**: Cloudflare Workers deployment configuration
- **Contains**: KV namespace bindings, worker settings

## Deployment

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Test locally
wrangler dev
```

## API Usage

```bash
# Basic search
curl "https://ml-autos-scraper.rodrigoburdet.workers.dev/search-autos?brand=toyota&model=yaris"

# Infinite search with auto-store
curl "https://ml-autos-scraper.rodrigoburdet.workers.dev/search-autos?brand=honda&model=civic&limit=infinite&store=true"

# Get all stored collections
curl "https://ml-autos-scraper.rodrigoburdet.workers.dev/get-all-cars"
```

## Cleaned Up

The following directories and files were removed during cleanup:
- `debug/` - Large HTML/PNG debug files
- `data/` - Test JSON files
- `src/worker.js` - Legacy general scraper
- `src/index.js` - Unused index file
- `src/storage-kv.js` - Separate storage file (integrated into main)
- `src/utils/` - Legacy utility functions
- `src/scraper/` - Legacy scraper modules
- `src/models/` - Empty models directory
- `test-worker.js` - Root test file

## Live API

**Production URL**: https://ml-autos-scraper.rodrigoburdet.workers.dev 