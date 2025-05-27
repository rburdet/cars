import type { Car } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, Gauge, MapPin, User } from 'lucide-react';

interface CarCardProps {
  car: Car;
}

export function CarCard({ car }: CarCardProps) {
  const formatPrice = (price: Car['price']) => {
    if (!price || !price.amount) return 'Precio no disponible';
    
    const currency = price.currency === 'USD' || price.currency === 'US$' ? 'USD' : 'ARS';
    const symbol = currency === 'USD' ? 'US$' : '$';
    
    return `${symbol} ${price.amount.toLocaleString()}`;
  };

  const formatKilometers = (km?: number) => {
    if (!km) return null;
    return `${km.toLocaleString()} km`;
  };

  const getImageUrl = (thumbnail?: string) => {
    if (!thumbnail) return '/placeholder-car.svg';
    return thumbnail;
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        <div className="relative">
          <img
            src={getImageUrl(car.thumbnail)}
            alt={car.title}
            className="w-full h-48 object-cover rounded-t-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-car.svg';
            }}
          />
          {car.year && (
            <Badge className="absolute top-2 right-2 bg-blue-600">
              {car.year}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4">
        <CardTitle className="text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
          {car.title}
        </CardTitle>
        
        <div className="flex-1 space-y-2 mb-4">
          <div className="text-2xl font-bold text-green-600">
            {formatPrice(car.price)}
          </div>
          
          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
            {car.year && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{car.year}</span>
              </div>
            )}
            
            {car.kilometers && (
              <div className="flex items-center gap-1">
                <Gauge className="w-4 h-4" />
                <span>{formatKilometers(car.kilometers)}</span>
              </div>
            )}
            
            {car.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{car.location}</span>
              </div>
            )}
          </div>
          
          {car.seller && (
            <div className="flex items-center gap-1 text-sm">
              <User className="w-4 h-4" />
              <span className="text-gray-600">
                {car.seller.type} {car.seller.name && `- ${car.seller.name}`}
              </span>
            </div>
          )}
        </div>
        
        <Button 
          className="w-full mt-auto" 
          onClick={() => window.open(car.link, '_blank')}
          disabled={!car.link}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver en MercadoLibre
        </Button>
      </CardContent>
    </Card>
  );
} 