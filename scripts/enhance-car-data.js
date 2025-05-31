#!/usr/bin/env node

/**
 * Car Data Enhancement Script
 * Fetches existing car data from API and enhances it with detailed info from MercadoLibre listings
 */

const https = require('https');
const fs = require('fs');
const { URL } = require('url');
const zlib = require('zlib');

class CarDataEnhancer {
  constructor(workerUrl = 'https://ml-autos-scraper.rodrigoburdet.workers.dev') {
    this.baseUrl = workerUrl;
    this.delay = 3000; // 3 seconds between requests to avoid being banned
    this.maxRetries = 3;
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Make HTTP request with proper headers and gzip handling
   */
  async request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': options.isJson ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          ...options.headers
        }
      };

      const protocol = urlObj.protocol === 'https:' ? https : require('http');
      
      const req = protocol.request(requestOptions, (res) => {
        let data = [];
        
        res.on('data', (chunk) => {
          data.push(chunk);
        });
        
        res.on('end', () => {
          let buffer = Buffer.concat(data);
          
          // Handle gzip compression
          if (res.headers['content-encoding'] === 'gzip') {
            try {
              const decompressed = zlib.gunzipSync(buffer);
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                body: decompressed.toString()
              });
            } catch (err) {
              reject(new Error(`Gzip decompression failed: ${err.message}`));
            }
          } else if (res.headers['content-encoding'] === 'deflate') {
            try {
              const decompressed = zlib.inflateSync(buffer);
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                body: decompressed.toString()
              });
            } catch (err) {
              reject(new Error(`Deflate decompression failed: ${err.message}`));
            }
          } else if (res.headers['content-encoding'] === 'br') {
            try {
              const decompressed = zlib.brotliDecompressSync(buffer);
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                body: decompressed.toString()
              });
            } catch (err) {
              reject(new Error(`Brotli decompression failed: ${err.message}`));
            }
          } else {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: buffer.toString()
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * Get all cars from the API
   */
  async getAllCars() {
    console.log('🔄 Fetching current car data from API...');
    
    try {
      // First get stats to know total counts
      const statsResponse = await this.request(`${this.baseUrl}/api/cars/stats`, {
        isJson: true,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (statsResponse.statusCode !== 200) {
        console.error('Stats response body:', statsResponse.body.substring(0, 500));
        throw new Error(`Stats API returned status ${statsResponse.statusCode}`);
      }

      let statsData;
      try {
        statsData = JSON.parse(statsResponse.body);
      } catch (jsonError) {
        console.error('Failed to parse stats JSON response');
        console.error('Response body (first 500 chars):', statsResponse.body.substring(0, 500));
        throw new Error(`Invalid stats JSON response: ${jsonError.message}`);
      }

      console.log(`✅ Found ${statsData.totalCars} cars in ${statsData.totalCollections} collections`);
      
      // Get collections data
      const collections = statsData.collections.map(col => ({
        key: col.key,
        brand: col.brand,
        model: col.model,
        count: col.totalCars
      }));

      // Get all cars for the first collection (or specific one)
      if (collections.length > 0) {
        const firstCollection = collections[0];
        const carsResponse = await this.request(`${this.baseUrl}/api/cars/${firstCollection.brand}/${firstCollection.model}`, {
          isJson: true,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (carsResponse.statusCode !== 200) {
          throw new Error(`Cars API returned status ${carsResponse.statusCode}`);
        }

        const carsData = JSON.parse(carsResponse.body);
        
        return {
          totalCars: statsData.totalCars,
          totalCollections: statsData.totalCollections,
          collections: [{
            ...firstCollection,
            cars: carsData.cars
          }]
        };
      }

      return statsData;
    } catch (error) {
      console.error('❌ Failed to fetch car data:', error.message);
      throw error;
    }
  }

  /**
   * Clean MercadoLibre URL (remove everything after #)
   */
  cleanUrl(url) {
    return url.split('#')[0];
  }

  /**
   * Extract detailed information from MercadoLibre listing page
   */
  extractCarDetails(html) {
    try {
      const details = {
        characteristics: {},
        seller: {},
        description: '',
        images: [],
        safety: [],
        comfort: [],
        location: ''
      };

      // Extract main price in pesos (look for the large price display)
      const priceMatches = [
        html.match(/\$([0-9]{1,3}(?:[,.]?[0-9]{3})*(?:[,.]?[0-9]{3})*)/g),
        html.match(/US\$([0-9,]+)/),
        html.match(/USD ([0-9,]+)/)
      ];
      
      for (const matches of priceMatches) {
        if (matches && matches[0]) {
          const cleanPrice = matches[0].replace(/[,$]/g, '').replace(/US/, '').trim();
          if (cleanPrice && !isNaN(parseInt(cleanPrice))) {
            details.priceARS = cleanPrice;
            break;
          }
        }
      }

      // Extract seller information (look for seller name in various patterns)
      const sellerPatterns = [
        /<h3[^>]*class="[^"]*seller[^"]*"[^>]*>([^<]+)<\/h3>/i,
        /<h3[^>]*>([^<]+)<\/h3>/,
        /Vendido por[\s]*<[^>]*>([^<]+)<\/[^>]*>/i,
        /class="[^"]*seller-name[^"]*"[^>]*>([^<]+)</i
      ];

      for (const pattern of sellerPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 2) {
          details.seller.name = match[1].trim();
          break;
        }
      }

      // Extract dealer/private seller type with more patterns
      if (html.includes('concesionario') || html.includes('Concesionario') || 
          html.includes('dealer') || html.includes('Dealer') ||
          html.includes('automotora') || html.includes('Automotora')) {
        details.seller.type = 'Concesionario';
      } else {
        details.seller.type = 'Particular';
      }

      // Extract location from the structured JSON data (more reliable)
      const locationPatterns = [
        // Look for location in JSON structured data
        /"itemNeighborhood"\s*:\s*"([^"]+)"/i,
        /"itemCity"\s*:\s*"([^"]+)"/i,
        /"139"\s*:\s*"([^"]+)"/i, // itemCity custom dimension
        /"140"\s*:\s*"([^"]+)"/i, // itemState custom dimension
        /"141"\s*:\s*"([^"]+)"/i, // itemNeighborhood custom dimension
        // Look for the questions section pattern
        /"title"\s*:\s*{\s*"text"\s*:\s*"El vehículo está en\s+([^"]+)"/i,
      ];

      for (const pattern of locationPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 2 && match[1].trim().length < 100) {
          details.location = match[1].trim();
          break;
        }
      }

      // Extract characteristics from the structured JSON data
      const techSpecsIndex = html.indexOf('"technical_specifications":{');
      if (techSpecsIndex !== -1) {
        try {
          // Find the complete JSON object by counting brackets
          const startIndex = techSpecsIndex + '"technical_specifications":'.length;
          let braceCount = 0;
          let endIndex = startIndex;
          
          for (let i = startIndex; i < html.length; i++) {
            if (html[i] === '{') braceCount++;
            if (html[i] === '}') braceCount--;
            if (braceCount === 0) {
              endIndex = i + 1;
              break;
            }
          }
          
          const techSpecsJson = html.substring(startIndex, endIndex);
          const techSpecs = JSON.parse(techSpecsJson);
          
          // Look for the first spec with attributes
          if (techSpecs.specs && techSpecs.specs.length > 0) {
            const firstSpec = techSpecs.specs[0];
            if (firstSpec.attributes) {
              // Convert to our characteristics format
              firstSpec.attributes.forEach(attr => {
                if (attr.id && attr.text) {
                  // Map Spanish keys to English
                  const keyMapping = {
                    'Marca': 'brand',
                    'Modelo': 'model', 
                    'Año': 'year',
                    'Versión': 'version',
                    'Color': 'color',
                    'Tipo de combustible': 'fuelType',
                    'Puertas': 'doors',
                    'Transmisión': 'transmission',
                    'Motor': 'engine',
                    'Tipo de carrocería': 'bodyType',
                    'Con cámara de retroceso': 'reverseCamera',
                    'Kilómetros': 'kilometers'
                  };
                  
                  const englishKey = keyMapping[attr.id] || attr.id.toLowerCase().replace(/\s+/g, '');
                  
                  // Convert numeric values appropriately
                  if (englishKey === 'year' || englishKey === 'doors') {
                    const numValue = parseInt(attr.text.replace(/[^\d]/g, ''));
                    details.characteristics[englishKey] = !isNaN(numValue) ? numValue : attr.text;
                  } else if (englishKey === 'kilometers') {
                    const numValue = parseInt(attr.text.replace(/[^\d]/g, ''));
                    details.characteristics[englishKey] = !isNaN(numValue) ? numValue : attr.text;
                  } else {
                    details.characteristics[englishKey] = attr.text;
                  }
                }
              });
              
              console.log(`🎯 Found ${firstSpec.attributes.length} characteristics from JSON structure`);
            }
          }
        } catch (e) {
          console.log(`Error parsing technical specifications JSON: ${e.message}`);
        }
      }
      
      // If no structured data found, fall back to HTML patterns
      if (Object.keys(details.characteristics).length === 0) {
        console.log('⚠️  No characteristics sections found, trying fallback patterns');
        
        // Fallback: look for individual characteristic patterns in the general page
        const specificPatterns = [
          /Marca[\s]*[:|=][\s]*([^<\n]+)/i,
          /Modelo[\s]*[:|=][\s]*([^<\n]+)/i,
          /Año[\s]*[:|=][\s]*([^<\n]+)/i,
          /Color[\s]*[:|=][\s]*([^<\n]+)/i,
          /Transmisión[\s]*[:|=][\s]*([^<\n]+)/i,
          /Motor[\s]*[:|=][\s]*([^<\n]+)/i,
          /Puertas[\s]*[:|=][\s]*([^<\n]+)/i
        ];

        const keyMap = ['brand', 'model', 'year', 'color', 'transmission', 'engine', 'doors'];
        
        specificPatterns.forEach((pattern, index) => {
          const match = html.match(pattern);
          if (match && match[1]) {
            const value = match[1].trim();
            const key = keyMap[index];
            if (key === 'year' || key === 'doors') {
              details.characteristics[key] = parseInt(value) || value;
            } else {
              details.characteristics[key] = value;
            }
          }
        });
      }

      // Extract description with multiple patterns
      const descPatterns = [
        /<h2[^>]*>Descripción<\/h2>[\s\S]*?<p[^>]*>([^<]+)/i,
        /<h3[^>]*>Descripción<\/h3>[\s\S]*?<p[^>]*>([^<]+)/i,
        /class="[^"]*description[^"]*"[^>]*>([^<]+)/i,
        /<p[^>]*class="[^"]*desc[^"]*"[^>]*>([^<]+)<\/p>/i
      ];

      for (const pattern of descPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 10) {
          details.description = match[1].trim();
          break;
        }
      }

      // Extract safety features with more comprehensive patterns
      const safetyFeatures = [
        'Alarma', 'ABS', 'ESP', 'Airbag', 'Airbags',
        'Control de estabilidad', 'Control de tracción',
        'Frenos ABS', 'Sistema de frenos', 'Cinturones de seguridad',
        'Cámara de retroceso', 'Sensores de retroceso',
        'Asistente de frenado', 'Control crucero'
      ];

      safetyFeatures.forEach(feature => {
        if (html.toLowerCase().includes(feature.toLowerCase())) {
          details.safety.push(feature);
        }
      });

      // Remove duplicates from safety array
      details.safety = [...new Set(details.safety)];

      return details;
    } catch (error) {
      console.error('⚠️  Error extracting details:', error.message);
      return null;
    }
  }

  /**
   * Enhance a single car with detailed information
   */
  async enhanceCar(car, index, total) {
    const cleanUrl = this.cleanUrl(car.link);
    console.log(`🔍 [${index + 1}/${total}] Enhancing: ${car.title.substring(0, 50)}...`);
    
    try {
      // Add delay to avoid being banned
      if (index > 0) {
        console.log(`⏳ Waiting ${this.delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }

      const response = await this.request(cleanUrl);
      
      if (response.statusCode !== 200) {
        console.log(`⚠️  Skipping - Status ${response.statusCode} for ${car.id}`);
        return car; // Return original car if request fails
      }

      const details = this.extractCarDetails(response.body);
      
      if (!details) {
        console.log(`⚠️  Skipping - Failed to extract details for ${car.id}`);
        return car;
      }

      // Enhance the car object
      const enhancedCar = {
        ...car,
        enhancedAt: new Date().toISOString(),
        seller: details.seller.name ? details.seller : car.seller,
        characteristics: details.characteristics,
        description: details.description || car.description,
        safety: details.safety,
        priceARS: details.priceARS,
        link: cleanUrl, // Use cleaned URL
        location: details.location || car.location // Use extracted location or keep original
      };

      console.log(`✅ Enhanced ${car.id} - Found ${Object.keys(details.characteristics).length} characteristics`);
      return enhancedCar;

    } catch (error) {
      console.log(`❌ Error enhancing ${car.id}:`, error.message);
      return car; // Return original car on error
    }
  }

  /**
   * Enhance all cars in a collection
   */
  async enhanceCollection(collection, startIndex = 0, maxCars = null) {
    console.log(`\n🚗 Enhancing collection: ${collection.brand} ${collection.model}`);
    console.log(`📊 Total cars: ${collection.cars.length}`);
    
    if (maxCars) {
      console.log(`🎯 Processing only ${maxCars} cars for testing`);
    }

    const carsToProcess = maxCars ? collection.cars.slice(startIndex, startIndex + maxCars) : collection.cars.slice(startIndex);
    const enhancedCars = [];

    for (let i = 0; i < carsToProcess.length; i++) {
      const car = carsToProcess[i];
      const enhancedCar = await this.enhanceCar(car, i, carsToProcess.length);
      enhancedCars.push(enhancedCar);

      // Progress update every 10 cars
      if ((i + 1) % 10 === 0) {
        console.log(`📈 Progress: ${i + 1}/${carsToProcess.length} cars processed`);
      }
    }

    // Create enhanced collection
    const enhancedCollection = {
      ...collection,
      cars: enhancedCars,
      enhancedAt: new Date().toISOString(),
      enhancementStats: {
        totalProcessed: enhancedCars.length,
        startIndex: startIndex,
        enhanced: enhancedCars.filter(car => car.enhancedAt).length
      }
    };

    return enhancedCollection;
  }

  /**
   * Save enhanced data to file
   */
  saveToFile(data, filename) {
    try {
      const filepath = `./enhanced-data/${filename}`;
      
      // Create directory if it doesn't exist
      if (!fs.existsSync('./enhanced-data')) {
        fs.mkdirSync('./enhanced-data');
      }

      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      console.log(`💾 Enhanced data saved to ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to save file:', error.message);
      throw error;
    }
  }

  /**
   * Upload enhanced collection to KV store
   */
  async uploadToKV(collection) {
    console.log(`📤 Uploading enhanced collection to KV: ${collection.key}`);
    
    try {
      // Use the store-cars endpoint to update the KV
      const response = await this.request(`${this.baseUrl}/api/store-cars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brand: collection.brand,
          model: collection.model,
          cars: collection.cars
        })
      });

      if (response.statusCode === 200) {
        console.log(`✅ Successfully uploaded ${collection.cars.length} enhanced cars to KV`);
        return true;
      } else {
        console.error(`❌ Upload failed with status ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to upload to KV:', error.message);
      return false;
    }
  }

  /**
   * Main enhancement process
   */
  async enhance(options = {}) {
    const {
      collectionIndex = 0,
      startCarIndex = 0,
      maxCars = null,
      saveToFile = true,
      uploadToKV = false
    } = options;

    try {
      console.log('🚀 Starting car data enhancement...');
      console.log(`⚙️  Options: collection=${collectionIndex}, startCar=${startCarIndex}, maxCars=${maxCars || 'all'}`);
      
      // Get current data
      const data = await this.getAllCars();
      
      if (!data.collections || data.collections.length === 0) {
        throw new Error('No collections found');
      }

      if (collectionIndex >= data.collections.length) {
        throw new Error(`Collection index ${collectionIndex} out of range (max: ${data.collections.length - 1})`);
      }

      const collection = data.collections[collectionIndex];
      console.log(`🎯 Processing collection: ${collection.key} (${collection.count} cars)`);

      // Enhance the collection
      const enhancedCollection = await this.enhanceCollection(collection, startCarIndex, maxCars);

      // Save to file
      if (saveToFile) {
        const filename = `${enhancedCollection.key}-enhanced-${new Date().toISOString().split('T')[0]}.json`;
        this.saveToFile(enhancedCollection, filename);
      }

      // Upload to KV
      if (uploadToKV) {
        await this.uploadToKV(enhancedCollection);
      }

      console.log('\n🎉 Enhancement process completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`   - Collection: ${enhancedCollection.key}`);
      console.log(`   - Cars processed: ${enhancedCollection.enhancementStats.totalProcessed}`);
      console.log(`   - Cars enhanced: ${enhancedCollection.enhancementStats.enhanced}`);
      
      return enhancedCollection;

    } catch (error) {
      console.error('❌ Enhancement process failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options = {
    collectionIndex: 0,
    startCarIndex: 0,
    maxCars: null,
    saveToFile: true,
    uploadToKV: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--collection':
        options.collectionIndex = parseInt(args[++i]);
        break;
      case '--start':
        options.startCarIndex = parseInt(args[++i]);
        break;
      case '--max':
        options.maxCars = parseInt(args[++i]);
        break;
      case '--upload':
        options.uploadToKV = true;
        break;
      case '--no-save':
        options.saveToFile = false;
        break;
      case '--help':
        console.log(`
Car Data Enhancement Script

Usage: node enhance-car-data.js [options]

Options:
  --collection <index>  Collection index to process (default: 0)
  --start <index>       Start car index within collection (default: 0)
  --max <count>         Maximum number of cars to process (default: all)
  --upload              Upload enhanced data to KV store
  --no-save             Don't save to local file
  --help                Show this help message

Examples:
  # Test with first 5 cars
  node enhance-car-data.js --max 5

  # Process cars 10-20 from first collection
  node enhance-car-data.js --start 10 --max 10

  # Process and upload to KV
  node enhance-car-data.js --max 50 --upload
        `);
        return;
    }
  }

  const enhancer = new CarDataEnhancer();
  
  try {
    await enhancer.enhance(options);
  } catch (error) {
    console.error('💥 Process failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = CarDataEnhancer; 