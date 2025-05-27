#!/usr/bin/env node

/**
 * MercadoLibre Autos Scraper Client
 * Node.js client for programmatic access to the scraper API
 */

const https = require('https');
const fs = require('fs');

class MercadoLibreAutosClient {
  constructor(workerUrl = 'https://ml-autos-scraper.rodrigoburdet.workers.dev') {
    this.baseUrl = workerUrl;
  }

  /**
   * Make HTTP request
   */
  async request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      
      const requestOptions = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      const req = https.request(url, requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Search for cars
   */
  async searchCars(brand, model, options = {}) {
    const params = new URLSearchParams({
      brand,
      model,
      limit: options.limit || 20,
      ...(options.maxPages && { maxPages: options.maxPages }),
      ...(options.store && { store: 'true' })
    });

    return this.request(`/search-autos?${params}`);
  }

  /**
   * Store cars manually
   */
  async storeCars(brand, model, cars) {
    return this.request('/store-cars', {
      method: 'POST',
      body: { brand, model, cars }
    });
  }

  /**
   * Get cars for specific brand/model
   */
  async getCars(brand, model) {
    const params = new URLSearchParams({ brand, model });
    return this.request(`/get-cars?${params}`);
  }

  /**
   * Get all stored cars
   */
  async getAllCars() {
    return this.request('/get-all-cars');
  }

  /**
   * Batch scrape multiple brands/models
   */
  async batchScrape(brandsModels, options = {}) {
    const results = [];
    const delay = options.delay || 2000; // 2 seconds between requests
    
    console.log(`🚗 Starting batch scrape of ${brandsModels.length} brand/model combinations...`);
    
    for (let i = 0; i < brandsModels.length; i++) {
      const { brand, model } = brandsModels[i];
      
      try {
        console.log(`📡 Scraping ${brand} ${model} (${i + 1}/${brandsModels.length})...`);
        
        const result = await this.searchCars(brand, model, {
          limit: options.limit || 20,
          store: options.store !== false // Default to true
        });
        
        results.push({
          brand,
          model,
          success: true,
          carsFound: result.cars?.length || 0,
          stored: result.autoStore?.success || false,
          data: result
        });
        
        console.log(`✅ Found ${result.cars?.length || 0} cars for ${brand} ${model}`);
        
      } catch (error) {
        console.error(`❌ Failed to scrape ${brand} ${model}:`, error.message);
        results.push({
          brand,
          model,
          success: false,
          error: error.message
        });
      }
      
      // Rate limiting
      if (i < brandsModels.length - 1) {
        console.log(`⏳ Waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  /**
   * Export data to JSON file
   */
  async exportToFile(filename = 'cars-export.json') {
    try {
      const data = await this.getAllCars();
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`📁 Data exported to ${filename}`);
      return filename;
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      const data = await this.getAllCars();
      
      const stats = {
        totalCollections: data.totalCollections,
        totalCars: data.totalCars,
        brands: {},
        topModels: [],
        lastUpdated: data.retrievedAt
      };

      // Analyze by brand
      data.collections.forEach(collection => {
        if (!stats.brands[collection.brand]) {
          stats.brands[collection.brand] = {
            models: 0,
            totalCars: 0
          };
        }
        stats.brands[collection.brand].models++;
        stats.brands[collection.brand].totalCars += collection.count;
      });

      // Top models by car count
      stats.topModels = data.collections
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(c => ({
          brand: c.brand,
          model: c.model,
          count: c.count,
          lastUpdated: c.lastUpdated
        }));

      return stats;
    } catch (error) {
      console.error('❌ Failed to get stats:', error.message);
      throw error;
    }
  }
}

// CLI usage
if (require.main === module) {
  const client = new MercadoLibreAutosClient();
  const command = process.argv[2];

  async function main() {
    try {
      switch (command) {
        case 'search':
          const [, , , brand, model, limit] = process.argv;
          if (!brand || !model) {
            console.error('Usage: node scraper-client.js search <brand> <model> [limit]');
            process.exit(1);
          }
          const result = await client.searchCars(brand, model, { 
            limit: parseInt(limit) || 20,
            store: true 
          });
          console.log(JSON.stringify(result, null, 2));
          break;

        case 'get-all':
          const allCars = await client.getAllCars();
          console.log(JSON.stringify(allCars, null, 2));
          break;

        case 'stats':
          const stats = await client.getStats();
          console.log('📊 MercadoLibre Autos Statistics:');
          console.log(`   Total Collections: ${stats.totalCollections}`);
          console.log(`   Total Cars: ${stats.totalCars}`);
          console.log(`   Brands: ${Object.keys(stats.brands).length}`);
          console.log('\n🏆 Top Models:');
          stats.topModels.forEach((model, i) => {
            console.log(`   ${i + 1}. ${model.brand} ${model.model}: ${model.count} cars`);
          });
          break;

        case 'export':
          const filename = process.argv[3] || 'cars-export.json';
          await client.exportToFile(filename);
          break;

        case 'batch':
          // Popular Argentine car models
          const popularModels = [
            { brand: 'toyota', model: 'yaris' },
            { brand: 'toyota', model: 'corolla' },
            { brand: 'ford', model: 'focus' },
            { brand: 'ford', model: 'fiesta' },
            { brand: 'chevrolet', model: 'cruze' },
            { brand: 'volkswagen', model: 'gol' },
            { brand: 'fiat', model: 'argo' },
            { brand: 'honda', model: 'fit' }
          ];
          
          console.log('🚗 Starting batch scrape of popular models...');
          const batchResults = await client.batchScrape(popularModels, {
            limit: 15,
            delay: 2000
          });
          
          const successful = batchResults.filter(r => r.success).length;
          const totalCars = batchResults.reduce((sum, r) => sum + (r.carsFound || 0), 0);
          
          console.log(`\n📈 Batch Results:`);
          console.log(`   Successful: ${successful}/${batchResults.length}`);
          console.log(`   Total cars found: ${totalCars}`);
          break;

        case 'infinite':
          const [, , , infBrand, infModel] = process.argv;
          if (!infBrand || !infModel) {
            console.error('Usage: node scraper-client.js infinite <brand> <model>');
            process.exit(1);
          }
          const infResult = await client.searchCars(infBrand, infModel, { 
            limit: 'infinite',
            maxPages: 8,
            store: true 
          });
          console.log(`🚗 Infinite search completed:`);
          console.log(`   Cars found: ${infResult.cars.length}`);
          console.log(`   Pages scraped: ${infResult.search.pagesScraped}`);
          console.log(`   Execution time: ${infResult.search.executionTimeMs}ms`);
          console.log(`   Duplicates removed: ${infResult.search.stats.duplicatesRemoved}`);
          break;

        default:
          console.log('🚗 MercadoLibre Autos Scraper Client');
          console.log('\nUsage:');
          console.log('  node scraper-client.js search <brand> <model> [limit]');
          console.log('  node scraper-client.js infinite <brand> <model>');
          console.log('  node scraper-client.js get-all');
          console.log('  node scraper-client.js stats');
          console.log('  node scraper-client.js export [filename]');
          console.log('  node scraper-client.js batch');
          console.log('\nExamples:');
          console.log('  node scraper-client.js search toyota yaris 10');
          console.log('  node scraper-client.js infinite toyota yaris');
          console.log('  node scraper-client.js stats');
          console.log('  node scraper-client.js export my-cars.json');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  main();
}

module.exports = MercadoLibreAutosClient; 