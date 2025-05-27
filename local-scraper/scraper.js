#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class LocalMercadoLibreScraper {
    constructor(options = {}) {
        this.baseUrl = 'https://autos.mercadolibre.com.ar';
        this.delay = options.delay || 2000; // 2 seconds between requests
        this.headless = options.headless !== false; // Default to headless
        this.maxPages = options.maxPages || null; // null = infinite
        this.outputDir = options.outputDir || './scraped-data';
        this.cloudflareApiUrl = options.cloudflareApiUrl || 'https://ml-autos-scraper.rodrigoburdet.workers.dev';
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('🚀 Initializing local scraper...');
        
        // Create output directory
        await fs.mkdir(this.outputDir, { recursive: true });
        
        // Launch browser
        this.browser = await puppeteer.launch({
            headless: this.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Set user agent and viewport
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ Browser initialized');
    }

    async scrapeSearch(brand, model, options = {}) {
        if (!this.browser) {
            await this.init();
        }

        const searchQuery = `${brand} ${model}`.trim();
        const searchUrl = `${this.baseUrl}/${brand}/${model}`;
        const extractDetails = options.extractDetails || false; // New option to extract detailed info
        
        console.log(`🔍 Starting search for: ${searchQuery}`);
        console.log(`📍 URL: ${searchUrl}`);
        console.log(`🔍 Extract details: ${extractDetails ? 'Yes' : 'No'}`);

        const allCars = [];
        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage && (this.maxPages === null || currentPage <= this.maxPages)) {
            console.log(`\n📄 Scraping page ${currentPage}...`);
            
            const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}_Desde_${(currentPage - 1) * 48 + 1}`;
            
            try {
                await this.page.goto(pageUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: 30000 
                });

                // Wait for content to load
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Debug: Check page title and URL
                const pageTitle = await this.page.title();
                const currentUrl = this.page.url();
                console.log(`📄 Page title: ${pageTitle}`);
                console.log(`🔗 Current URL: ${currentUrl}`);

                // Extract cars from current page
                const pageCars = await this.extractCarsFromPage();
                
                if (pageCars.length === 0) {
                    console.log('❌ No cars found on this page, stopping...');
                    break;
                }

                // Extract detailed information if requested
                if (extractDetails && pageCars.length > 0) {
                    console.log(`🔍 Extracting detailed information for ${pageCars.length} cars...`);
                    for (let i = 0; i < pageCars.length; i++) {
                        try {
                            const detailedCar = await this.extractCarDetails(pageCars[i]);
                            pageCars[i] = { ...pageCars[i], ...detailedCar };
                            console.log(`✅ Extracted details for car ${i + 1}/${pageCars.length}`);
                            
                            // Small delay between detail extractions
                            if (i < pageCars.length - 1) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        } catch (error) {
                            console.log(`⚠️ Failed to extract details for car ${i + 1}: ${error.message}`);
                        }
                    }
                }

                allCars.push(...pageCars);
                console.log(`✅ Found ${pageCars.length} cars on page ${currentPage} (Total: ${allCars.length})`);

                // Check for next page
                hasNextPage = await this.hasNextPage();
                
                if (hasNextPage) {
                    console.log(`⏳ Waiting ${this.delay}ms before next page...`);
                    await new Promise(resolve => setTimeout(resolve, this.delay));
                    currentPage++;
                } else {
                    console.log('🏁 No more pages available');
                }

            } catch (error) {
                console.error(`❌ Error on page ${currentPage}:`, error.message);
                break;
            }
        }

        // Remove duplicates based on ID
        const uniqueCars = this.removeDuplicates(allCars);
        
        console.log(`\n🎯 Scraping completed!`);
        console.log(`📊 Total cars found: ${uniqueCars.length}`);
        console.log(`📄 Pages scraped: ${currentPage - 1}`);

        return {
            query: searchQuery,
            brand,
            model,
            totalCars: uniqueCars.length,
            pagesScraped: currentPage - 1,
            cars: uniqueCars,
            scrapedAt: new Date().toISOString(),
            extractedDetails: extractDetails
        };
    }

    async extractCarsFromPage() {
        return await this.page.evaluate(() => {
            const cars = [];
            
            // Multiple selectors to find car listings
            const selectors = [
                '.poly-card',
                '.ui-search-result__wrapper',
                '.ui-search-result',
                '[data-testid="result"]',
                '.polycard',
                '.shops__result-wrapper'
            ];

            let elements = [];
            for (const selector of selectors) {
                elements = document.querySelectorAll(selector);
                if (elements.length > 0) break;
            }

            elements.forEach((element, index) => {
                try {
                    // Extract basic info
                    const titleElement = element.querySelector('.poly-card__title, .polycard__title, .ui-search-item__title, h2 a, .ui-search-result__content-wrapper h2, h2, .ui-search-item__title-label, .ui-search-item__title-label-text, [data-testid="item-title"]');
                    const priceElement = element.querySelector('.poly-card__price, .polycard__price, .price-tag, .ui-search-price__second-line, .price-tag-fraction, .andes-money-amount, .ui-search-price__part');
                    const linkElement = element.querySelector('a[href*="/MLA"], a[href*="/vehiculos"], a');
                    const imageElement = element.querySelector('img');

                    // Get title from element text or image title attribute
                    let title = titleElement?.textContent?.trim();
                    if (!title && imageElement) {
                        title = imageElement.getAttribute('title') || imageElement.getAttribute('alt');
                    }

                    if (!title || !linkElement) return;
                    const link = linkElement.href;
                    
                    // Extract MLA ID from URL
                    const mlaMatch = link.match(/MLA-?(\d+)/);
                    if (!mlaMatch) return;
                    
                    const id = mlaMatch[1];

                    // Validate this is actually a car listing
                    if (!title || title.length < 5) return;
                    
                    // Check for car-related keywords (more flexible for car titles)
                    const carKeywords = ['km', 'año', 'motor', 'nafta', 'diesel', 'automático', 'manual', 'puertas', 'cvt', 'toyota', 'ford', 'chevrolet', 'volkswagen', 'honda'];
                    const hasCarKeywords = carKeywords.some(keyword => 
                        title.toLowerCase().includes(keyword) || 
                        element.textContent.toLowerCase().includes(keyword)
                    );

                    // More flexible validation - if it has a car brand or year, it's likely a car
                    if (!hasCarKeywords && !title.match(/\d{4}/) && !title.match(/\d+cv/)) return;

                    // Extract price
                    let price = null;
                    if (priceElement) {
                        const priceText = priceElement.textContent?.trim();
                        if (priceText && !priceText.includes('Consultar')) {
                            price = priceText;
                        }
                    }

                    // Get the full text content of this specific element only
                    const elementText = element.textContent || '';
                    
                    // Extract year and kilometers from poly-attributes_list (more reliable)
                    let year = null;
                    let kilometers = null;
                    
                    // Look for poly-attributes_list items first (most reliable)
                    const attributesList = element.querySelector('.poly-attributes_list, .poly-component__attributes-list ul');
                    if (attributesList) {
                        const attributeItems = attributesList.querySelectorAll('.poly-attributes_list__item, li');
                        attributeItems.forEach(item => {
                            const text = item.textContent?.trim();
                            if (text) {
                                // Check for year (4-digit number between 1990-2030)
                                const yearMatch = text.match(/^(19|20)\d{2}$/);
                                if (yearMatch) {
                                    const yearNum = parseInt(yearMatch[0]);
                                    if (yearNum >= 1990 && yearNum <= 2030) {
                                        year = yearNum;
                                    }
                                }
                                
                                // Check for kilometers (number followed by "Km" or "km")
                                const kmMatch = text.match(/^(\d+(?:\.\d+)*)\s*km$/i);
                                if (kmMatch) {
                                    let kmValue = kmMatch[1];
                                    if (kmValue.includes('.')) {
                                        // Remove dots (Argentine thousands separator)
                                        kilometers = parseInt(kmValue.replace(/\./g, ''));
                                    } else {
                                        kilometers = parseInt(kmValue);
                                    }
                                }
                            }
                        });
                    }
                    
                    // Fallback: Extract year from title or element text if not found in attributes
                    if (!year) {
                        const titleYearMatch = title.match(/\b(19|20)\d{2}\b/);
                        if (titleYearMatch) {
                            year = parseInt(titleYearMatch[0]);
                        } else {
                            // Look for year in element text, but be more specific
                            const yearMatches = elementText.match(/\b(19|20)\d{2}\b/g);
                            if (yearMatches) {
                                // Take the first reasonable year (between 1990 and current year + 1)
                                const currentYear = new Date().getFullYear();
                                for (const yearStr of yearMatches) {
                                    const yearNum = parseInt(yearStr);
                                    if (yearNum >= 1990 && yearNum <= currentYear + 1) {
                                        year = yearNum;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // Fallback: Extract kilometers from element text if not found in attributes
                    if (!kilometers) {
                        // Look for patterns like "40.000 km", "40000 km", "40 mil km"
                        const kmPatterns = [
                            /(\d{1,3}(?:\.\d{3})*)\s*km/i,  // 40.000 km
                            /(\d+)\s*mil\s*km/i,           // 40 mil km  
                            /(\d+)\s*k\s*km/i,             // 40k km
                            /(\d+)\s*km/i                  // 40000 km
                        ];
                        
                        for (const pattern of kmPatterns) {
                            const kmMatch = elementText.match(pattern);
                            if (kmMatch) {
                                let kmValue = kmMatch[1];
                                
                                // Handle different formats
                                if (elementText.includes('mil km')) {
                                    // Convert "40 mil" to 40000
                                    kilometers = parseInt(kmValue) * 1000;
                                } else if (kmValue.includes('.')) {
                                    // Remove dots (Argentine thousands separator)
                                    kilometers = parseInt(kmValue.replace(/\./g, ''));
                                } else {
                                    kilometers = parseInt(kmValue);
                                }
                                
                                // Sanity check - reasonable km range for cars
                                if (kilometers > 0 && kilometers < 1000000) {
                                    break;
                                } else {
                                    kilometers = null;
                                }
                            }
                        }
                    }

                    // Extract location - look for specific location patterns
                    let location = null;
                    const locationElement = element.querySelector('.ui-search-item__location, .polycard__location, .ui-search-item__group__element--location');
                    if (locationElement) {
                        location = locationElement.textContent?.trim();
                    } else {
                        // Look for location patterns in text (usually after a dash or pipe)
                        const locationPatterns = [
                            /\|\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s*-\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)/,
                            /-\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s*-\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)\s*$/,
                            /en\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
                        ];
                        
                        for (const pattern of locationPatterns) {
                            const locationMatch = elementText.match(pattern);
                            if (locationMatch) {
                                location = locationMatch[1].trim();
                                break;
                            }
                        }
                    }

                    // Extract image
                    const image = imageElement?.src || imageElement?.getAttribute('data-src') || null;

                    // Extract additional details from element text
                    let description = '';
                    let seller = null;
                    
                    // Look for seller type
                    if (elementText.includes('Concesionaria')) {
                        seller = { type: 'Concesionaria' };
                    } else if (elementText.includes('Dueño directo')) {
                        seller = { type: 'Dueño directo' };
                    }
                    
                    // Extract engine info, transmission, etc.
                    const features = [];
                    if (elementText.match(/\d+cv/i)) {
                        const cvMatch = elementText.match(/(\d+cv)/i);
                        if (cvMatch) features.push(cvMatch[1]);
                    }
                    
                    if (elementText.match(/automático|manual|cvt/i)) {
                        const transMatch = elementText.match(/(automático|manual|cvt)/i);
                        if (transMatch) features.push(transMatch[1]);
                    }

                    const car = {
                        id,
                        title,
                        price: price ? { currency: '$', amount: price } : null,
                        year,
                        kilometers,
                        location,
                        link,
                        thumbnail: image,
                        description,
                        publishedDate: null,
                        seller,
                        features,
                        extractedAt: new Date().toISOString()
                    };

                    cars.push(car);
                } catch (error) {
                    // Silently continue on extraction errors
                    console.log(`Error extracting car ${index}:`, error.message);
                }
            });

            return cars;
        });
    }

    async hasNextPage() {
        return await this.page.evaluate(() => {
            // Look for "Siguiente" button that's not disabled
            const nextButtons = document.querySelectorAll('a[title="Siguiente"], .andes-pagination__button--next, .ui-search-pagination__button--next');
            
            for (const button of nextButtons) {
                if (!button.classList.contains('andes-pagination__button--disabled') && 
                    !button.classList.contains('ui-search-pagination__button--disabled') &&
                    !button.hasAttribute('disabled')) {
                    return true;
                }
            }

            // Alternative: look for pagination with next page number
            const currentPageElement = document.querySelector('.andes-pagination__button--current, .ui-search-pagination__button--current');
            if (currentPageElement) {
                const currentPage = parseInt(currentPageElement.textContent);
                const nextPageElement = document.querySelector(`a[aria-label="${currentPage + 1}"]`);
                if (nextPageElement) return true;
            }

            return false;
        });
    }

    removeDuplicates(cars) {
        const seen = new Set();
        return cars.filter(car => {
            if (seen.has(car.id)) {
                return false;
            }
            seen.add(car.id);
            return true;
        });
    }

    async saveToFile(data, filename) {
        const filepath = path.join(this.outputDir, filename);
        await fs.writeFile(filepath, JSON.stringify(data, null, 2));
        console.log(`💾 Data saved to: ${filepath}`);
        return filepath;
    }

    async uploadToCloudflare(data) {
        console.log('\n☁️ Uploading to Cloudflare KV...');
        
        try {
            const response = await fetch(`${this.cloudflareApiUrl}/store-cars`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Successfully uploaded to Cloudflare KV');
            console.log(`🔑 Storage key: ${result.key}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to upload to Cloudflare:', error.message);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }

    async scrapeAndStore(brand, model, options = {}) {
        try {
            // Scrape data
            const data = await this.scrapeSearch(brand, model, options);
            
            // Save locally
            const filename = `${brand}-${model}-${new Date().toISOString().split('T')[0]}.json`;
            await this.saveToFile(data, filename);
            
            // Upload to Cloudflare if requested
            if (options.uploadToCloudflare !== false) {
                await this.uploadToCloudflare(data);
            }
            
            return data;
        } finally {
            await this.close();
        }
    }

    async extractCarDetails(car) {
        try {
            console.log(`🔍 Visiting car page: ${car.link}`);
            
            // Open car page in a new tab
            const detailPage = await this.browser.newPage();
            await detailPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await detailPage.goto(car.link, { 
                waitUntil: 'networkidle2',
                timeout: 15000 
            });

            // Wait for content to load
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Extract detailed information
            const details = await detailPage.evaluate(() => {
                const result = {};

                // Extract description
                const descriptionElement = document.querySelector('.ui-pdp-description__content, .item-description, .vip-description, [data-testid="description"]');
                if (descriptionElement) {
                    result.description = descriptionElement.textContent?.trim();
                }

                // Extract publication date
                const dateElement = document.querySelector('.ui-pdp-color--GRAY, .ui-pdp-subtitle');
                if (dateElement && dateElement.textContent.includes('Publicado')) {
                    result.publishedDate = dateElement.textContent.trim();
                }

                // Extract more precise location
                const locationElement = document.querySelector('.ui-pdp-media__location, .ui-vip-location__text');
                if (locationElement) {
                    result.location = locationElement.textContent?.trim();
                }

                // Extract seller information
                const sellerElement = document.querySelector('.ui-box-component-pdp__seller-info, .ui-vip-seller-info');
                if (sellerElement) {
                    const sellerText = sellerElement.textContent;
                    if (sellerText.includes('Concesionaria')) {
                        result.seller = { type: 'Concesionaria', name: sellerText.trim() };
                    } else if (sellerText.includes('Dueño directo')) {
                        result.seller = { type: 'Dueño directo', name: sellerText.trim() };
                    }
                }

                // Extract features/specifications
                const featuresElements = document.querySelectorAll('.ui-vip-specs__table tr, .andes-table__row');
                const features = [];
                featuresElements.forEach(row => {
                    const cells = row.querySelectorAll('td, .andes-table__cell');
                    if (cells.length >= 2) {
                        const key = cells[0].textContent?.trim();
                        const value = cells[1].textContent?.trim();
                        if (key && value) {
                            features.push(`${key}: ${value}`);
                        }
                    }
                });
                if (features.length > 0) {
                    result.features = features;
                }

                // Extract more precise year and kilometers from specs
                const specsText = document.body.textContent;
                
                // Look for year in specifications
                const yearMatch = specsText.match(/Año[:\s]*(\d{4})/i);
                if (yearMatch) {
                    result.year = parseInt(yearMatch[1]);
                }

                // Look for kilometers in specifications
                const kmMatch = specsText.match(/Kilómetros?[:\s]*(\d+(?:\.\d+)*)/i);
                if (kmMatch) {
                    result.kilometers = parseInt(kmMatch[1].replace(/\./g, ''));
                }

                return result;
            });

            await detailPage.close();
            return details;

        } catch (error) {
            console.log(`⚠️ Error extracting car details: ${error.message}`);
            return {};
        }
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node scraper.js <brand> <model> [options]');
        console.log('Example: node scraper.js toyota yaris');
        console.log('Options:');
        console.log('  --max-pages=N     Limit to N pages (default: infinite)');
        console.log('  --delay=MS        Delay between requests in ms (default: 2000)');
        console.log('  --no-headless     Run browser in visible mode');
        console.log('  --no-upload       Skip uploading to Cloudflare');
        console.log('  --extract-details Extract detailed info by visiting individual car pages (slower)');
        process.exit(1);
    }

    const [brand, model] = args;
    const options = {};
    
    // Parse options
    args.slice(2).forEach(arg => {
        if (arg.startsWith('--max-pages=')) {
            options.maxPages = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--delay=')) {
            options.delay = parseInt(arg.split('=')[1]);
        } else if (arg === '--no-headless') {
            options.headless = false;
        } else if (arg === '--no-upload') {
            options.uploadToCloudflare = false;
        } else if (arg === '--extract-details') {
            options.extractDetails = true;
        }
    });

    const scraper = new LocalMercadoLibreScraper(options);
    
    scraper.scrapeAndStore(brand, model, options)
        .then(data => {
            console.log('\n🎉 Scraping completed successfully!');
            console.log(`📊 Total cars: ${data.totalCars}`);
            if (data.extractedDetails) {
                console.log('🔍 Detailed information extracted from individual car pages');
            }
        })
        .catch(error => {
            console.error('💥 Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = LocalMercadoLibreScraper; 