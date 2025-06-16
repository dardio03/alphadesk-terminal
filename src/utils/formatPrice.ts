export const formatPrice = (price: number): string => {
  if (!price) return '0';
  
  // Format with thousands separator and 2 decimal places
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

export const formatQuantity = (quantity: number): string => {
  if (!quantity) return '0';
  
  // Format with 2-3 decimal places, no scientific notation
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(quantity);
};

export const calculateSpreadPercentage = (bestBid: number, bestAsk: number): string => {
  if (bestBid <= 0 || bestAsk <= 0) return '0.000';
  return ((bestAsk - bestBid) / bestBid * 100).toFixed(3);
};

export const formatSpread = (spread: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8
  }).format(spread);
};