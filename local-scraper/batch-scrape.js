#!/usr/bin/env node

const LocalMercadoLibreScraper = require('./scraper.js');
const fs = require('fs').promises;
const path = require('path');

class BatchScraper {
    constructor(options = {}) {
        this.delay = options.delay || 5000; // 5 seconds between different searches
        this.maxPages = options.maxPages || null;
        this.outputDir = options.outputDir || './batch-results';
        this.uploadToCloudflare = options.uploadToCloudflare !== false;
        this.results = [];
    }

    async init() {
        await fs.mkdir(this.outputDir, { recursive: true });
        console.log(`📁 Batch results will be saved to: ${this.outputDir}`);
    }

    async scrapeCarModels(carModels, options = {}) {
        await this.init();
        
        console.log(`🚀 Starting batch scraping for ${carModels.length} car models...`);
        console.log(`⏱️ Delay between searches: ${this.delay}ms`);
        
        for (let i = 0; i < carModels.length; i++) {
            const { brand, model } = carModels[i];
            
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔍 [${i + 1}/${carModels.length}] Scraping: ${brand} ${model}`);
            console.log(`${'='.repeat(60)}`);
            
            try {
                const scraper = new LocalMercadoLibreScraper({
                    maxPages: this.maxPages,
                    outputDir: path.join(this.outputDir, `${brand}-${model}`),
                    ...options
                });
                
                const result = await scraper.scrapeAndStore(brand, model, {
                    uploadToCloudflare: this.uploadToCloudflare
                });
                
                this.results.push({
                    brand,
                    model,
                    success: true,
                    totalCars: result.totalCars,
                    pagesScraped: result.pagesScraped,
                    scrapedAt: result.scrapedAt
                });
                
                console.log(`✅ Completed ${brand} ${model}: ${result.totalCars} cars found`);
                
                // Wait before next search (except for the last one)
                if (i < carModels.length - 1) {
                    console.log(`⏳ Waiting ${this.delay}ms before next search...`);
                    await new Promise(resolve => setTimeout(resolve, this.delay));
                }
                
            } catch (error) {
                console.error(`❌ Failed to scrape ${brand} ${model}:`, error.message);
                
                this.results.push({
                    brand,
                    model,
                    success: false,
                    error: error.message,
                    scrapedAt: new Date().toISOString()
                });
            }
        }
        
        await this.generateSummaryReport();
        return this.results;
    }

    async generateSummaryReport() {
        const summary = {
            totalSearches: this.results.length,
            successfulSearches: this.results.filter(r => r.success).length,
            failedSearches: this.results.filter(r => !r.success).length,
            totalCarsFound: this.results.reduce((sum, r) => sum + (r.totalCars || 0), 0),
            results: this.results,
            generatedAt: new Date().toISOString()
        };
        
        const summaryPath = path.join(this.outputDir, 'batch-summary.json');
        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 BATCH SCRAPING SUMMARY`);
        console.log(`${'='.repeat(60)}`);
        console.log(`✅ Successful searches: ${summary.successfulSearches}/${summary.totalSearches}`);
        console.log(`❌ Failed searches: ${summary.failedSearches}`);
        console.log(`🚗 Total cars found: ${summary.totalCarsFound}`);
        console.log(`📄 Summary saved to: ${summaryPath}`);
        
        if (summary.failedSearches > 0) {
            console.log(`\n❌ Failed searches:`);
            this.results.filter(r => !r.success).forEach(r => {
                console.log(`   - ${r.brand} ${r.model}: ${r.error}`);
            });
        }
    }
}

// Predefined car models for popular searches
const POPULAR_CAR_MODELS = [
    { brand: 'toyota', model: 'corolla' },
    { brand: 'toyota', model: 'yaris' },
    { brand: 'toyota', model: 'hilux' },
    { brand: 'ford', model: 'focus' },
    { brand: 'ford', model: 'fiesta' },
    { brand: 'ford', model: 'ranger' },
    { brand: 'chevrolet', model: 'cruze' },
    { brand: 'chevrolet', model: 'onix' },
    { brand: 'volkswagen', model: 'gol' },
    { brand: 'volkswagen', model: 'polo' },
    { brand: 'honda', model: 'civic' },
    { brand: 'honda', model: 'fit' },
    { brand: 'nissan', model: 'march' },
    { brand: 'nissan', model: 'sentra' },
    { brand: 'peugeot', model: '208' },
    { brand: 'peugeot', model: '307' },
    { brand: 'renault', model: 'clio' },
    { brand: 'renault', model: 'sandero' },
    { brand: 'fiat', model: 'palio' },
    { brand: 'fiat', model: 'uno' }
];

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node batch-scrape.js [options] [brand1 model1 brand2 model2 ...]');
        console.log('');
        console.log('Options:');
        console.log('  --popular         Scrape popular car models');
        console.log('  --max-pages=N     Limit to N pages per search');
        console.log('  --delay=MS        Delay between searches in ms (default: 5000)');
        console.log('  --no-upload       Skip uploading to Cloudflare');
        console.log('');
        console.log('Examples:');
        console.log('  node batch-scrape.js --popular');
        console.log('  node batch-scrape.js toyota yaris ford focus');
        console.log('  node batch-scrape.js --max-pages=2 --delay=3000 honda civic');
        process.exit(1);
    }

    const options = {};
    let carModels = [];
    let usePopular = false;
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--popular') {
            usePopular = true;
        } else if (arg.startsWith('--max-pages=')) {
            options.maxPages = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--delay=')) {
            options.delay = parseInt(arg.split('=')[1]);
        } else if (arg === '--no-upload') {
            options.uploadToCloudflare = false;
        } else if (!arg.startsWith('--')) {
            // Collect brand/model pairs
            if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                carModels.push({
                    brand: arg,
                    model: args[i + 1]
                });
                i++; // Skip next argument as it's the model
            }
        }
    }
    
    if (usePopular) {
        carModels = POPULAR_CAR_MODELS;
        console.log(`🔥 Using ${carModels.length} popular car models`);
    }
    
    if (carModels.length === 0) {
        console.error('❌ No car models specified. Use --popular or provide brand/model pairs.');
        process.exit(1);
    }
    
    const batchScraper = new BatchScraper(options);
    
    batchScraper.scrapeCarModels(carModels, options)
        .then(results => {
            const successful = results.filter(r => r.success).length;
            const totalCars = results.reduce((sum, r) => sum + (r.totalCars || 0), 0);
            
            console.log(`\n🎉 Batch scraping completed!`);
            console.log(`✅ ${successful}/${results.length} searches successful`);
            console.log(`🚗 ${totalCars} total cars scraped`);
        })
        .catch(error => {
            console.error('💥 Batch scraping failed:', error);
            process.exit(1);
        });
}

module.exports = BatchScraper; 