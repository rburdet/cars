import { searchAutos } from './api/search-autos';
import { getCars } from './api/get-cars';
import { getAllCars } from './api/get-all-cars';

export interface Env {
  ASSETS: Fetcher;
  CAR_LISTINGS: KVNamespace;
  NODE_ENV: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      // Add CORS headers for all API responses
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      };

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }

      let response: Response;

      try {
        // Route API requests
        if (url.pathname === '/api/search-autos') {
          response = await searchAutos(request, env);
        } else if (url.pathname === '/api/get-cars') {
          response = await getCars(request, env);
        } else if (url.pathname === '/api/get-all-cars') {
          response = await getAllCars(request, env);
        } else {
          response = new Response('API endpoint not found', { status: 404 });
        }

        // Add CORS headers to the response
        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newHeaders.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      } catch (error) {
        console.error('API Error:', error);
        return new Response('Internal Server Error', { 
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    // Handle static assets (frontend)
    return env.ASSETS.fetch(request);
  },
}; 