import { Env } from '../types';

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

  log(message: string, data = '') {
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

  isValidCarListing(product: CarProduct) {
    // Check if this looks like a car listing
    const title = product.title.toLowerCase();
    const hasCarBrand = ['toyota', 'ford', 'chevrolet', 'volkswagen', 'fiat', 'honda', 'nissan', 'peugeot', 'renault', 'hyundai'].some(brand => 
      title.includes(brand)
    );
    const hasCarWords = ['cv', 'sedan', 'hatchback', 'suv', 'pickup'].some(word => title.includes(word));
    const hasValidLink = product.link && product.link.includes('autos.mercadolibre.com.ar');
    
    return hasCarBrand || hasCarWords || hasValidLink;
  }

  addTitle(text: string) {
    if (this.currentProduct && text && text.trim()) {
      const cleanText = text.trim();
      // Avoid adding footer/navigation text
      if (this.isValidTitleText(cleanText)) {
        this.currentProduct.title += cleanText + ' ';
        this.log(`Added title text: "${cleanText}"`);
      }
    }
  }

  isValidTitleText(text: string) {
    const invalidTexts = [
      'mercado libre', 'acerca de', 'otros sitios', 'ayuda', 'mi cuenta',
      'suscripciones', 'temporadas', 'categorías', 'ofertas', 'cupones',
      'vender', 'buscar', 'filtros', 'ordenar', 'anterior', 'siguiente'
    ];
    const textLower = text.toLowerCase();
    return !invalidTexts.some(invalid => textLower.includes(invalid)) && text.length > 2;
  }

  setLink(href: string) {
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

  addPrice(text: string) {
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

  addCarDetails(text: string) {
    if (this.currentProduct && text) {
      const cleanText = text.trim();
      
      // Extract year
      const yearMatch = cleanText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0]);
        if (year >= 1950 && year <= new Date().getFullYear() + 1) {
          this.currentProduct.year = year;
          this.log(`Set year: ${year}`);
        }
      }
      
      // Extract kilometers
      const kmMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*(?:km|kilómetros|kilometros)/i);
      if (kmMatch) {
        const km = parseFloat(kmMatch[1].replace('.', ''));
        if (!isNaN(km) && km > 0) {
          this.currentProduct.kilometers = km;
          this.log(`Set kilometers: ${km}`);
        }
      }
      
      // Extract location
      if (cleanText.includes('Buenos Aires') || cleanText.includes('Capital Federal') || 
          cleanText.includes('Córdoba') || cleanText.includes('Mendoza') ||
          cleanText.includes('Rosario') || cleanText.includes('La Plata')) {
        this.currentProduct.location = cleanText;
        this.log(`Set location: ${cleanText}`);
      }
      
      // Add to features if it looks like a car feature
      if (this.isCarFeature(cleanText)) {
        this.currentProduct.features.push(cleanText);
        this.log(`Added feature: ${cleanText}`);
      }
    }
  }

  isCarFeature(text: string) {
    const features = ['automático', 'manual', 'nafta', 'diesel', 'gnc', 'híbrido', 'eléctrico', 
                     'aire acondicionado', 'abs', 'airbag', 'alarma', 'cierre centralizado'];
    return features.some(feature => text.toLowerCase().includes(feature));
  }

  setSeller(text: string) {
    if (this.currentProduct && text) {
      const cleanText = text.trim();
      if (cleanText.includes('Concesionaria') || cleanText.includes('Agencia')) {
        this.currentProduct.seller.type = 'Concesionaria';
      } else if (cleanText.includes('Dueño') || cleanText.includes('Particular')) {
        this.currentProduct.seller.type = 'Dueño directo';
      }
      
      if (!this.currentProduct.seller.name && cleanText.length > 3) {
        this.currentProduct.seller.name = cleanText;
        this.log(`Set seller: ${cleanText}`);
      }
    }
  }

  setThumbnail(url: string) {
    if (this.currentProduct && url && url.startsWith('http')) {
      this.currentProduct.thumbnail = url;
      this.log(`Set thumbnail: ${url}`);
    }
  }

  getStats() {
    return {
      totalProducts: this.products.length,
      withPrices: this.products.filter(p => p.price.amount > 0).length,
      withYears: this.products.filter(p => p.year).length,
      withKilometers: this.products.filter(p => p.kilometers).length,
      averagePrice: this.products.filter(p => p.price.amount > 0).reduce((sum, p) => sum + p.price.amount, 0) / Math.max(1, this.products.filter(p => p.price.amount > 0).length)
    };
  }
}

function detectNextPage(htmlContent: string, currentPage: number) {
  console.log(`[NextPage] Looking for next page after page ${currentPage}`);
  
  // Look for pagination patterns
  const patterns = [
    // Standard pagination with page numbers
    new RegExp(`<a[^>]*href="([^"]*)"[^>]*>\\s*${currentPage + 1}\\s*</a>`, 'i'),
    // "Siguiente" or "Next" links
    /<a[^>]*href="([^"]*)"[^>]*>\s*(?:Siguiente|Next|›|→)\s*<\/a>/i,
    // Pagination with offset
    /href="([^"]*_Desde_\d+[^"]*)"/i,
    // MercadoLibre specific pagination
    /href="([^"]*_NoIndex_True[^"]*)"/i
  ];
  
  for (const pattern of patterns) {
    const match = htmlContent.match(pattern);
    if (match && match[1]) {
      let nextUrl = match[1];
      
      // Clean up the URL
      nextUrl = nextUrl.replace(/&amp;/g, '&');
      
      // Make sure it's a full URL
      if (nextUrl.startsWith('/')) {
        nextUrl = 'https://autos.mercadolibre.com.ar' + nextUrl;
      } else if (!nextUrl.startsWith('http')) {
        nextUrl = 'https://autos.mercadolibre.com.ar/' + nextUrl;
      }
      
      console.log(`[NextPage] Found next page URL: ${nextUrl}`);
      return nextUrl;
    }
  }
  
  // Look for offset-based pagination
  const offsetMatch = htmlContent.match(/_Desde_(\d+)/);
  if (offsetMatch) {
    const currentOffset = parseInt(offsetMatch[1]);
    const nextOffset = currentOffset + 50; // MercadoLibre typically uses 50 items per page
    const baseUrl = htmlContent.match(/https:\/\/[^"]*autos\.mercadolibre\.com\.ar[^"]*(?=_Desde_)/);
    if (baseUrl) {
      const nextUrl = `${baseUrl[0]}_Desde_${nextOffset}`;
      console.log(`[NextPage] Generated offset-based next URL: ${nextUrl}`);
      return nextUrl;
    }
  }
  
  console.log(`[NextPage] No next page found`);
  return null;
}

async function processAutosResponse(resp: Response, scraper: MercadoLibreAutosScraper, brand: string, model: string, searchUrl: string, autoStore = false, env: Env | null = null) {
  const html = await resp.text();
  
  // Simple HTML parsing using regex (since we can't use DOM parser in Workers)
  const tagRegex = /<(\w+)([^>]*)>(.*?)<\/\1>|<(\w+)([^>]*)\/?>/gs;
  let match;
  
  function processElement(tagMatch: RegExpMatchArray) {
    const [fullMatch, tagName1, attrs1, content1, tagName2, attrs2] = tagMatch;
    const tagName = tagName1 || tagName2;
    const attrs = attrs1 || attrs2 || '';
    const content = content1 || '';
    
    if (!tagName) return;
    
    // Look for product containers
    if ((tagName === 'div' || tagName === 'article') && 
        (attrs.includes('ui-search-result') || attrs.includes('item-result') || attrs.includes('listing-item'))) {
      scraper.startProduct();
    }
    
    // Extract links
    if (tagName === 'a' && attrs.includes('href')) {
      const hrefMatch = attrs.match(/href=["']([^"']+)["']/);
      if (hrefMatch) {
        scraper.setLink(hrefMatch[1]);
      }
    }
    
    // Extract images
    if (tagName === 'img' && attrs.includes('src')) {
      const srcMatch = attrs.match(/src=["']([^"']+)["']/);
      if (srcMatch) {
        scraper.setThumbnail(srcMatch[1]);
      }
    }
    
    // Process text content
    if (content && content.trim()) {
      const cleanContent = content.replace(/<[^>]*>/g, '').trim();
      if (cleanContent) {
        // Check if it looks like a title
        if (cleanContent.length > 10 && cleanContent.length < 200) {
          scraper.addTitle(cleanContent);
        }
        
        // Check if it looks like a price
        if (cleanContent.match(/[\$\d.,]+/) && cleanContent.length < 50) {
          scraper.addPrice(cleanContent);
        }
        
        // Check if it contains car details
        if (cleanContent.match(/\d{4}|\d+\s*km|Buenos Aires|Capital Federal/i)) {
          scraper.addCarDetails(cleanContent);
        }
        
        // Check if it's seller info
        if (cleanContent.includes('Concesionaria') || cleanContent.includes('Dueño')) {
          scraper.setSeller(cleanContent);
        }
      }
    }
    
    // Recursively process nested content
    if (content) {
      let nestedMatch;
      const nestedRegex = /<(\w+)([^>]*)>(.*?)<\/\1>|<(\w+)([^>]*)\/?>/gs;
      while ((nestedMatch = nestedRegex.exec(content)) !== null) {
        processElement(nestedMatch);
      }
    }
  }
  
  while ((match = tagRegex.exec(html)) !== null) {
    processElement(match);
  }
  
  // Finalize the last product
  scraper.finalizeCurrentProduct();
  
  console.log(`[ProcessResponse] Found ${scraper.products.length} products for ${brand} ${model}`);
  
  // Auto-store if requested
  if (autoStore && env && env.CAR_LISTINGS && scraper.products.length > 0) {
    try {
      const key = `${brand}-${model}`;
      const result = {
        brand,
        model,
        searchUrl,
        cars: scraper.products,
        count: scraper.products.length,
        stats: scraper.getStats(),
        lastUpdated: new Date().toISOString()
      };
      
      await env.CAR_LISTINGS.put(key, JSON.stringify(result));
      console.log(`[ProcessResponse] Auto-stored ${scraper.products.length} cars with key: ${key}`);
    } catch (error) {
      console.error('[ProcessResponse] Auto-store failed:', error);
    }
  }
  
  return scraper.products.length > 0;
}

async function handleInfiniteSearch(brand: string, model: string, searchUrl: string, autoStore: boolean, env: Env) {
  console.log(`[InfiniteSearch] Starting infinite search for ${brand} ${model}`);
  
  const scraper = new MercadoLibreAutosScraper(Infinity);
  let currentUrl = searchUrl;
  let pageCount = 0;
  const maxPages = 50; // Safety limit
  
  while (pageCount < maxPages) {
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

export async function searchAutos(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  
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
        headers: { 'content-type': 'application/json' }
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
      headers: { 'content-type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[SearchAutos] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to scrape MercadoLibre',
      details: error.message,
      searchUrl 
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
} 