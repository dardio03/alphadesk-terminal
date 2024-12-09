import { useState, useEffect } from 'react';

const usePriceRangeData = (symbol) => {
  const [prices, setPrices] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/hook?symbol=${symbol}`);
        const data = await response.json();
        setPrices(data);
      } catch (err) {
        setError('Failed to fetch price range data');
      }
    };

    fetchData();
  }, [symbol]);

  return { prices, error };
};

export default usePriceRangeData;
