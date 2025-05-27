import axios from 'axios';

const API_BASE_URL = 'https://ml-autos-scraper.rodrigoburdet.workers.dev';

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
    const response = await api.get('/api/cars', { params });
    return response.data;
  },

  // Get ALL cars without pagination (for table view)
  getAllCars: async (): Promise<Car[]> => {
    try {
      // Try the new API endpoint first
      const response = await api.get('/api/cars', { 
        params: { limit: 10000 } // Request a very high limit to get all cars
      });
      return response.data.cars || [];
    } catch (error) {
      // Fallback to the legacy endpoint
      console.log('Trying legacy endpoint...');
      const response = await api.get('/get-all-cars');
      // Transform the collections response to a flat array of cars
      const collections = response.data.collections || [];
      const allCars: Car[] = [];
      
      collections.forEach((collection: any) => {
        if (collection.cars && Array.isArray(collection.cars)) {
          allCars.push(...collection.cars);
        }
      });
      
      return allCars;
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
    const response = await api.get('/api/cars/search', { params });
    return response.data;
  },

  // Get statistics
  getStats: async (): Promise<StatsResponse> => {
    const response = await api.get('/api/cars/stats');
    return response.data;
  },

  // Get specific brand/model collection
  getCollection: async (brand: string, model: string): Promise<Collection> => {
    const response = await api.get(`/api/cars/${brand}/${model}`);
    return response.data;
  },

  // Legacy endpoints for backward compatibility
  getAllCollections: async () => {
    const response = await api.get('/get-all-cars');
    return response.data;
  },

  scrapeAndStore: async (brand: string, model: string, limit?: string) => {
    const params = new URLSearchParams({
      brand,
      model,
      store: 'true',
    });
    if (limit) params.append('limit', limit);
    
    const response = await api.get(`/search-autos?${params}`);
    return response.data;
  },
};

export default carsApi; 