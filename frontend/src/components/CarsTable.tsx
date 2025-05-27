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
import { ChevronUp, ChevronDown, Search, ExternalLink, Filter, X } from 'lucide-react';
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

const columnHelper = createColumnHelper<Car>();

export const CarsTable: React.FC<CarsTableProps> = ({ cars, isLoading }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dollarRate, setDollarRate] = useState<number>(1170);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priceRange: { min: '', max: '' },
    yearRange: { min: '', max: '' },
    kmRange: { min: '', max: '' },
    location: '',
    sellerType: '',
  });

  // Refs for virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
            <div>
              <div className="font-medium text-sm">{info.getValue()}</div>
              {info.row.original.year && (
                <div className="text-xs text-gray-500">Year: {info.row.original.year}</div>
              )}
            </div>
          </div>
        ),
        size: 300,
        enableSorting: true,
      }),
      columnHelper.accessor('priceUSD', {
        header: 'Price (USD)',
        cell: (info) => (
          <div className="font-semibold text-green-600">
            {formatUSD(info.getValue() || 0)}
            <div className="text-xs text-gray-500">
              {getOriginalPriceDisplay(info.row.original.price)}
            </div>
          </div>
        ),
        size: 140,
        enableSorting: true,
        sortingFn: 'basic',
      }),
      columnHelper.accessor('kilometers', {
        header: 'Kilometers',
        cell: (info) => (
          <div className="text-sm">
            {info.getValue()?.toLocaleString() || 'N/A'}
          </div>
        ),
        size: 100,
        enableSorting: true,
        sortingFn: 'basic',
      }),
      columnHelper.accessor('year', {
        header: 'Year',
        cell: (info) => (
          <div className="text-sm">
            {info.getValue() || 'N/A'}
          </div>
        ),
        size: 80,
        enableSorting: true,
        sortingFn: 'basic',
      }),
      columnHelper.accessor('location', {
        header: 'Location',
        cell: (info) => (
          <div className="text-sm">
            {info.getValue() || 'N/A'}
          </div>
        ),
        size: 150,
        enableSorting: true,
      }),
      columnHelper.accessor('seller', {
        header: 'Seller',
        cell: (info) => {
          const seller = info.getValue();
          return (
            <div className="text-sm">
              {seller ? (
                <div>
                  <div className="font-medium">{seller.name}</div>
                  <Badge variant="outline" className="text-xs">
                    {seller.type}
                  </Badge>
                </div>
              ) : 'N/A'}
            </div>
          );
        },
        size: 120,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const sellerA = rowA.original.seller?.name || '';
          const sellerB = rowB.original.seller?.name || '';
          return sellerA.localeCompare(sellerB);
        },
      }),
      columnHelper.accessor('features', {
        header: 'Features',
        cell: (info) => (
          <div className="flex flex-wrap gap-1">
            {info.getValue()?.slice(0, 2).map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
            {(info.getValue()?.length || 0) > 2 && (
              <Badge variant="outline" className="text-xs">
                +{(info.getValue()?.length || 0) - 2}
              </Badge>
            )}
          </div>
        ),
        enableSorting: false,
        size: 150,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex space-x-2">
            {info.row.original.link && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(info.row.original.link, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        ),
        size: 80,
        enableSorting: false,
      }),
    ],
    [dollarRate]
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
    enableSorting: true,
  });

  // Virtualization setup
  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 10, // Render extra rows for smooth scrolling
  });

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

  const hasActiveFilters = Object.values(filters).some(filter => 
    typeof filter === 'string' ? filter !== '' : filter.min !== '' || filter.max !== ''
  ) || globalFilter !== '';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading cars...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Cars ({filteredCars.length} of {cars.length} total)
            <Badge variant="outline" className="text-xs">
              Rate: 1 USD = {dollarRate} ARS
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search cars..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-blue-50' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
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
        {/* Virtualized Table */}
        <div className="rounded-md border">
          {/* Table Header */}
          <div className="border-b bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <div key={headerGroup.id} className="flex">
                {headerGroup.headers.map((header) => (
                  <div
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r last:border-r-0"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center space-x-1 ${
                          header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100 rounded px-2 py-1' : ''
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

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-700">
              Showing {rows.length} of {filteredCars.length} cars
              {globalFilter && ` (filtered by "${globalFilter}")`}
            </p>
            <Badge variant="outline" className="text-xs">
              Virtualized - Smooth scrolling for large datasets
            </Badge>
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