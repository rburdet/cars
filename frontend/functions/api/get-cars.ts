export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  
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

  const brand = url.searchParams.get('brand');
  const model = url.searchParams.get('model');

  if (!brand || !model) {
    return new Response(JSON.stringify({ 
      error: 'Missing required parameters: brand and model',
      example: '/api/get-cars?brand=toyota&model=yaris'
    }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const key = `${brand}-${model}`;
  const value = await env.CAR_LISTINGS.get(key);
  
  if (!value) {
    return new Response(JSON.stringify({ error: 'No data found for this brand/model' }), {
      status: 404,
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return new Response(value, {
    headers: { 
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
} 