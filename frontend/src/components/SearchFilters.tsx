import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, X } from 'lucide-react';

interface SearchFiltersProps {
  onSearch: (query: string) => void;
  onFilter: (filters: {
    brand?: string;
    model?: string;
    minPrice?: string;
    maxPrice?: string;
    year?: string;
  }) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function SearchFilters({ onSearch, onFilter, onClear, isLoading }: SearchFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    brand: '',
    model: '',
    minPrice: '',
    maxPrice: '',
    year: '',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Apply filters automatically when they change
    const activeFilters = Object.fromEntries(
      Object.entries(newFilters).filter(([_, v]) => v.trim() !== '')
    );
    onFilter(activeFilters);
  };

  const handleClear = () => {
    setSearchQuery('');
    setFilters({
      brand: '',
      model: '',
      minPrice: '',
      maxPrice: '',
      year: '',
    });
    onClear();
  };

  const hasActiveFilters = Object.values(filters).some(v => v.trim() !== '') || searchQuery.trim() !== '';

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar autos (ej: Toyota Yaris, Honda Civic, etc.)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={isLoading || !searchQuery.trim()}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
              >
                <X className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros Avanzados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Marca</label>
                <Input
                  type="text"
                  placeholder="Toyota, Ford, etc."
                  value={filters.brand}
                  onChange={(e) => handleFilterChange('brand', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Modelo</label>
                <Input
                  type="text"
                  placeholder="Yaris, Focus, etc."
                  value={filters.model}
                  onChange={(e) => handleFilterChange('model', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Precio Mín.</label>
                <Input
                  type="number"
                  placeholder="1000000"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Precio Máx.</label>
                <Input
                  type="number"
                  placeholder="5000000"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Año</label>
                <Input
                  type="number"
                  placeholder="2020"
                  min="1990"
                  max={new Date().getFullYear()}
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 