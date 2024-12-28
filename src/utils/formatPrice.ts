export const formatPrice = (price: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(price);
};

export const formatQuantity = (quantity: number, decimals: number = 8): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
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