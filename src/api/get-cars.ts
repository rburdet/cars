import { Env } from '../types';

export async function getCars(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  
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
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response(value, {
    headers: { 'content-type': 'application/json' }
  });
} 