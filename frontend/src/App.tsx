import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CarsTable } from '@/components/CarsTable'
import { carsApi } from '@/lib/api'
import { Loader2, Car as CarIcon } from 'lucide-react'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
})

function CarsApp() {
  // All cars query (for table view)
  const allCarsQuery = useQuery({
    queryKey: ['allCars'],
    queryFn: async () => {
      console.log('🔄 Fetching all cars...')
      try {
        const result = await carsApi.getAllCars()
        console.log('✅ Cars fetched successfully:', result.length, 'cars')
        return result
      } catch (error) {
        console.error('❌ Error fetching cars:', error)
        throw error
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  const { data, isLoading, error } = allCarsQuery

  // Debug logging
  console.log('Query state:', { 
    isLoading, 
    error: error?.message, 
    dataCount: Array.isArray(data) ? data.length : 'not array',
    data: data ? 'exists' : 'null'
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <CarIcon className="h-10 w-10 text-blue-600" />
            MercadoLibre Autos
          </h1>
          <p className="text-gray-600 text-lg">
            Explora miles de autos disponibles en Argentina
          </p>
        </div>

        <div className="space-y-6">
          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Cargando autos...
                </h3>
                <p className="text-gray-600">
                  Esto puede tomar unos segundos
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results Info */}
          {Array.isArray(data) && data.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      Mostrando todos los autos disponibles
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {data.length.toLocaleString()} autos encontrados
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-red-200">
              <CardContent className="p-6 text-center">
                <p className="text-red-600 mb-4">
                  Error al cargar los autos: {error.message || 'Error desconocido'}
                </p>
                <Button onClick={() => allCarsQuery.refetch()}>
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* TanStack Table */}
          {!isLoading && (
            <CarsTable 
              cars={Array.isArray(data) ? data : []} 
              isLoading={isLoading}
            />
          )}

          {/* No Results */}
          {Array.isArray(data) && data.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <CarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron autos
                </h3>
                <p className="text-gray-600 mb-4">
                  No hay autos disponibles en este momento.
                </p>
                <Button onClick={() => allCarsQuery.refetch()}>
                  Reintentar carga
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CarsApp />
    </QueryClientProvider>
  )
}

export default App
