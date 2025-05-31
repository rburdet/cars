import { Env } from '../types';

interface CarCollection {
  key: string;
  brand?: string;
  model?: string;
  count?: number;
  lastUpdated?: string;
  cars?: any[];
  error?: string;
}

export async function getAllCars(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' }
    });
  }

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
    const collections: CarCollection[] = [];
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
    collections.sort((a: CarCollection, b: CarCollection) => {
      if (!a.lastUpdated) return 1;
      if (!b.lastUpdated) return -1;
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    });

    return new Response(JSON.stringify({
      totalCollections: collections.length,
      totalCars,
      collections,
      retrievedAt: new Date().toISOString()
    }), {
      headers: { 'content-type': 'application/json' }
    });

  } catch (error: any) {
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