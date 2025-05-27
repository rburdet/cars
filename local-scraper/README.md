# Local MercadoLibre Scraper

A powerful local Node.js scraper that uses Puppeteer to scrape MercadoLibre's automotive section and automatically uploads results to Cloudflare KV storage.

## 🚀 Features

- **Local Processing**: Runs on your machine, avoiding Cloudflare Worker CPU limits
- **Infinite Pagination**: Scrapes all available pages automatically
- **Auto-Upload**: Automatically uploads results to Cloudflare KV storage
- **Batch Processing**: Scrape multiple car models in sequence
- **Local Storage**: Saves results locally as JSON files
- **Anti-Detection**: Uses real browser with proper headers and delays
- **Robust Error Handling**: Continues processing even if individual searches fail

## 📋 Prerequisites

- Node.js 16+ installed
- Chrome/Chromium browser (for Puppeteer)
- Access to your Cloudflare Worker API

## 🛠️ Installation

```bash
cd local-scraper
npm install
```

This will install:
- `puppeteer` - For browser automation
- `node-fetch` - For API calls to Cloudflare

## 📖 Usage

### Single Car Model

```bash
# Basic usage
node scraper.js toyota yaris

# With options
node scraper.js toyota yaris --max-pages=5 --delay=3000

# Skip Cloudflare upload (local only)
node scraper.js honda civic --no-upload

# Run in visible browser mode (for debugging)
node scraper.js ford focus --no-headless
```

### Batch Processing

```bash
# Scrape popular car models (20 predefined models)
node batch-scrape.js --popular

# Scrape specific models
node batch-scrape.js toyota yaris ford focus honda civic

# Batch with options
node batch-scrape.js --max-pages=3 --delay=10000 toyota corolla nissan sentra
```

## ⚙️ Options

### Single Scraper Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-pages=N` | Limit to N pages | Infinite |
| `--delay=MS` | Delay between requests (ms) | 2000 |
| `--no-headless` | Run browser in visible mode | Headless |
| `--no-upload` | Skip Cloudflare upload | Upload enabled |

### Batch Scraper Options

| Option | Description | Default |
|--------|-------------|---------|
| `--popular` | Use 20 predefined popular models | Custom models |
| `--max-pages=N` | Limit to N pages per search | Infinite |
| `--delay=MS` | Delay between searches (ms) | 5000 |
| `--no-upload` | Skip Cloudflare upload | Upload enabled |

## 📁 Output Structure

```
local-scraper/
├── scraped-data/           # Single scraper output
│   └── toyota-yaris-2025-01-20.json
├── batch-results/          # Batch scraper output
│   ├── toyota-yaris/
│   │   └── toyota-yaris-2025-01-20.json
│   ├── ford-focus/
│   │   └── ford-focus-2025-01-20.json
│   └── batch-summary.json  # Summary of all batch results
```

## 📊 Data Format

Each scraped result contains:

```json
{
  "query": "toyota yaris",
  "brand": "toyota",
  "model": "yaris",
  "totalCars": 156,
  "pagesScraped": 4,
  "scrapedAt": "2025-01-20T10:30:00.000Z",
  "cars": [
    {
      "id": "1234567890",
      "title": "Toyota Yaris 1.5 107cv 2020",
      "price": "$ 15.500.000",
      "year": 2020,
      "kilometers": "45000",
      "location": "Capital Federal",
      "image": "https://...",
      "link": "https://auto.mercadolibre.com.ar/MLA-1234567890",
      "extractedAt": "2025-01-20T10:30:15.000Z"
    }
  ]
}
```

## 🔧 Configuration

### Cloudflare API URL

By default, the scraper uploads to:
```
https://ml-autos-scraper.rodrigoburdet.workers.dev
```

To change this, modify the `cloudflareApiUrl` in the scraper constructor or set it as an option.

### Custom Output Directory

```javascript
const scraper = new LocalMercadoLibreScraper({
    outputDir: './my-custom-output'
});
```

## 🚗 Popular Car Models

The batch scraper includes 20 popular Argentine car models:

- Toyota: Corolla, Yaris, Hilux
- Ford: Focus, Fiesta, Ranger  
- Chevrolet: Cruze, Onix
- Volkswagen: Gol, Polo
- Honda: Civic, Fit
- Nissan: March, Sentra
- Peugeot: 208, 307
- Renault: Clio, Sandero
- Fiat: Palio, Uno

## 📈 Performance

### Advantages over Cloudflare Worker

- **No CPU limits**: Can run for hours without timeout
- **Better browser support**: Full Chrome/Chromium with all features
- **More memory**: Can handle large datasets
- **Debugging**: Can run in visible mode to see what's happening
- **Persistence**: Results saved locally even if upload fails

### Typical Performance

- **Single page**: ~3-5 seconds
- **Full search**: 2-10 minutes (depending on results)
- **Batch processing**: 1-3 hours for all popular models

## 🛡️ Anti-Detection Features

- Real Chrome browser (not headless detection)
- Proper user agent and viewport
- Random delays between requests
- Network idle waiting
- Proper page load waiting

## 🔍 Troubleshooting

### Common Issues

1. **Puppeteer installation fails**
   ```bash
   # Try installing Chromium manually
   npx puppeteer browsers install chrome
   ```

2. **No cars found**
   - Check if the brand/model URL exists on MercadoLibre
   - Try running with `--no-headless` to see what's happening

3. **Upload to Cloudflare fails**
   - Check if your Cloudflare Worker is running
   - Verify the API URL is correct
   - Use `--no-upload` to test scraping only

4. **Browser crashes**
   - Reduce `--max-pages` to limit memory usage
   - Increase `--delay` to reduce load

### Debug Mode

Run with visible browser to debug:
```bash
node scraper.js toyota yaris --no-headless
```

## 🔗 Integration

### Programmatic Usage

```javascript
const LocalMercadoLibreScraper = require('./scraper.js');

const scraper = new LocalMercadoLibreScraper({
    maxPages: 5,
    delay: 3000,
    outputDir: './my-results'
});

const result = await scraper.scrapeAndStore('toyota', 'yaris');
console.log(`Found ${result.totalCars} cars`);
```

### Batch Processing

```javascript
const BatchScraper = require('./batch-scrape.js');

const batchScraper = new BatchScraper({
    maxPages: 3,
    delay: 5000
});

const carModels = [
    { brand: 'toyota', model: 'yaris' },
    { brand: 'ford', model: 'focus' }
];

const results = await batchScraper.scrapeCarModels(carModels);
```

## 📝 License

MIT License - feel free to use and modify as needed.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 