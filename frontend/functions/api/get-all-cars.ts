export async function onRequest(context: any) {
  const { request, env } = context;
  
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        headers: { 
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
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
    collections.sort((a: any, b: any) => {
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
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('[GetAllCars] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to retrieve car data',
      details: error.message
    }), {
      status: 500,
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 