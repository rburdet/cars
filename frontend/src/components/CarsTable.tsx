import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ChevronUp, ChevronDown, Search, ExternalLink, Filter, X, Grid, List, Calendar, Gauge, MapPin, User } from 'lucide-react';
import { getDollarRate, convertToUSD, formatUSD, getOriginalPriceDisplay } from '@/lib/currency';

interface Car {
  id: string;
  title: string;
  price: {
    currency: string;
    amount: number | string;
  };
  year?: number;
  kilometers?: number;
  location?: string;
  link: string;
  thumbnail?: string;
  seller?: {
    type: string;
    name: string;
  };
  features?: string[];
  priceUSD?: number;
}

interface CarsTableProps {
  cars: Car[];
  isLoading?: boolean;
}

interface FilterState {
  priceRange: { min: string; max: string };
  yearRange: { min: string; max: string };
  kmRange: { min: string; max: string };
  location: string;
  sellerType: string;
}

// Simple select components to avoid dependency issues
const SimpleSelect: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}> = ({ value, onValueChange, placeholder, options }) => (
  <select
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">{placeholder}</option>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// Mobile Car Card Component
const MobileCarCard: React.FC<{ car: Car }> = ({ car }) => {
  const formatKilometers = (km?: number) => {
    if (!km) return null;
    return `${km.toLocaleString()} km`;
  };

  const getImageUrl = (thumbnail?: string) => {
    if (!thumbnail) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA2NCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NEwyOCAzMkgyMFYyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
    return thumbnail;
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        <div className="relative">
          <img
            src={getImageUrl(car.thumbnail)}
            alt={car.title}
            className="w-full h-40 sm:h-48 object-cover rounded-t-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA2NCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NEwyOCAzMkgyMFYyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
            }}
          />
          {car.year && (
            <Badge className="absolute top-2 right-2 bg-blue-600 text-white">
              {car.year}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-lg mb-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[3.5rem]">
          {car.title}
        </CardTitle>
        
        <div className="flex-1 space-y-2 mb-3">
          <div className="text-lg sm:text-2xl font-bold text-green-600">
            {formatUSD(car.priceUSD || 0)}
          </div>
          <div className="text-xs text-gray-500">
            {getOriginalPriceDisplay(car.price)}
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600">
            {car.year && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{car.year}</span>
              </div>
            )}
            
            {car.kilometers && (
              <div className="flex items-center gap-1">
                <Gauge className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{formatKilometers(car.kilometers)}</span>
              </div>
            )}
            
            {car.location && (
              <div className="flex items-center gap-1 min-w-0">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{car.location}</span>
              </div>
            )}
          </div>
          
          {car.seller && (
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-gray-600 truncate">
                {car.seller.type} {car.seller.name && `- ${car.seller.name}`}
              </span>
            </div>
          )}
        </div>
        
        <Button 
          className="w-full mt-auto text-xs sm:text-sm py-2" 
          onClick={() => window.open(car.link, '_blank')}
          disabled={!car.link}
        >
          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
          Ver detalle
        </Button>
      </CardContent>
    </Card>
  );
};

const columnHelper = createColumnHelper<Car>();

export const CarsTable: React.FC<CarsTableProps> = ({ cars, isLoading }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dollarRate, setDollarRate] = useState<number>(1170);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [filters, setFilters] = useState<FilterState>({
    priceRange: { min: '', max: '' },
    yearRange: { min: '', max: '' },
    kmRange: { min: '', max: '' },
    location: '',
    sellerType: '',
  });

  // Refs for virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Check screen size and set default view mode
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      setViewMode(isMobile ? 'cards' : 'table');
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch dollar rate on component mount
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const rate = await getDollarRate();
        setDollarRate(rate);
        console.log('Dollar rate fetched:', rate);
      } catch (error) {
        console.error('Failed to fetch dollar rate:', error);
      }
    };
    fetchRate();
  }, []);

  // Enhanced cars data with USD conversion
  const enhancedCars = useMemo(() => {
    return cars.map(car => {
      const priceUSD = convertToUSD(car.price, dollarRate);
      console.log('Converting price:', car.price, 'to USD:', priceUSD);
      return {
        ...car,
        priceUSD,
      };
    });
  }, [cars, dollarRate]);

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const locations = [...new Set(cars.map(car => car.location).filter(Boolean))].sort();
    const sellerTypes = [...new Set(cars.map(car => car.seller?.type).filter(Boolean))].sort();
    return { 
      locations: locations.map(loc => ({ value: loc as string, label: loc as string })),
      sellerTypes: sellerTypes.map(type => ({ value: type as string, label: type as string }))
    };
  }, [cars]);

  // Apply custom filters
  const filteredCars = useMemo(() => {
    return enhancedCars.filter(car => {
      // Price range filter
      if (filters.priceRange.min && car.priceUSD && car.priceUSD < parseFloat(filters.priceRange.min)) return false;
      if (filters.priceRange.max && car.priceUSD && car.priceUSD > parseFloat(filters.priceRange.max)) return false;
      
      // Year range filter
      if (filters.yearRange.min && car.year && car.year < parseInt(filters.yearRange.min)) return false;
      if (filters.yearRange.max && car.year && car.year > parseInt(filters.yearRange.max)) return false;
      
      // Kilometers range filter
      if (filters.kmRange.min && car.kilometers && car.kilometers < parseInt(filters.kmRange.min)) return false;
      if (filters.kmRange.max && car.kilometers && car.kilometers > parseInt(filters.kmRange.max)) return false;
      
      // Location filter
      if (filters.location && car.location !== filters.location) return false;
      
      // Seller type filter
      if (filters.sellerType && car.seller?.type !== filters.sellerType) return false;
      
      return true;
    });
  }, [enhancedCars, filters]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: 'Vehicle',
        cell: (info) => (
          <div className="flex items-center space-x-3">
            {info.row.original.thumbnail && (
              <img
                src={info.row.original.thumbnail}
                alt={info.getValue()}
                className="w-16 h-12 object-cover rounded"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA2NCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NEwyOCAzMkgyMFYyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{info.getValue()}</div>
              {info.row.original.year && (
                <div className="text-xs text-gray-500">Year: {info.row.original.year}</div>
              )}
            </div>
          </div>
        ),
        size: 350,
        minSize: 300,
        maxSize: 400,
        enableSorting: true,
      }),
      columnHelper.accessor('priceUSD', {
        header: 'Price (USD)',
        cell: (info) => (
          <div className="font-semibold text-green-600 text-right">
            {formatUSD(info.getValue() || 0)}
            <div className="text-xs text-gray-500">
              {getOriginalPriceDisplay(info.row.original.price)}
            </div>
          </div>
        ),
        size: 130,
        minSize: 120,
        maxSize: 150,
        enableSorting: true,
        sortingFn: 'basic',
      }),
      columnHelper.accessor('kilometers', {
        header: 'Kilometers',
        cell: (info) => {
          const km = info.getValue();
          return km ? `${km.toLocaleString()} km` : '-';
        },
        size: 120,
        minSize: 100,
        maxSize: 140,
        enableSorting: true,
      }),
      columnHelper.accessor('year', {
        header: 'Year',
        cell: (info) => info.getValue() || '-',
        size: 80,
        minSize: 70,
        maxSize: 90,
        enableSorting: true,
      }),
      columnHelper.accessor('location', {
        header: 'Location',
        cell: (info) => info.getValue() || '-',
        size: 150,
        minSize: 130,
        maxSize: 170,
        enableSorting: true,
      }),
      columnHelper.accessor('seller.type', {
        header: 'Seller',
        cell: (info) => info.getValue() || '-',
        size: 100,
        minSize: 90,
        maxSize: 120,
        enableSorting: true,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <Button
            size="sm"
            onClick={() => window.open(info.row.original.link, '_blank')}
            disabled={!info.row.original.link}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        ),
        size: 80,
        minSize: 70,
        maxSize: 90,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredCars,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();

  // Virtualization for table
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.priceRange.min || filters.priceRange.max ||
      filters.yearRange.min || filters.yearRange.max ||
      filters.kmRange.min || filters.kmRange.max ||
      filters.location || filters.sellerType || globalFilter
    );
  }, [filters, globalFilter]);

  const clearFilters = () => {
    setFilters({
      priceRange: { min: '', max: '' },
      yearRange: { min: '', max: '' },
      kmRange: { min: '', max: '' },
      location: '',
      sellerType: '',
    });
    setGlobalFilter('');
  };

  // Cards view for mobile
  const renderCardsView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredCars.map((car) => (
        <MobileCarCard key={car.id} car={car} />
      ))}
    </div>
  );

  // Table view for desktop
  const renderTableView = () => (
    <div className="rounded-md border">
      {/* Table Header */}
      <div className="border-b bg-gray-50 overflow-x-auto">
        {table.getHeaderGroups().map((headerGroup) => (
          <div key={headerGroup.id} className="flex min-w-[800px]">
            {headerGroup.headers.map((header) => (
              <div
                key={header.id}
                className="px-3 py-2 text-left text-sm font-medium text-gray-900 border-r last:border-r-0"
                style={{ width: header.getSize() }}
              >
                {header.isPlaceholder ? null : (
                  <div
                    className={`flex items-center space-x-1 ${
                      header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100 rounded px-1 py-1' : ''
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {header.column.getCanSort() && (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={`w-3 h-3 ${
                            header.column.getIsSorted() === 'asc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                        <ChevronDown
                          className={`w-3 h-3 -mt-1 ${
                            header.column.getIsSorted() === 'desc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={tableContainerRef}
        className="h-[600px] overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <div className="min-w-[800px]">
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={row.id}
                  className="flex border-b hover:bg-gray-50 absolute w-full"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="px-4 py-3 border-r last:border-r-0 flex items-center"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold">
              Cars ({filteredCars.length.toLocaleString()})
              <div className="text-xs text-gray-500 font-normal">
                Rate: 1 USD = {dollarRate} ARS
              </div>
            </CardTitle>
            
            {/* View Mode Toggle - Hidden on mobile since it auto-switches */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4 mr-2" />
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <Grid className="w-4 h-4 mr-2" />
                Cards
              </Button>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search cars..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="whitespace-nowrap"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 text-xs">
                  !
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                size="sm"
                className="whitespace-nowrap"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range (USD)</label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Min"
                  type="number"
                  value={filters.priceRange.min}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceRange: { ...prev.priceRange, min: e.target.value }
                  }))}
                />
                <Input
                  placeholder="Max"
                  type="number"
                  value={filters.priceRange.max}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceRange: { ...prev.priceRange, max: e.target.value }
                  }))}
                />
              </div>
            </div>

            {/* Year Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Year Range</label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Min"
                  type="number"
                  value={filters.yearRange.min}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    yearRange: { ...prev.yearRange, min: e.target.value }
                  }))}
                />
                <Input
                  placeholder="Max"
                  type="number"
                  value={filters.yearRange.max}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    yearRange: { ...prev.yearRange, max: e.target.value }
                  }))}
                />
              </div>
            </div>

            {/* Kilometers Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Kilometers Range</label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Min"
                  type="number"
                  value={filters.kmRange.min}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    kmRange: { ...prev.kmRange, min: e.target.value }
                  }))}
                />
                <Input
                  placeholder="Max"
                  type="number"
                  value={filters.kmRange.max}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    kmRange: { ...prev.kmRange, max: e.target.value }
                  }))}
                />
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <SimpleSelect
                value={filters.location}
                onValueChange={(value: string) => 
                  setFilters(prev => ({ ...prev, location: value }))
                }
                placeholder="All locations"
                options={filterOptions.locations}
              />
            </div>

            {/* Seller Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Seller Type</label>
              <SimpleSelect
                value={filters.sellerType}
                onValueChange={(value: string) => 
                  setFilters(prev => ({ ...prev, sellerType: value }))
                }
                placeholder="All seller types"
                options={filterOptions.sellerTypes}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Render based on view mode */}
        {viewMode === 'cards' ? renderCardsView() : renderTableView()}

        {/* Results Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
            <p className="text-sm text-gray-700">
              Showing {filteredCars.length} of {enhancedCars.length} cars
              {globalFilter && ` (filtered by "${globalFilter}")`}
            </p>
            {viewMode === 'table' && (
              <Badge variant="outline" className="text-xs w-fit">
                Virtualized - Smooth scrolling for large datasets
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <div className="text-sm text-blue-600">
              Filters active
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 