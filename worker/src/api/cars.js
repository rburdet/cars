// API endpoints for car data
export class CarsAPI {
    constructor(env) {
        this.env = env;
    }

    async handleRequest(request) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // CORS headers for frontend
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            if (path === '/api/cars' && method === 'GET') {
                return this.getAllCars(url, corsHeaders);
            } else if (path === '/api/cars/search' && method === 'GET') {
                return this.searchCars(url, corsHeaders);
            } else if (path === '/api/cars/stats' && method === 'GET') {
                return this.getStats(corsHeaders);
            } else if (path.startsWith('/api/cars/') && method === 'GET') {
                const brand = path.split('/')[3];
                const model = path.split('/')[4];
                return this.getCarsByBrandModel(brand, model, corsHeaders);
            } else if (path.startsWith('/api/cars/') && method === 'DELETE') {
                const brand = path.split('/')[3];
                const model = path.split('/')[4];
                return this.deleteCarCollection(brand, model, corsHeaders);
            }

            return new Response('Not Found', { status: 404, headers: corsHeaders });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    async getAllCars(url, corsHeaders) {
        const searchParams = url.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const brand = searchParams.get('brand');
        const model = searchParams.get('model');

        try {
            // Get all stored collections
            const collections = await this.env.CAR_LISTINGS.list();
            let allCars = [];

            for (const key of collections.keys) {
                const data = await this.env.CAR_LISTINGS.get(key.name);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (parsed.cars) {
                        // Filter by brand/model if specified
                        let cars = parsed.cars;
                        if (brand) {
                            cars = cars.filter(car => 
                                car.title?.toLowerCase().includes(brand.toLowerCase())
                            );
                        }
                        if (model) {
                            cars = cars.filter(car => 
                                car.title?.toLowerCase().includes(model.toLowerCase())
                            );
                        }
                        allCars.push(...cars);
                    }
                }
            }

            // Remove duplicates and sort by extraction date
            const uniqueCars = this.removeDuplicates(allCars);
            uniqueCars.sort((a, b) => new Date(b.extractedAt) - new Date(a.extractedAt));

            // Pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedCars = uniqueCars.slice(startIndex, endIndex);

            const response = {
                cars: paginatedCars,
                pagination: {
                    page,
                    limit,
                    total: uniqueCars.length,
                    totalPages: Math.ceil(uniqueCars.length / limit),
                    hasNext: endIndex < uniqueCars.length,
                    hasPrev: page > 1
                },
                filters: { brand, model }
            };

            return new Response(JSON.stringify(response), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to fetch cars' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    async getCarsByBrandModel(brand, model, corsHeaders) {
        const key = `${brand}-${model}`;
        
        try {
            const data = await this.env.CAR_LISTINGS.get(key);
            if (!data) {
                return new Response(JSON.stringify({ error: 'Collection not found' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const parsed = JSON.parse(data);
            return new Response(JSON.stringify(parsed), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to fetch collection' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    async searchCars(url, corsHeaders) {
        const searchParams = url.searchParams;
        const query = searchParams.get('q')?.toLowerCase();
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const year = searchParams.get('year');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!query) {
            return new Response(JSON.stringify({ error: 'Query parameter required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        try {
            // Get all cars
            const collections = await this.env.CAR_LISTINGS.list();
            let allCars = [];

            for (const key of collections.keys) {
                const data = await this.env.CAR_LISTINGS.get(key.name);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (parsed.cars) {
                        allCars.push(...parsed.cars);
                    }
                }
            }

            // Filter cars based on search criteria
            let filteredCars = allCars.filter(car => {
                const titleMatch = car.title?.toLowerCase().includes(query);
                const locationMatch = car.location?.toLowerCase().includes(query);
                return titleMatch || locationMatch;
            });

            // Apply additional filters
            if (minPrice) {
                filteredCars = filteredCars.filter(car => {
                    const price = this.extractPrice(car.price);
                    return price >= parseInt(minPrice);
                });
            }

            if (maxPrice) {
                filteredCars = filteredCars.filter(car => {
                    const price = this.extractPrice(car.price);
                    return price <= parseInt(maxPrice);
                });
            }

            if (year) {
                filteredCars = filteredCars.filter(car => car.year == year);
            }

            // Remove duplicates and sort
            const uniqueCars = this.removeDuplicates(filteredCars);
            uniqueCars.sort((a, b) => new Date(b.extractedAt) - new Date(a.extractedAt));

            // Pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedCars = uniqueCars.slice(startIndex, endIndex);

            const response = {
                cars: paginatedCars,
                pagination: {
                    page,
                    limit,
                    total: uniqueCars.length,
                    totalPages: Math.ceil(uniqueCars.length / limit),
                    hasNext: endIndex < uniqueCars.length,
                    hasPrev: page > 1
                },
                query,
                filters: { minPrice, maxPrice, year }
            };

            return new Response(JSON.stringify(response), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Search failed' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    async getStats(corsHeaders) {
        try {
            const collections = await this.env.CAR_LISTINGS.list();
            let totalCars = 0;
            let brands = new Set();
            let models = new Set();
            let locations = new Set();
            let years = new Set();
            let collectionsData = [];

            for (const key of collections.keys) {
                const data = await this.env.CAR_LISTINGS.get(key.name);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (parsed.cars) {
                        totalCars += parsed.cars.length;
                        
                        collectionsData.push({
                            key: key.name,
                            brand: parsed.brand,
                            model: parsed.model,
                            totalCars: parsed.totalCars,
                            scrapedAt: parsed.scrapedAt
                        });

                        parsed.cars.forEach(car => {
                            // Extract brand from title
                            const titleWords = car.title?.toLowerCase().split(' ') || [];
                            if (titleWords.length > 0) {
                                brands.add(titleWords[0]);
                            }
                            
                            if (car.location) locations.add(car.location);
                            if (car.year) years.add(car.year);
                        });
                    }
                }
            }

            const stats = {
                totalCars,
                totalCollections: collections.keys.length,
                brands: Array.from(brands).sort(),
                uniqueLocations: locations.size,
                yearRange: years.size > 0 ? {
                    min: Math.min(...Array.from(years)),
                    max: Math.max(...Array.from(years))
                } : null,
                collections: collectionsData.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt))
            };

            return new Response(JSON.stringify(stats), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to get stats' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    removeDuplicates(cars) {
        const seen = new Set();
        return cars.filter(car => {
            if (seen.has(car.id)) {
                return false;
            }
            seen.add(car.id);
            return true;
        });
    }

    extractPrice(priceString) {
        if (!priceString) return 0;
        const numbers = priceString.replace(/[^\d]/g, '');
        return parseInt(numbers) || 0;
    }

    async deleteCarCollection(brand, model, corsHeaders) {
        const key = `${brand}-${model}`;
        
        try {
            const data = await this.env.CAR_LISTINGS.get(key);
            if (!data) {
                return new Response(JSON.stringify({ error: 'Collection not found' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            await this.env.CAR_LISTINGS.delete(key);
            return new Response(JSON.stringify({ message: 'Collection deleted' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to delete collection' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
} 