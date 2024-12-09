import { useState, useEffect } from 'react';

const useOrderBookData = (symbol, enabledExchanges) => {
  const [exchangeData, setExchangeData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/hook?symbol=${symbol}&exchanges=${enabledExchanges.join(',')}`);
        const data = await response.json();
        setExchangeData(data);
      } catch (err) {
        setError('Failed to fetch order book data');
      }
    };

    fetchData();
  }, [symbol, enabledExchanges]);

  return { exchangeData, error };
};

export default useOrderBookData;
