import axios from 'axios';

export interface DollarRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

const DOLLAR_API_URL = 'https://dolarapi.com/v1/dolares/blue';

// Cache for exchange rate to avoid too many API calls
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getDollarRate = async (): Promise<number> => {
  // Check if we have a valid cached rate
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
    return cachedRate.rate;
  }

  try {
    const response = await axios.get<DollarRate>(DOLLAR_API_URL);
    const rate = response.data.venta; // Use selling rate
    
    // Cache the rate
    cachedRate = {
      rate,
      timestamp: Date.now()
    };
    
    return rate;
  } catch (error) {
    console.error('Error fetching dollar rate:', error);
    // Fallback to a default rate if API fails
    return 1170; // Current rate from your data
  }
};

export const convertToUSD = (priceData: any, dollarRate: number): number => {
  // Handle different price data structures
  let amount: number;
  let currency: string;

  if (typeof priceData === 'object' && priceData !== null) {
    // Handle {currency: "$", amount: "US$22.000"} structure from API
    if (priceData.amount !== undefined && priceData.currency !== undefined) {
      // Extract numeric value from amount string like "US$22.000" or "$15.000"
      const amountStr = String(priceData.amount);
      const numericStr = amountStr.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
      amount = parseFloat(numericStr);
      
      // Determine currency from amount string or currency field
      if (amountStr.includes('US$') || amountStr.includes('USD')) {
        currency = 'USD';
      } else if (priceData.currency === '$' || priceData.currency === 'ARS' || priceData.currency === 'AR$') {
        currency = 'ARS';
      } else {
        currency = priceData.currency;
      }
    }
    // Handle {price: 12000, currency: "ARS"} structure
    else if (priceData.price !== undefined) {
      amount = parseFloat(priceData.price);
      currency = priceData.currency || 'ARS';
    }
    // Handle direct number in object
    else {
      amount = parseFloat(Object.values(priceData)[0] as string);
      currency = 'ARS';
    }
  } 
  // Handle direct number
  else if (typeof priceData === 'number') {
    amount = priceData;
    currency = 'ARS';
  }
  // Handle string number
  else if (typeof priceData === 'string') {
    const numericStr = priceData.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
    amount = parseFloat(numericStr);
    
    // Determine currency from string
    if (priceData.includes('US$') || priceData.includes('USD')) {
      currency = 'USD';
    } else {
      currency = 'ARS';
    }
  }
  else {
    console.warn('Unknown price data structure:', priceData);
    return 0;
  }

  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    console.warn('Invalid amount:', amount, 'from:', priceData);
    return 0;
  }

  // Convert to USD
  if (currency === 'USD' || currency === 'US$') {
    return amount;
  }
  
  if (currency === 'ARS' || currency === '$' || currency === 'AR$' || !currency) {
    return amount / dollarRate;
  }
  
  // For other currencies, assume they're in ARS
  console.warn('Unknown currency:', currency, 'assuming ARS');
  return amount / dollarRate;
};

export const formatUSD = (amount: number): string => {
  if (isNaN(amount) || amount === 0) {
    return '$0';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getOriginalPriceDisplay = (priceData: any): string => {
  if (typeof priceData === 'object' && priceData !== null) {
    if (priceData.amount !== undefined && priceData.currency !== undefined) {
      // For API format like {currency: "$", amount: "US$22.000"}
      return String(priceData.amount);
    }
    if (priceData.price !== undefined) {
      return `${priceData.currency || 'ARS'} ${parseFloat(priceData.price).toLocaleString()}`;
    }
  }
  if (typeof priceData === 'number') {
    return `ARS ${priceData.toLocaleString()}`;
  }
  if (typeof priceData === 'string') {
    return priceData;
  }
  return 'N/A';
}; 