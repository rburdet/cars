class MercadoLibreAutosScraper {
  constructor(limit) {
    this.products = [];
    this.limit = limit;
    this.currentProduct = null;
    this.productCount = 0;
    this.debug = true;
  }

  log(message, data = '') {
    // Reduced logging for performance
    if (this.debug && this.products.length % 10 === 0) {
      console.log(`[AutosScraper] ${message}`, data);
    }
  }

  startProduct() {
    if (this.limit !== Infinity && this.productCount >= this.limit) return;
    
    this.finalizeCurrentProduct();
    
    this.currentProduct = {
      id: null,
      title: '',
      price: { currency: '$', amount: 0 },
      year: null,
      kilometers: null,
      location: '',
      link: '',
      thumbnail: '',
      description: '',
      publishedDate: null,
      seller: {
        type: '', // 'Concesionaria' or 'Dueño directo'
        name: ''
      },
      features: []
    };
    this.productCount++;
    this.log(`Started car product ${this.productCount}`);
  }

  finalizeCurrentProduct() {
    if (this.currentProduct) {
      this.currentProduct.title = this.currentProduct.title.trim();
      
      this.log(`Finalizing car: title="${this.currentProduct.title}" link="${this.currentProduct.link}"`);
      
      if (this.currentProduct.title && this.currentProduct.link && (this.limit === Infinity || this.products.length < this.limit)) {
        // Only add if it looks like a car listing
        if (this.isValidCarListing(this.currentProduct)) {
          this.products.push({ ...this.currentProduct });
          this.log(`Added car ${this.products.length}: ${this.currentProduct.title}`);
        } else {
          this.log(`Skipped invalid car listing`);
        }
      } else {
        this.log(`Skipped car - missing data or limit reached`);
      }
    }
  }

  isValidCarListing(product) {
    // Check if this looks like a car listing
    const title = product.title.toLowerCase();
    const hasCarBrand = ['toyota', 'ford', 'chevrolet', 'volkswagen', 'fiat', 'honda', 'nissan', 'peugeot', 'renault', 'hyundai'].some(brand => 
      title.includes(brand)
    );
    const hasCarWords = ['cv', 'sedan', 'hatchback', 'suv', 'pickup'].some(word => title.includes(word));
    const hasValidLink = product.link && product.link.includes('autos.mercadolibre.com.ar');
    
    return hasCarBrand || hasCarWords || hasValidLink;
  }

  addTitle(text) {
    if (this.currentProduct && text && text.trim()) {
      const cleanText = text.trim();
      // Avoid adding footer/navigation text
      if (this.isValidTitleText(cleanText)) {
        this.currentProduct.title += cleanText + ' ';
        this.log(`Added title text: "${cleanText}"`);
      }
    }
  }

  isValidTitleText(text) {
    const invalidTexts = [
      'mercado libre', 'acerca de', 'otros sitios', 'ayuda', 'mi cuenta',
      'suscripciones', 'temporadas', 'categorías', 'ofertas', 'cupones',
      'vender', 'buscar', 'filtros', 'ordenar', 'anterior', 'siguiente'
    ];
    const textLower = text.toLowerCase();
    return !invalidTexts.some(invalid => textLower.includes(invalid)) && text.length > 2;
  }

  setLink(href) {
    if (this.currentProduct && href) {
      // For autos, we want links that contain specific patterns
      if (href.includes('autos.mercadolibre.com.ar') || 
          href.includes('/MLA-') || 
          (href.includes('mercadolibre.com.ar') && !href.includes('hp.mercadolibre.com'))) {
        
        if (!this.currentProduct.link || href.includes('autos.mercadolibre.com.ar')) {
          this.currentProduct.link = href;
          this.log(`Set link: ${href}`);
          
          // Extract product ID
          const patterns = [
            /MLA-?(\d+)/i,
            /\/p\/MLA(\d+)/i,
            /\/(\d+)[?#]/,
            /\/(\d+)$/
          ];
          
          for (const pattern of patterns) {
            const match = href.match(pattern);
            if (match && match[1]) {
              this.currentProduct.id = match[1];
              this.log(`Extracted ID: ${this.currentProduct.id}`);
              break;
            }
          }
        }
      }
    }
  }

  addPrice(text) {
    if (this.currentProduct && text) {
      const cleanText = text.trim();
      this.log(`Processing price text: "${cleanText}"`);
      
      // Currency detection
      if (cleanText === '$' || cleanText === 'ARS' || cleanText === 'USD' || cleanText === 'US$') {
        this.currentProduct.price.currency = cleanText;
        this.log(`Set currency: ${cleanText}`);
      }
      
      // Price amount - handle both dot and comma separators
      const priceMatch = cleanText.match(/[\d.,]+/);
      if (priceMatch && priceMatch[0].length > 2) {
        // Handle Argentine number format (dots as thousands, comma as decimal)
        let numStr = priceMatch[0];
        if (numStr.includes('.') && numStr.includes(',')) {
          // Format: 1.234.567,89
          numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else if (numStr.includes('.') && !numStr.includes(',')) {
          // Could be thousands separator or decimal
          const parts = numStr.split('.');
          if (parts[parts.length - 1].length <= 2) {
            // Decimal separator
            numStr = numStr.replace(/\./g, '');
          } else {
            // Thousands separator
            numStr = numStr.replace(/\./g, '');
          }
        }
        
        const amount = parseFloat(numStr);
        if (!isNaN(amount) && amount > 0) {
          this.currentProduct.price.amount = amount;
          this.log(`Set price amount: ${amount}`);
        }
      }
    }
  }

  addCarDetails(text) {
    if (this.currentProduct && text) {
      const cleanText = text.trim();
      
      // Extract year
      const yearMatch = cleanText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0]);
        if (year >= 1990 && year <= new Date().getFullYear() + 1) {
          this.currentProduct.year = year;
          this.log(`Set year: ${year}`);
        }
      }
      
      // Extract kilometers
      const kmMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*(?:km|kilómetros?)/i);
      if (kmMatch) {
        const km = parseFloat(kmMatch[1].replace(/\./g, ''));
        this.currentProduct.kilometers = km;
        this.log(`Set kilometers: ${km}`);
      }
      
      // Extract location
      if (cleanText.includes(' - ') && !this.currentProduct.location) {
        const parts = cleanText.split(' - ');
        if (parts.length >= 2) {
          this.currentProduct.location = parts[parts.length - 1];
          this.log(`Set location: ${this.currentProduct.location}`);
        }
      }
    }
  }

  setSeller(text) {
    if (this.currentProduct && text) {
      const cleanText = text.trim();
      if (cleanText.toLowerCase().includes('concesionaria')) {
        this.currentProduct.seller.type = 'Concesionaria';
      } else if (cleanText.toLowerCase().includes('dueño directo')) {
        this.currentProduct.seller.type = 'Dueño directo';
      }
      
      if (cleanText.startsWith('Por ')) {
        this.currentProduct.seller.name = cleanText.substring(4);
      }
      
      this.log(`Set seller: ${cleanText}`);
    }
  }

  setThumbnail(url) {
    if (this.currentProduct && url && url.includes('http') && !this.currentProduct.thumbnail) {
      this.currentProduct.thumbnail = url;
      this.log(`Set thumbnail: ${url}`);
    }
  }

  getStats() {
    return {
      carsFound: this.products.length,
      currentCarState: this.currentProduct,
      carCount: this.productCount
    };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle API routes
    if (path.startsWith('/api/')) {
      const { CarsAPI } = await import('./api/cars.js');
      const carsAPI = new CarsAPI(env);
      return carsAPI.handleRequest(request);
    }

    // Legacy routes for backward compatibility
    if (path === '/search-autos') {
      return handleAutosSearch(request, env, ctx);
    } else if (path === '/store-cars') {
      return handleStoreCars(request, env, ctx);
    } else if (path === '/get-cars') {
      return handleGetCars(request, env, ctx);
    } else if (path === '/get-all-cars') {
      return handleGetAllCars(request, env, ctx);
    } else if (path === '/debug-html') {
      return handleDebugHTML(request, env, ctx);
    }
    
    return new Response('Not found. Available endpoints: /api/cars, /api/cars/search, /api/cars/stats, /search-autos, /store-cars, /get-cars, /get-all-cars, /debug-html', { status: 404 });
  }
};

async function handleAutosSearch(request, env, ctx) {
  const url = new URL(request.url);
  const brand = url.searchParams.get('brand');
  const model = url.searchParams.get('model');
  
  if (!brand || !model) {
    return new Response(JSON.stringify({ 
      error: 'Missing required params: brand and model (e.g., ?brand=toyota&model=yaris)' 
    }), { 
      status: 400, 
      headers: { 'content-type': 'application/json' } 
    });
  }
  
  const limitParam = url.searchParams.get('limit') || '20';
  const limit = limitParam === 'infinite' || limitParam === '0' ? Infinity : parseInt(limitParam, 10);
  const autoStore = url.searchParams.get('store') === 'true';
  
  // Build MercadoLibre autos URL
  const searchUrl = `https://autos.mercadolibre.com.ar/${brand}/${model}`;
  
  console.log(`[AutosWorker] Searching for ${brand} ${model} with limit ${limit}`);
  console.log(`[AutosWorker] URL: ${searchUrl}`);
  
  try {
    const resp = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://autos.mercadolibre.com.ar/'
      }
    });

    console.log(`[AutosWorker] Response status: ${resp.status}`);
    
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    // Handle infinite scraping with pagination
    if (limit === Infinity) {
      return await handleInfiniteSearch(brand, model, searchUrl, autoStore, env);
    } else {
      const scraper = new MercadoLibreAutosScraper(limit);
      return await processAutosResponse(resp, scraper, brand, model, searchUrl, autoStore, env);
    }
    
  } catch (err) {
    console.error('[AutosWorker] Error:', err);
    return new Response(JSON.stringify({ 
      error: err.message,
      stack: err.stack
    }), { 
      status: 500, 
      headers: { 'content-type': 'application/json' } 
    });
  }
}

function detectNextPage(htmlContent, currentPage) {
  // Enhanced pagination detection with multiple robust methods
  
  console.log(`[PaginationDetector] Analyzing page ${currentPage} for next page indicators...`);
  
  // Method 1: Look for enabled "Siguiente" button
  const siguientePatterns = [
    /<a[^>]*title=["']Siguiente["'][^>]*(?!.*disabled)[^>]*>/i,
    /<a[^>]*>.*?Siguiente.*?<\/a>/i,
    /<button[^>]*(?!.*disabled)[^>]*>.*?Siguiente.*?<\/button>/i
  ];
  
  let hasEnabledSiguiente = false;
  for (const pattern of siguientePatterns) {
    const match = htmlContent.match(pattern);
    if (match) {
      // Check if this specific match is disabled
      const matchText = match[0];
      if (!matchText.includes('disabled') && !matchText.includes('aria-disabled="true"')) {
        hasEnabledSiguiente = true;
        console.log(`[PaginationDetector] Found enabled "Siguiente" button`);
        break;
      }
    }
  }
  
  // Method 2: Look for next page number in pagination
  const nextPageNum = currentPage + 1;
  const nextPagePatterns = [
    new RegExp(`<a[^>]*aria-label=["']${nextPageNum}["'][^>]*>`, 'i'),
    new RegExp(`<a[^>]*>${nextPageNum}</a>`, 'i'),
    new RegExp(`href=["'][^"']*_Desde_${currentPage * 48 + 1}[^"']*["']`, 'i')
  ];
  
  let hasNextPageLink = false;
  for (const pattern of nextPagePatterns) {
    if (pattern.test(htmlContent)) {
      hasNextPageLink = true;
      console.log(`[PaginationDetector] Found next page link for page ${nextPageNum}`);
      break;
    }
  }
  
  // Method 3: Check for pagination container with multiple pages
  const paginationPatterns = [
    /<div[^>]*class=["'][^"']*pagination[^"']*["'][^>]*>.*?<\/div>/is,
    /<nav[^>]*class=["'][^"']*pagination[^"']*["'][^>]*>.*?<\/nav>/is,
    /<ul[^>]*class=["'][^"']*pagination[^"']*["'][^>]*>.*?<\/ul>/is
  ];
  
  let hasPaginationWithNext = false;
  for (const pattern of paginationPatterns) {
    const match = htmlContent.match(pattern);
    if (match) {
      const paginationHtml = match[0];
      // Check if pagination contains next page indicators
      if (paginationHtml.includes(`>${nextPageNum}<`) || 
          paginationHtml.includes(`aria-label="${nextPageNum}"`) ||
          paginationHtml.includes('Siguiente')) {
        hasPaginationWithNext = true;
        console.log(`[PaginationDetector] Found pagination container with next page`);
        break;
      }
    }
  }
  
  // Method 4: Check for "no more results" or "end of results" messages
  const endOfResultsPatterns = [
    /no\s+hay\s+m[aá]s\s+resultados/i,
    /sin\s+resultados/i,
    /no\s+se\s+encontraron\s+m[aá]s/i,
    /fin\s+de\s+los\s+resultados/i,
    /no\s+more\s+results/i,
    /end\s+of\s+results/i,
    /<div[^>]*class=["'][^"']*no-results[^"']*["']/i
  ];
  
  let hasEndMessage = false;
  for (const pattern of endOfResultsPatterns) {
    if (pattern.test(htmlContent)) {
      hasEndMessage = true;
      console.log(`[PaginationDetector] Found "end of results" message`);
      break;
    }
  }
  
  // Method 5: Check if current page URL pattern exists for next page
  const nextPageUrl = `_Desde_${currentPage * 48 + 1}`;
  const hasNextPageUrl = htmlContent.includes(nextPageUrl);
  if (hasNextPageUrl) {
    console.log(`[PaginationDetector] Found next page URL pattern: ${nextPageUrl}`);
  }
  
  // Decision logic: Continue if we have positive indicators and no end messages
  const positiveIndicators = hasEnabledSiguiente || hasNextPageLink || hasPaginationWithNext || hasNextPageUrl;
  const shouldContinue = positiveIndicators && !hasEndMessage;
  
  console.log(`[PaginationDetector] Page ${currentPage} analysis:`);
  console.log(`  - Enabled Siguiente: ${hasEnabledSiguiente}`);
  console.log(`  - Next page link: ${hasNextPageLink}`);
  console.log(`  - Pagination with next: ${hasPaginationWithNext}`);
  console.log(`  - Next page URL: ${hasNextPageUrl}`);
  console.log(`  - End message: ${hasEndMessage}`);
  console.log(`  - Decision: ${shouldContinue ? 'CONTINUE' : 'STOP'}`);
  
  return shouldContinue;
}

async function handleInfiniteSearch(brand, model, searchUrl, autoStore, env) {
  const allCars = [];
  const startTime = Date.now();
  const maxExecutionTime = 20000; // 20 seconds - reduced to stay under CPU limits
  let currentPage = 1;
  let totalPages = 0;
  let hasMorePages = true;
  
  console.log(`[InfiniteSearch] Starting infinite search for ${brand} ${model} (all pages until no more)`);
  
  while (hasMorePages && (Date.now() - startTime) < maxExecutionTime) {
    try {
      // Check if we're approaching CPU limits
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > maxExecutionTime * 0.8) { // 80% of max time
        console.log(`[InfiniteSearch] Approaching time limit (${elapsedTime}ms), stopping early`);
        break;
      }
      // Build URL with pagination - MercadoLibre uses _Desde_ parameter
      const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}_Desde_${(currentPage - 1) * 48 + 1}`;
      console.log(`[InfiniteSearch] Fetching page ${currentPage}: ${pageUrl}`);
      
      const resp = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://autos.mercadolibre.com.ar/'
        }
      });

      if (!resp.ok) {
        console.log(`[InfiniteSearch] Page ${currentPage} failed: ${resp.status}`);
        break;
      }

      // Get the HTML content to check for pagination
      const htmlContent = await resp.text();
      
      // Multiple methods to detect if there are more pages
      const hasNextPage = detectNextPage(htmlContent, currentPage);
      
      // Create scraper with high limit for this page
      const scraper = new MercadoLibreAutosScraper(100);
      
      // Process the HTML content we already have
      const mockResponse = new Response(htmlContent, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers
      });
      
      const pageResult = await processAutosResponseSimple(mockResponse, scraper);
      
      if (pageResult.cars && pageResult.cars.length > 0) {
        allCars.push(...pageResult.cars);
        console.log(`[InfiniteSearch] Page ${currentPage}: Found ${pageResult.cars.length} cars (total: ${allCars.length})`);
        
        // Primary check: Use pagination detection
        if (!hasNextPage) {
          console.log(`[InfiniteSearch] Pagination detection indicates no more pages, stopping`);
          hasMorePages = false;
        }
        // Secondary check: If we found very few cars and pagination is uncertain
        else if (pageResult.cars.length < 5) {
          console.log(`[InfiniteSearch] Found only ${pageResult.cars.length} cars on page ${currentPage}, likely last page`);
          hasMorePages = false;
        }
        // Tertiary check: If we're getting the same cars as previous page (duplicate detection)
        else if (currentPage > 1) {
          const currentPageIds = new Set(pageResult.cars.map(car => car.id).filter(id => id));
          const allPreviousIds = new Set(allCars.slice(0, -pageResult.cars.length).map(car => car.id).filter(id => id));
          const duplicateCount = pageResult.cars.filter(car => car.id && allPreviousIds.has(car.id)).length;
          
          if (duplicateCount > pageResult.cars.length * 0.8) { // More than 80% duplicates
            console.log(`[InfiniteSearch] Page ${currentPage} has ${duplicateCount}/${pageResult.cars.length} duplicates, likely reached end`);
            hasMorePages = false;
          }
        }
      } else {
        console.log(`[InfiniteSearch] Page ${currentPage}: No cars found, stopping`);
        hasMorePages = false;
      }
      
      currentPage++;
      totalPages++;
      
      // Longer delay between pages to avoid resource limits (1.5 seconds)
      if (hasMorePages) {
        console.log(`[InfiniteSearch] Waiting 1.5 seconds before next page...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
    } catch (error) {
      console.error(`[InfiniteSearch] Error on page ${currentPage}:`, error.message);
      break;
    }
  }
  
  const executionTime = Date.now() - startTime;
  console.log(`[InfiniteSearch] Completed: ${allCars.length} cars from ${totalPages} pages in ${executionTime}ms`);
  
  // Remove duplicates based on ID
  const uniqueCars = [];
  const seenIds = new Set();
  
  for (const car of allCars) {
    if (car.id && !seenIds.has(car.id)) {
      seenIds.add(car.id);
      uniqueCars.push(car);
    } else if (!car.id) {
      // Keep cars without IDs (but they might be duplicates)
      uniqueCars.push(car);
    }
  }
  
  console.log(`[InfiniteSearch] After deduplication: ${uniqueCars.length} unique cars`);
  
  // Auto-store if requested
  let storeResult = null;
  if (autoStore && env && env.CAR_LISTINGS && uniqueCars.length > 0) {
    try {
      const key = `${brand}-${model}`;
      const value = {
        brand,
        model,
        cars: uniqueCars,
        lastUpdated: new Date().toISOString(),
        count: uniqueCars.length,
        scrapingMethod: 'infinite',
        pagesScraped: totalPages,
        executionTimeMs: executionTime
      };
      
      await env.CAR_LISTINGS.put(key, JSON.stringify(value));
      storeResult = {
        success: true,
        key,
        stored: uniqueCars.length,
        lastUpdated: value.lastUpdated,
        pagesScraped: totalPages,
        executionTimeMs: executionTime
      };
      console.log(`[InfiniteSearch] Auto-stored ${uniqueCars.length} cars for ${brand}-${model}`);
    } catch (error) {
      console.error('[InfiniteSearch] Auto-store failed:', error);
      storeResult = {
        success: false,
        error: error.message
      };
    }
  }
  
  return new Response(JSON.stringify({ 
    cars: uniqueCars,
    search: {
      brand,
      model,
      searchUrl,
      method: 'infinite',
      pagesScraped: totalPages,
      executionTimeMs: executionTime,
      stats: {
        carsFound: uniqueCars.length,
        totalCarsBeforeDedup: allCars.length,
        duplicatesRemoved: allCars.length - uniqueCars.length
      }
    },
    autoStore: storeResult
  }), {
    headers: { 'content-type': 'application/json' }
  });
}

async function processAutosResponseSimple(resp, scraper) {
  const rewriter = new HTMLRewriter()
    // Focus on most common product containers only
    .on('.polycard', {
      element: () => {
        scraper.startProduct();
      }
    })
    .on('.ui-search-layout__item', {
      element: () => {
        scraper.startProduct();
      }
    })
    
    // Essential links only
    .on('a[href*="/MLA-"]', {
      element: (element) => {
        const href = element.getAttribute('href');
        if (href) scraper.setLink(href);
      }
    })
    
    // Essential titles only
    .on('h2', {
      text: (text) => {
        const textContent = text.text.trim();
        if (textContent && textContent.length > 10) {
          scraper.addTitle(textContent);
        }
      }
    })
    
    // Essential price elements only
    .on('[class*="price"]', {
      text: (text) => {
        if (text.text) scraper.addPrice(text.text);
      }
    })
    
    // Essential images only
    .on('img', {
      element: (element) => {
        const src = element.getAttribute('data-src') || element.getAttribute('src');
        if (src && src.includes('mlstatic.com')) {
          scraper.setThumbnail(src);
        }
      }
    });

  const transformedResponse = rewriter.transform(resp);
  await transformedResponse.text(); // Process the HTML
  
  scraper.finalizeCurrentProduct();
  
  return {
    cars: scraper.products,
    stats: scraper.getStats()
  };
}

async function processAutosResponse(resp, scraper, brand, model, searchUrl, autoStore = false, env = null) {
  const rewriter = new HTMLRewriter()
    // Product containers - try multiple patterns
    .on('.polycard', {
      element: () => {
        console.log('[HTMLRewriter] Found polycard (.polycard)');
        scraper.startProduct();
      }
    })
    .on('[data-testid*="result"]', {
      element: () => {
        console.log('[HTMLRewriter] Found result element');
        scraper.startProduct();
      }
    })
    .on('.ui-search-layout__item', {
      element: () => {
        console.log('[HTMLRewriter] Found layout item (.ui-search-layout__item)');
        scraper.startProduct();
      }
    })
    .on('.ui-search-results__item', {
      element: () => {
        console.log('[HTMLRewriter] Found results item (.ui-search-results__item)');
        scraper.startProduct();
      }
    })
    
    // Links - be more aggressive about capturing product links
    .on('a[href*="/MLA-"]', {
      element: (element) => {
        const href = element.getAttribute('href');
        console.log('[HTMLRewriter] Found MLA link:', href);
        if (href) scraper.setLink(href);
      }
    })
    .on('a[href*="auto.mercadolibre.com.ar"]', {
      element: (element) => {
        const href = element.getAttribute('href');
        console.log('[HTMLRewriter] Found auto ML link:', href);
        if (href) scraper.setLink(href);
      }
    })
    
    // Titles - capture any text that looks like car titles
    .on('h2', {
      text: (text) => {
        const textContent = text.text.trim();
        if (textContent && textContent.length > 5 && scraper.isValidTitleText(textContent)) {
          console.log('[HTMLRewriter] Found h2 text:', textContent);
          scraper.addTitle(textContent);
        }
      }
    })
    .on('h3', {
      text: (text) => {
        const textContent = text.text.trim();
        if (textContent && textContent.length > 5 && scraper.isValidTitleText(textContent)) {
          console.log('[HTMLRewriter] Found h3 text:', textContent);
          scraper.addTitle(textContent);
        }
      }
    })
    .on('.ui-search-item__title', {
      text: (text) => {
        console.log('[HTMLRewriter] Found item title:', text.text);
        if (text.text) scraper.addTitle(text.text);
      }
    })
    
    // Comprehensive text scanning for car-related content
    .on('*', {
      text: (text) => {
        const textContent = text.text.trim();
        
        // Look for Toyota Yaris patterns specifically
        if (textContent.toLowerCase().includes('toyota') && textContent.toLowerCase().includes('yaris')) {
          console.log('[HTMLRewriter] Found Toyota Yaris text:', textContent);
          scraper.addTitle(textContent);
        }
        
        // Look for car model patterns (brand + model + specs)
        if (textContent.match(/\b(toyota|ford|chevrolet|volkswagen|fiat|honda|nissan)\s+\w+.*?\d.*?(cv|hp|hp|sedan|hatchback|suv)/i)) {
          console.log('[HTMLRewriter] Found car model text:', textContent);
          scraper.addTitle(textContent);
        }
        
        // Look for prices
        if (textContent.match(/^(US\$|USD|\$|ARS)\s*[\d.,]+$/) || textContent.match(/^[\d.,]+\s*(USD|ARS)$/)) {
          console.log('[HTMLRewriter] Found price text:', textContent);
          scraper.addPrice(textContent);
        }
        
        // Look for year/km patterns
        if (textContent.match(/\b20\d{2}\b.*?\d+.*?km/i) || textContent.match(/\d+.*?km.*?\b20\d{2}\b/i)) {
          console.log('[HTMLRewriter] Found year/km text:', textContent);
          scraper.addCarDetails(textContent);
        }
        
        // Look for location patterns
        if (textContent.match(/\b\d{4,5}\s*km\s*\|\s*[A-Z][a-z]+/i)) {
          console.log('[HTMLRewriter] Found location text:', textContent);
          scraper.addCarDetails(textContent);
        }
      }
    })
    
    // Price elements - specific selectors
    .on('[class*="price"]', {
      text: (text) => {
        console.log('[HTMLRewriter] Found price element:', text.text);
        if (text.text) scraper.addPrice(text.text);
      }
    })
    .on('[class*="money"]', {
      text: (text) => {
        console.log('[HTMLRewriter] Found money element:', text.text);
        if (text.text) scraper.addPrice(text.text);
      }
    })
    
    // Images
    .on('img', {
      element: (element) => {
        const dataSrc = element.getAttribute('data-src');
        const src = element.getAttribute('src');
        const thumbnail = dataSrc || src;
        if (thumbnail && thumbnail.includes('http') && (thumbnail.includes('mlstatic.com') || thumbnail.includes('mercadolibre'))) {
          console.log('[HTMLRewriter] Found car image:', thumbnail);
          scraper.setThumbnail(thumbnail);
        }
      }
    })
    
    // Finalize on body end
    .on('body', {
      element: () => {
        console.log('[HTMLRewriter] Processing body end - finalizing products');
        scraper.finalizeCurrentProduct();
      }
    });

  const transformedResponse = rewriter.transform(resp);
  const htmlContent = await transformedResponse.text();
  console.log(`[AutosWorker] HTML length: ${htmlContent.length}`);
  
  // Additional post-processing: extract data from JSON in HTML if present
  const jsonMatches = htmlContent.match(/"results":\s*\[(.*?)\]/);
  if (jsonMatches) {
    console.log('[AutosWorker] Found results JSON in HTML');
    try {
      // Try to extract item IDs from JSON data
      const itemIdMatches = htmlContent.match(/MLA\d+/g);
      if (itemIdMatches) {
        console.log(`[AutosWorker] Found ${itemIdMatches.length} item IDs in JSON`);
        // If we didn't get many products from HTMLRewriter, try to extract from JSON
        if (scraper.products.length < 3) {
          itemIdMatches.slice(0, 10).forEach((id, index) => {
            scraper.startProduct();
            if (scraper.currentProduct) {
              scraper.currentProduct.id = id.replace('MLA', '');
              scraper.currentProduct.title = `${brand} ${model} - Item ${id}`;
              scraper.setLink(`https://auto.mercadolibre.com.ar/${id}`);
            }
          });
        }
      }
    } catch (e) {
      console.log('[AutosWorker] Error processing JSON data:', e.message);
    }
  }
  
  scraper.finalizeCurrentProduct();
  
  const stats = scraper.getStats();
  console.log('[AutosWorker] Final stats:', stats);
  
  // Auto-store if requested
  let storeResult = null;
  if (autoStore && env && env.CAR_LISTINGS && scraper.products.length > 0) {
    try {
      const key = `${brand}-${model}`;
      const value = {
        brand,
        model,
        cars: scraper.products,
        lastUpdated: new Date().toISOString(),
        count: scraper.products.length
      };
      
      await env.CAR_LISTINGS.put(key, JSON.stringify(value));
      storeResult = {
        success: true,
        key,
        stored: scraper.products.length,
        lastUpdated: value.lastUpdated
      };
      console.log(`[AutosWorker] Auto-stored ${scraper.products.length} cars for ${brand}-${model}`);
    } catch (error) {
      console.error('[AutosWorker] Auto-store failed:', error);
      storeResult = {
        success: false,
        error: error.message
      };
    }
  }
  
  return new Response(JSON.stringify({ 
    cars: scraper.products,
    search: {
      brand,
      model,
      searchUrl,
      htmlLength: htmlContent.length,
      stats: stats
    },
    autoStore: storeResult
  }), {
    headers: { 'content-type': 'application/json' }
  });
}

// KV Storage handlers
async function handleStoreCars(request, env, ctx) {
  if (!env.CAR_LISTINGS) {
    return new Response(JSON.stringify({ error: 'KV namespace not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

  const data = await request.json();
  const { brand, model, cars } = data;
  
  if (!brand || !model || !cars) {
    return new Response(JSON.stringify({ error: 'Missing brand, model, or cars data' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const key = `${brand}-${model}`;
  const value = {
    brand,
    model,
    cars,
    lastUpdated: new Date().toISOString(),
    count: cars.length
  };

  await env.CAR_LISTINGS.put(key, JSON.stringify(value));
  
  return new Response(JSON.stringify({ 
    success: true, 
    key, 
    stored: cars.length,
    lastUpdated: value.lastUpdated
  }), {
    headers: { 'content-type': 'application/json' }
  });
}

async function handleGetCars(request, env, ctx) {
  if (!env.CAR_LISTINGS) {
    return new Response(JSON.stringify({ error: 'KV namespace not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const brand = url.searchParams.get('brand');
  const model = url.searchParams.get('model');
  
  if (!brand || !model) {
    return new Response(JSON.stringify({ error: 'Missing brand or model' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const key = `${brand}-${model}`;
  const value = await env.CAR_LISTINGS.get(key);
  
  if (!value) {
    return new Response(JSON.stringify({ error: 'No data found for this brand/model' }), {
      status: 404,
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response(value, {
    headers: { 'content-type': 'application/json' }
  });
}

async function handleGetAllCars(request, env, ctx) {
  if (!env.CAR_LISTINGS) {
    return new Response(JSON.stringify({ error: 'KV namespace not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    // List all keys in the KV namespace
    const listResult = await env.CAR_LISTINGS.list();
    
    if (!listResult.keys || listResult.keys.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No car data found',
        totalCollections: 0,
        collections: []
      }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    // Get all car collections
    const collections = [];
    let totalCars = 0;
    
    for (const key of listResult.keys) {
      try {
        const value = await env.CAR_LISTINGS.get(key.name);
        if (value) {
          const data = JSON.parse(value);
          collections.push({
            key: key.name,
            brand: data.brand,
            model: data.model,
            count: data.count,
            lastUpdated: data.lastUpdated,
            cars: data.cars
          });
          totalCars += data.count || 0;
        }
      } catch (error) {
        console.error(`[GetAllCars] Error processing key ${key.name}:`, error);
        collections.push({
          key: key.name,
          error: 'Failed to parse data'
        });
      }
    }

    // Sort by lastUpdated (most recent first)
    collections.sort((a, b) => {
      if (!a.lastUpdated) return 1;
      if (!b.lastUpdated) return -1;
      return new Date(b.lastUpdated) - new Date(a.lastUpdated);
    });

    return new Response(JSON.stringify({
      totalCollections: collections.length,
      totalCars,
      collections,
      retrievedAt: new Date().toISOString()
    }), {
      headers: { 'content-type': 'application/json' }
    });

  } catch (error) {
    console.error('[GetAllCars] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to retrieve car data',
      details: error.message
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}

async function handleDebugHTML(request, env, ctx) {
  const url = new URL(request.url);
  const brand = url.searchParams.get('brand') || 'toyota';
  const model = url.searchParams.get('model') || 'yaris';
  
  const searchUrl = `https://autos.mercadolibre.com.ar/${brand}/${model}`;
  
  try {
    const resp = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://autos.mercadolibre.com.ar/'
      }
    });

    const html = await resp.text();
    
    // Look for specific patterns
    const patterns = [
      'ui-search-layout__item',
      'ui-search-results__item', 
      'andes-card',
      'Toyota Yaris',
      'toyota.*yaris',
      'MLA-',
      'precio',
      'price',
      'US\\$',
      '\\$.*\\d',
      '1\\.5.*cv',
      '20\\d{2}',  // years
      '\\d+.*km'    // kilometers
    ];
    
    const patternResults = patterns.map(p => {
      const regex = new RegExp(p, 'gi');
      const matches = html.match(regex) || [];
      return { 
        pattern: p, 
        matches: matches.length,
        examples: matches.slice(0, 3)
      };
    });
    
    // Extract meaningful snippets
    const snippets = [];
    
    // Look for car title patterns
    const titleMatches = html.match(/Toyota.*?Yaris.*?(?:cv|sedan|hatchback|suv)/gi) || [];
    snippets.push({ type: 'titles', matches: titleMatches.slice(0, 5) });
    
    // Look for price patterns
    const priceMatches = html.match(/(?:US\$|ARS|\$)\s*[\d.,]+/gi) || [];
    snippets.push({ type: 'prices', matches: priceMatches.slice(0, 5) });
    
    // Look for year/km patterns  
    const detailMatches = html.match(/20\d{2}.*?\d+.*?km/gi) || [];
    snippets.push({ type: 'details', matches: detailMatches.slice(0, 5) });
    
    // Check if we're getting a login redirect
    const hasLogin = html.includes('login') || html.includes('signin') || html.includes('account');
    const hasResults = html.includes('resultados') || html.includes('results');
    const hasCards = html.includes('ui-search') || html.includes('andes-card');
    
    return new Response(JSON.stringify({
      status: resp.status,
      searchUrl,
      htmlLength: html.length,
      analysis: {
        hasLogin,
        hasResults,
        hasCards,
        patterns: patternResults,
        snippets
      },
      htmlPreview: html.substring(0, 1000),
      htmlSample: html.substring(10000, 11000) // Sample from middle
    }, null, 2), {
      headers: { 'content-type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      searchUrl 
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
} 