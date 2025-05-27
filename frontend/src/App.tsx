import { useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CarCard } from '@/components/CarCard'
import { CarsTable } from '@/components/CarsTable'
import { SearchFilters } from '@/components/SearchFilters'
import { StatsDashboard } from '@/components/StatsDashboard'
import { carsApi, type CarsResponse, type SearchResponse } from '@/lib/api'
import { ChevronLeft, ChevronRight, Loader2, Car as CarIcon } from 'lucide-react'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [searchMode, setSearchMode] = useState<'browse' | 'search'>('browse')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('cards')
  const [filters, setFilters] = useState<{
    brand?: string
    model?: string
    minPrice?: string
    maxPrice?: string
    year?: string
  }>({})

  const limit = 12

  // Browse mode query (for cards view)
  const browseQuery = useQuery({
    queryKey: ['cars', currentPage, filters],
    queryFn: () => carsApi.getCars({
      page: currentPage,
      limit,
      ...filters,
    }),
    enabled: searchMode === 'browse' && activeTab === 'cards',
  })

  // Search mode query (for cards view)
  const searchQueryData = useQuery({
    queryKey: ['search', searchQuery, currentPage, filters],
    queryFn: () => carsApi.searchCars({
      q: searchQuery,
      page: currentPage,
      limit,
      ...filters,
    }),
    enabled: searchMode === 'search' && !!searchQuery && activeTab === 'cards',
  })

  // All cars query (for table view)
  const allCarsQuery = useQuery({
    queryKey: ['allCars'],
    queryFn: () => carsApi.getAllCars(),
    enabled: activeTab === 'table',
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  const currentQuery = activeTab === 'table' 
    ? allCarsQuery 
    : (searchMode === 'search' ? searchQueryData : browseQuery)
  
  const { data, isLoading, error } = currentQuery

  // Transform data for consistent structure
  const displayData = activeTab === 'table' && Array.isArray(data)
    ? { 
        cars: data, 
        pagination: { 
          total: data.length,
          page: 1,
          limit: data.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        } 
      }
    : data as CarsResponse | SearchResponse

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSearchMode('search')
    setCurrentPage(1)
  }

  const handleFilter = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleClear = () => {
    setSearchQuery('')
    setFilters({})
    setSearchMode('browse')
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

        <Tabs defaultValue="cards" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="cards">Vista Tarjetas</TabsTrigger>
            <TabsTrigger value="table">Vista Tabla</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="space-y-6">
            {/* Search and Filters */}
            <SearchFilters
              onSearch={handleSearch}
              onFilter={handleFilter}
              onClear={handleClear}
              isLoading={isLoading}
            />

            {/* Results Info */}
            {data && !Array.isArray(data) && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {searchMode === 'search' ? (
                          <>Resultados para "<strong>{searchQuery}</strong>"</>
                        ) : (
                          'Explorando todos los autos'
                        )}
                      </span>
                      {Object.keys(filters).length > 0 && (
                        <div className="flex gap-2">
                          {Object.entries(filters).map(([key, value]) => (
                            value && (
                              <Badge key={key} variant="outline">
                                {key}: {value}
                              </Badge>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {data.pagination.total.toLocaleString()} autos encontrados
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Cargando autos...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="border-red-200">
                <CardContent className="p-6 text-center">
                  <p className="text-red-600 mb-4">
                    Error al cargar los autos. Por favor, intenta nuevamente.
                  </p>
                  <Button onClick={() => currentQuery.refetch()}>
                    Reintentar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Cars Grid */}
            {data && !Array.isArray(data) && data.cars.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {data.cars.map((car) => (
                    <CarCard key={car.id || car.link} car={car} />
                  ))}
                </div>

                {/* Pagination */}
                {data.pagination.totalPages > 1 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Página {data.pagination.page} de {data.pagination.totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={!data.pagination.hasPrev}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          
                          {/* Page Numbers */}
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                              const page = Math.max(1, Math.min(
                                data.pagination.totalPages - 4,
                                Math.max(1, currentPage - 2)
                              )) + i
                              
                              if (page > data.pagination.totalPages) return null
                              
                              return (
                                <Button
                                  key={page}
                                  variant={page === currentPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(page)}
                                >
                                  {page}
                                </Button>
                              )
                            })}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={!data.pagination.hasNext}
                          >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* No Results */}
            {data && !Array.isArray(data) && data.cars.length === 0 && !isLoading && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No se encontraron autos
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchMode === 'search' 
                      ? 'Intenta con otros términos de búsqueda o ajusta los filtros.'
                      : 'No hay autos disponibles en este momento.'
                    }
                  </p>
                  <Button onClick={handleClear}>
                    Limpiar filtros
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="table" className="space-y-6">
            {/* Results Info */}
            {Array.isArray(data) && (
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
                    Error al cargar los autos. Por favor, intenta nuevamente.
                  </p>
                  <Button onClick={() => allCarsQuery.refetch()}>
                    Reintentar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* TanStack Table */}
            <CarsTable 
              cars={Array.isArray(data) ? data : []} 
              isLoading={isLoading}
            />

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
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="stats">
            <StatsDashboard />
          </TabsContent>
        </Tabs>
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
