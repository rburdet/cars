import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { carsApi } from '@/lib/api';
import { Car, Calendar, Database, MapPin, TrendingUp } from 'lucide-react';

export function StatsDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: carsApi.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <p className="text-red-600">Error al cargar estadísticas</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Autos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCars.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Autos disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colecciones</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCollections}</div>
            <p className="text-xs text-muted-foreground">
              Marcas y modelos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ubicaciones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueLocations}</div>
            <p className="text-xs text-muted-foreground">
              Ubicaciones únicas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rango de Años</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.yearRange ? `${stats.yearRange.min} - ${stats.yearRange.max}` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Años disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Brands */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Marcas Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.brands.map((brand) => (
              <Badge key={brand} variant="secondary" className="capitalize">
                {brand}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Collections */}
      <Card>
        <CardHeader>
          <CardTitle>Colecciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.collections.slice(0, 5).map((collection) => (
              <div key={collection.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium capitalize">
                    {collection.brand} {collection.model}
                  </div>
                  <div className="text-sm text-gray-600">
                    {collection.totalCars ? `${collection.totalCars} autos` : 'Sin datos de cantidad'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {collection.scrapedAt 
                      ? new Date(collection.scrapedAt).toLocaleDateString('es-AR')
                      : 'Fecha no disponible'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 