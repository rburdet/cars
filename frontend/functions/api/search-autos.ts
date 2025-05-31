// Copy the entire MercadoLibreAutosScraper class and related functions from worker
interface CarProduct {
  id: string | null;
  title: string;
  price: { currency: string; amount: number };
  year: number | null;
  kilometers: number | null;
  location: string;
  link: string;
  thumbnail: string;
  description: string;
  publishedDate: string | null;
  seller: {
    type: string;
    name: string;
  };
  features: string[];
}

class MercadoLibreAutosScraper {
  products: CarProduct[];
  limit: number;
  currentProduct: CarProduct | null;
  productCount: number;
  debug: boolean;

  constructor(limit: number) {
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
      if (cleanText.includes('Concesionaria') || cleanText.includes('Dealer')) {
        this.currentProduct.seller.type = 'Concesionaria';
      } else if (cleanText.includes('Dueño') || cleanText.includes('Owner')) {
        this.currentProduct.seller.type = 'Dueño directo';
      }
      
      if (!this.currentProduct.seller.name && cleanText.length > 3) {
        this.currentProduct.seller.name = cleanText;
      }
    }
  }

  setThumbnail(url) {
    if (this.currentProduct && url && !this.currentProduct.thumbnail) {
      this.currentProduct.thumbnail = url;
      this.log(`Set thumbnail: ${url}`);
    }
  }

  getStats() {
    return {
      totalProducts: this.products.length,
      validProducts: this.products.filter(p => p.title && p.link).length,
      withPrices: this.products.filter(p => p.price.amount > 0).length,
      withYears: this.products.filter(p => p.year).length
    };
  }
}

// Helper functions for processing HTML and detecting next page
function detectNextPage(htmlContent, currentPage) {
  // Look for "Siguiente" button or pagination
  const nextPatterns = [
    /<a[^>]*class="[^"]*andes-pagination__button[^"]*andes-pagination__button--next[^"]*"[^>]*href="([^"]+)"/i,
    /<a[^>]*href="([^"]+)"[^>]*class="[^"]*andes-pagination__button[^"]*andes-pagination__button--next[^"]*"/i,
    /<a[^>]*class="[^"]*ui-search-pagination__link[^"]*"[^>]*href="([^"]+)"[^>]*>.*?Siguiente/i,
    /<a[^>]*href="([^"]+)"[^>]*class="[^"]*ui-search-pagination__link[^"]*"[^>]*>.*?Siguiente/i,
    /<a[^>]*class="[^"]*pagination[^"]*next[^"]*"[^>]*href="([^"]+)"/i,
    /<a[^>]*href="([^"]+)"[^>]*class="[^"]*pagination[^"]*next[^"]*"/i
  ];

  for (const pattern of nextPatterns) {
    const match = htmlContent.match(pattern);
    if (match && match[1]) {
      let nextUrl = match[1];
      
      // Handle relative URLs
      if (nextUrl.startsWith('/')) {
        nextUrl = 'https://autos.mercadolibre.com.ar' + nextUrl;
      } else if (nextUrl.startsWith('?')) {
        nextUrl = 'https://autos.mercadolibre.com.ar/toyota/yaris' + nextUrl;
      }
      
      // Decode HTML entities
      nextUrl = nextUrl.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      
      console.log(`[NextPage] Found next page URL: ${nextUrl}`);
      return nextUrl;
    }
  }

  // Alternative: look for page numbers and construct next URL
  const pageNumberPattern = /[?&]_Desde=(\d+)/;
  const currentMatch = htmlContent.match(pageNumberPattern);
  
  if (currentMatch) {
    const currentOffset = parseInt(currentMatch[1]);
    const nextOffset = currentOffset + 50; // MercadoLibre typically uses 50 items per page
    
    // Look for a base URL pattern in the current page
    const baseUrlPattern = /(https:\/\/autos\.mercadolibre\.com\.ar\/[^?]+)/;
    const baseMatch = htmlContent.match(baseUrlPattern);
    
    if (baseMatch) {
      const nextUrl = `${baseMatch[1]}?_Desde=${nextOffset}`;
      console.log(`[NextPage] Constructed next page URL: ${nextUrl}`);
      return nextUrl;
    }
  }

  console.log(`[NextPage] No next page found for page ${currentPage}`);
  return null;
}

async function processAutosResponse(resp, scraper, brand, model, searchUrl, autoStore = false, env = null) {
  const html = await resp.text();
  
  // Create a simple HTML parser using regex
  const parser = {
    currentElement: null,
    currentAttributes: {},
    
    processElement(tagMatch) {
      const [fullMatch, tagName, attributes = '', content = ''] = tagMatch;
      const tag = tagName.toLowerCase();
      
             // Extract attributes
       const attrs: Record<string, string> = {};
       const attrRegex = /(\w+)=["']([^"']*)["']/g;
       let attrMatch;
       while ((attrMatch = attrRegex.exec(attributes)) !== null) {
         attrs[attrMatch[1]] = attrMatch[2];
       }
       
       // Process based on tag and attributes
       if (tag === 'a' && attrs.href) {
         scraper.setLink(attrs.href);
       }
       
       if (tag === 'img' && attrs.src) {
         scraper.setThumbnail(attrs.src);
       }
       
       // Process text content
       if (content && content.trim()) {
         const text = content.replace(/<[^>]*>/g, '').trim();
         if (text) {
           // Determine what type of content this might be
           if (attrs.class) {
             const className = attrs.class.toLowerCase();
            
            if (className.includes('price') || className.includes('precio')) {
              scraper.addPrice(text);
            } else if (className.includes('title') || className.includes('name')) {
              scraper.addTitle(text);
            } else if (className.includes('location') || className.includes('ubicacion')) {
              scraper.addCarDetails(text);
            } else if (className.includes('seller') || className.includes('vendedor')) {
              scraper.setSeller(text);
            } else {
              // Try to auto-detect content type
              if (text.match(/\$|USD|ARS/)) {
                scraper.addPrice(text);
              } else if (text.match(/\b(19|20)\d{2}\b|\d+.*km/)) {
                scraper.addCarDetails(text);
              } else if (text.length > 10 && text.length < 200) {
                scraper.addTitle(text);
              }
            }
          } else {
            // No class, try auto-detection
            if (text.match(/\$|USD|ARS/)) {
              scraper.addPrice(text);
            } else if (text.match(/\b(19|20)\d{2}\b|\d+.*km/)) {
              scraper.addCarDetails(text);
            } else if (text.length > 10 && text.length < 200) {
              scraper.addTitle(text);
            }
          }
        }
      }
    }
  };
  
  // Look for car listing containers
  const listingPatterns = [
    /<div[^>]*class="[^"]*ui-search-result[^"]*"[^>]*>(.*?)<\/div>/gs,
    /<article[^>]*class="[^"]*ui-search-result[^"]*"[^>]*>(.*?)<\/article>/gs,
    /<div[^>]*class="[^"]*andes-card[^"]*"[^>]*>(.*?)<\/div>/gs,
    /<li[^>]*class="[^"]*ui-search-layout__item[^"]*"[^>]*>(.*?)<\/li>/gs
  ];
  
  let foundListings = false;
  
  for (const pattern of listingPatterns) {
    const matches = html.matchAll(pattern);
    
    for (const match of matches) {
      foundListings = true;
      scraper.startProduct();
      
      const listingHtml = match[1];
      
      // Process all elements within this listing
      const elementRegex = /<(\w+)([^>]*?)(?:\/>|>(.*?)<\/\1>)/gs;
      const elementMatches = listingHtml.matchAll(elementRegex);
      
      for (const elementMatch of elementMatches) {
        parser.processElement(elementMatch);
      }
    }
  }
  
  // If no structured listings found, try a more general approach
  if (!foundListings) {
    console.log('[ProcessResponse] No structured listings found, trying general approach');
    
    // Look for any links that might be car listings
    const linkRegex = /<a[^>]*href="([^"]*(?:autos\.mercadolibre\.com\.ar|\/MLA-)[^"]*)"[^>]*>(.*?)<\/a>/gs;
    const linkMatches = html.matchAll(linkRegex);
    
    for (const linkMatch of linkMatches) {
      scraper.startProduct();
      scraper.setLink(linkMatch[1]);
      
      // Extract text content from the link
      const linkContent = linkMatch[2].replace(/<[^>]*>/g, '').trim();
      if (linkContent) {
        scraper.addTitle(linkContent);
      }
    }
  }
  
  scraper.finalizeCurrentProduct();
  
  const stats = scraper.getStats();
  console.log(`[ProcessResponse] Processed page: ${stats.totalProducts} products found`);
  
  return stats.totalProducts > 0;
}

async function handleInfiniteSearch(brand, model, searchUrl, autoStore, env) {
  const scraper = new MercadoLibreAutosScraper(Infinity);
  let currentUrl = searchUrl;
  let pageCount = 0;
  const maxPages = 50; // Safety limit
  
  console.log(`[InfiniteSearch] Starting infinite search for ${brand} ${model}`);
  
  while (currentUrl && pageCount < maxPages) {
    pageCount++;
    console.log(`[InfiniteSearch] Processing page ${pageCount}: ${currentUrl}`);
    
    try {
      const resp = await fetch(currentUrl, {
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
        console.log(`[InfiniteSearch] HTTP error ${resp.status} on page ${pageCount}`);
        break;
      }

      const html = await resp.text();
      
      // Process this page
      const foundProducts = await processAutosResponse(resp, scraper, brand, model, currentUrl, autoStore, env);
      
      if (!foundProducts) {
        console.log(`[InfiniteSearch] No products found on page ${pageCount}, stopping`);
        break;
      }
      
      // Look for next page
      const nextUrl = detectNextPage(html, pageCount);
      
      if (!nextUrl) {
        console.log(`[InfiniteSearch] No next page found after page ${pageCount}`);
        break;
      }
      
      currentUrl = nextUrl;
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
    } catch (error) {
      console.error(`[InfiniteSearch] Error on page ${pageCount}:`, error);
      break;
    }
  }
  
  const finalStats = scraper.getStats();
  console.log(`[InfiniteSearch] Completed: ${pageCount} pages, ${finalStats.totalProducts} total products`);
  
     const result: any = {
     brand,
     model,
     searchUrl,
     cars: scraper.products,
     count: scraper.products.length,
     stats: finalStats,
     pagesProcessed: pageCount,
     lastUpdated: new Date().toISOString()
   };
   
   // Auto-store if requested
   if (autoStore && env && env.CAR_LISTINGS) {
     try {
       const key = `${brand}-${model}`;
       await env.CAR_LISTINGS.put(key, JSON.stringify(result));
       console.log(`[InfiniteSearch] Auto-stored ${result.count} cars with key: ${key}`);
       result.stored = true;
       result.storageKey = key;
     } catch (error: any) {
       console.error('[InfiniteSearch] Auto-store failed:', error);
       result.stored = false;
       result.storageError = error.message;
     }
   }
  
  return result;
}

export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' }
    });
  }

  const brand = url.searchParams.get('brand');
  const model = url.searchParams.get('model');
  const limit = url.searchParams.get('limit');
  const store = url.searchParams.get('store') === 'true';

  if (!brand || !model) {
    return new Response(JSON.stringify({ 
      error: 'Missing required parameters: brand and model',
      example: '/api/search-autos?brand=toyota&model=yaris'
    }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const searchUrl = `https://autos.mercadolibre.com.ar/${brand}/${model}`;

  try {
    // Handle infinite search
    if (limit === 'infinite') {
      const result = await handleInfiniteSearch(brand, model, searchUrl, store, env);
      
      return new Response(JSON.stringify(result), {
        headers: { 
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Handle regular search
    const limitNum = limit ? parseInt(limit) : 20;
    const scraper = new MercadoLibreAutosScraper(limitNum);

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

    if (!resp.ok) {
      return new Response(JSON.stringify({ 
        error: `HTTP ${resp.status}: ${resp.statusText}`,
        searchUrl 
      }), {
        status: resp.status,
        headers: { 'content-type': 'application/json' }
      });
    }

    await processAutosResponse(resp, scraper, brand, model, searchUrl, store, env);

    const result = {
      brand,
      model,
      searchUrl,
      cars: scraper.products,
      count: scraper.products.length,
      stats: scraper.getStats(),
      lastUpdated: new Date().toISOString()
    };

    return new Response(JSON.stringify(result), {
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('[SearchAutos] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to scrape MercadoLibre',
      details: error.message,
      searchUrl 
    }), {
      status: 500,
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 