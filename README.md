# MercadoLibre Autos Scraper

A production-ready Cloudflare Workers scraper specifically designed for MercadoLibre's automotive section. Built to handle large-scale car listing extraction with anti-detection measures and KV storage.

## 🚀 Features

- **Infinite Search**: Scrape all available cars with pagination support
- **Auto-Store**: Automatically save results to KV storage
- **Bulk Retrieval**: Get all stored car collections at once
- **Anti-Detection**: Browser-like headers and rate limiting
- **Production Ready**: Deployed on Cloudflare Workers with KV storage
- **Comprehensive Data**: Extract car details, prices, images, seller info

## 📊 Current Database Status

As of latest update, we have **199 cars** stored across **4 collections**:
- **Toyota Yaris**: 96 cars (infinite search, 2 pages)
- **Honda Fit**: 96 cars (infinite search, 2 pages)  
- **Chevrolet Cruze**: 5 cars (limited search)
- **Ford Focus**: 2 cars (limited search)

## 🔗 Live API

**Base URL**: `https://ml-autos-scraper.rodrigoburdet.workers.dev`

### Endpoints

#### 1. Search Cars
```bash
GET /search-autos?brand={brand}&model={model}&limit={limit}&store={true/false}
```

**Parameters:**
- `brand` (required): Car brand (e.g., toyota, ford, honda)
- `model` (required): Car model (e.g., yaris, focus, fit)
- `limit` (optional): Number of cars to scrape
  - Default: `20`
  - Use `infinite` or `0` for unlimited scraping (scrapes ALL pages until no "Siguiente" button)
- `store` (optional): Auto-store results (`true`/`false`)

**Examples:**
```bash
# Basic search
curl "https://ml-autos-scraper.rodrigoburdet.workers.dev/search-autos?brand=toyota&model=yaris"

# Infinite search with auto-store (all pages)
curl "https://ml-autos-scraper.rodrigoburdet.workers.dev/search-autos?brand=honda&model=civic&limit=infinite&store=true"

# Limited search
curl "https://ml-autos-scraper.rodrigoburdet.workers.dev/search-autos?brand=ford&model=focus&limit=10"
```

#### 2. Store Cars
```bash
POST /store-cars
Content-Type: application/json

{
  "brand": "toyota",
  "model": "yaris", 
  "cars": [...]
}
```

#### 3. Get Stored Cars
```bash
GET /get-cars?brand={brand}&model={model}
```

#### 4. Get All Collections
```bash
GET /get-all-cars
```

#### 5. Debug HTML
```bash
GET /debug-html?brand={brand}&model={model}
```

## 🛠 Development Tools

### Node.js Client
```javascript
const client = require('./scripts/scraper-client.js');

// Search and auto-store
const result = await client.searchCars('toyota', 'corolla', 'infinite', true, 3);

// Get all collections
const collections = await client.getAllCars();
```

### Batch Processing
```bash
# Make executable
chmod +x scripts/batch-scrape.sh

# Run batch scraping
./scripts/batch-scrape.sh
```

## 📋 Response Format

### Search Response
```json
{
  "cars": [
    {
      "id": "1499874719",
      "title": "Toyota Yaris 1.5 107cv S Cvt",
      "price": {
        "currency": "US$",
        "amount": 30800
      },
      "year": 2025,
      "kilometers": 0,
      "location": "Buenos Aires",
      "link": "https://auto.mercadolibre.com.ar/MLA-1499874719-...",
      "thumbnail": "https://http2.mlstatic.com/D_Q_NP_2X_969564-...",
      "seller": {
        "type": "Concesionaria",
        "name": "Toyota Official"
      },
      "features": []
    }
  ],
  "search": {
    "brand": "toyota",
    "model": "yaris",
    "method": "infinite",
    "pagesScraped": 2,
    "executionTimeMs": 1592,
    "stats": {
      "carsFound": 96,
      "totalCarsBeforeDedup": 96,
      "duplicatesRemoved": 0
    }
  },
  "autoStore": {
    "success": true,
    "key": "toyota-yaris",
    "stored": 96,
    "lastUpdated": "2025-05-26T03:53:57.809Z"
  }
}
```

### Collections Response
```json
{
  "totalCollections": 4,
  "totalCars": 199,
  "collections": [
    {
      "key": "honda-fit",
      "brand": "honda", 
      "model": "fit",
      "count": 96,
      "lastUpdated": "2025-05-26T03:54:43.106Z",
      "cars": [...]
    }
  ]
}
```

## ⚡ Performance & Limits

- **Execution Time**: 15-second limit for infinite searches
- **Default Pages**: 3 pages max (configurable via `maxPages`)
- **Rate Limiting**: 200ms delay between pages
- **Deduplication**: Automatic removal of duplicate cars by ID
- **Resource Management**: Optimized for Cloudflare Workers limits

## 🏗 Architecture

```
src/
├── autos-scraper.js     # Main worker with infinite search
├── worker.js            # Legacy general scraper
scripts/
├── scraper-client.js    # Node.js client library
└── batch-scrape.sh      # Batch processing script
```

### Key Components

1. **MercadoLibreAutosScraper**: Core scraping class with car-specific logic
2. **HTMLRewriter**: Cloudflare's streaming HTML parser
3. **Infinite Search**: Pagination-based scraping with resource management
4. **KV Storage**: Persistent storage for car collections
5. **Anti-Detection**: Browser-like headers and respectful delays

## 🔧 Configuration

### wrangler.toml
```toml
name = "ml-autos-scraper"
main = "src/autos-scraper.js"
compatibility_date = "2024-06-01"

[[kv_namespaces]]
binding = "CAR_LISTINGS"
id = "677b8c8790fc44a58eaad0a3f2f89c3f"
```

## 🚀 Deployment

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Test deployment
curl "https://ml-autos-scraper.rodrigoburdet.workers.dev/search-autos?brand=toyota&model=yaris&limit=5"
```

## 📈 Usage Examples

### Scrape All Toyota Yaris (Infinite)
```bash
curl "https://ml-autos-scraper.rodrigoburdet.workers.dev/search-autos?brand=toyota&model=yaris&limit=infinite&store=true&maxPages=5"
```

### Get Specific Collection
```bash
curl "https://ml-autos-scraper.rodrigoburdet.workers.dev/get-cars?brand=honda&model=fit"
```

### View All Collections Summary
```bash
curl "https://ml-autos-scraper.rodrigoburdet.workers.dev/get-all-cars" | jq '.collections[] | {brand, model, count}'
```

## 🛡 Anti-Detection Features

- **Realistic Headers**: Full browser-like request headers
- **Rate Limiting**: Configurable delays between requests
- **User Agent**: Latest Chrome user agent string
- **Referer**: Proper referer headers
- **Connection Management**: Keep-alive and proper caching

## 📊 Monitoring

The scraper provides detailed metrics:
- Cars found per page
- Execution time tracking
- Deduplication statistics
- Storage success/failure rates
- Page scraping progress

## 🔄 Future Enhancements

- [ ] Advanced filtering (price range, year, etc.)
- [ ] Real-time notifications for new listings
- [ ] Historical price tracking
- [ ] Image analysis and classification
- [ ] Seller reputation scoring
- [ ] Geographic clustering of listings

---

**Built with ❤️ for efficient car market analysis** 