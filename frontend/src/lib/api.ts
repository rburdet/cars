import axios from 'axios';

// Use relative URLs for same-domain deployment (Cloudflare Workers Static Assets)
// In production, this will be the same domain as the frontend
// In development with wrangler dev, use localhost
const API_BASE_URL = import.meta.env.PROD 
  ? '' // Production: same domain (Workers Static Assets)
  : (import.meta.env.DEV ? 'http://localhost:8787' : ''); // Development: local wrangler dev

export interface Car {
  id: string;
  title: string;
  price: {
    currency: string;
    amount: number;
  };
  year?: number;
  kilometers?: number;
  location?: string;
  link: string;
  thumbnail?: string;
  seller?: {
    type: string;
    name: string;
  };
  features?: string[];
}

export interface CarsResponse {
  cars: Car[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: {
    brand?: string;
    model?: string;
  };
}

export interface SearchResponse {
  cars: Car[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  query: string;
  filters: {
    minPrice?: string;
    maxPrice?: string;
    year?: string;
  };
}

export interface StatsResponse {
  totalCars: number;
  totalCollections: number;
  brands: string[];
  uniqueLocations: number;
  yearRange?: {
    min: number;
    max: number;
  };
  collections: Array<{
    key: string;
    brand: string;
    model: string;
    totalCars?: number;
    scrapedAt?: string;
  }>;
}

export interface Collection {
  brand: string;
  model: string;
  cars: Car[];
  lastUpdated: string;
  count: number;
  scrapingMethod?: string;
  pagesScraped?: number;
  executionTimeMs?: number;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const carsApi = {
  // Get all cars with pagination and filters
  getCars: async (params?: {
    page?: number;
    limit?: number;
    brand?: string;
    model?: string;
  }): Promise<CarsResponse> => {
    // For now, use the search endpoint with default brand/model
    const response = await api.get('/api/search-autos', { 
      params: { 
        brand: params?.brand || 'toyota',
        model: params?.model || 'yaris',
        limit: params?.limit || 20
      } 
    });
    
    // Transform the response to match expected format
    const data = response.data;
    return {
      cars: data.cars || [],
      pagination: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        total: data.count || 0,
        totalPages: Math.ceil((data.count || 0) / (params?.limit || 20)),
        hasNext: false,
        hasPrev: false
      }
    };
  },

  // Get ALL cars without pagination (for table view)
  getAllCars: async (): Promise<Car[]> => {
    try {
      const response = await api.get('/api/get-all-cars');
      // Transform the collections response to a flat array of cars
      const collections = response.data.collections || [];
      const allCars: Car[] = [];
      
      collections.forEach((collection: any) => {
        if (collection.cars && Array.isArray(collection.cars)) {
          allCars.push(...collection.cars);
        }
      });
      
      return allCars;
    } catch (error) {
      console.error('Error fetching all cars:', error);
      return [];
    }
  },

  // Search cars with filters
  searchCars: async (params: {
    q: string;
    page?: number;
    limit?: number;
    minPrice?: string;
    maxPrice?: string;
    year?: string;
  }): Promise<SearchResponse> => {
    // Parse the search query to extract brand and model
    const queryParts = params.q.toLowerCase().split(' ');
    const brand = queryParts[0] || 'toyota';
    const model = queryParts[1] || 'yaris';
    
    const response = await api.get('/api/search-autos', { 
      params: { 
        brand,
        model,
        limit: params.limit || 20
      } 
    });
    
    const data = response.data;
    return {
      cars: data.cars || [],
      pagination: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        total: data.count || 0,
        totalPages: Math.ceil((data.count || 0) / (params?.limit || 20)),
        hasNext: false,
        hasPrev: false
      },
      query: params.q,
      filters: {
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        year: params.year
      }
    };
  },

  // Get statistics
  getStats: async (): Promise<StatsResponse> => {
    try {
      const response = await api.get('/api/get-all-cars');
      const data = response.data;
      
      // Transform collections data to stats format
      const collections = data.collections || [];
      const allCars: Car[] = [];
      const brands = new Set<string>();
      const locations = new Set<string>();
      let minYear = Infinity;
      let maxYear = -Infinity;
      
      collections.forEach((collection: any) => {
        if (collection.cars && Array.isArray(collection.cars)) {
          allCars.push(...collection.cars);
          brands.add(collection.brand);
          
          collection.cars.forEach((car: Car) => {
            if (car.location) locations.add(car.location);
            if (car.year) {
              minYear = Math.min(minYear, car.year);
              maxYear = Math.max(maxYear, car.year);
            }
          });
        }
      });
      
      return {
        totalCars: allCars.length,
        totalCollections: collections.length,
        brands: Array.from(brands),
        uniqueLocations: locations.size,
        yearRange: minYear !== Infinity ? { min: minYear, max: maxYear } : undefined,
        collections: collections.map((c: any) => ({
          key: c.key,
          brand: c.brand,
          model: c.model,
          totalCars: c.count,
          scrapedAt: c.lastUpdated
        }))
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        totalCars: 0,
        totalCollections: 0,
        brands: [],
        uniqueLocations: 0,
        collections: []
      };
    }
  },

  // Get specific brand/model collection
  getCollection: async (brand: string, model: string): Promise<Collection> => {
    const response = await api.get('/api/get-cars', { 
      params: { brand, model } 
    });
    return response.data;
  },

  // Legacy endpoints for backward compatibility
  getAllCollections: async () => {
    const response = await api.get('/api/get-all-cars');
    return response.data;
  },

  scrapeAndStore: async (brand: string, model: string, limit?: string) => {
    const params = new URLSearchParams({
      brand,
      model,
      store: 'true',
    });
    if (limit) params.append('limit', limit);
    
    const response = await api.get(`/api/search-autos?${params}`);
    return response.data;
  },
};

export default carsApi; 