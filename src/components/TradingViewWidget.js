import React, { useEffect, useRef } from 'react';

const TradingViewWidget = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        new window.TradingView.widget({
          container_id: containerRef.current.id,
          symbol: "BINANCE:BTCUSDT",
          interval: "15",
          theme: "light",
          style: "1",
          locale: "en",
          width: "100%",
          height: "500",
          hide_side_toolbar: false, 
          enable_publishing: false,
          allow_symbol_change: true,
        });
      };
      containerRef.current.appendChild(script);
    }
  }, []);

  return <div id="tradingview_chart" ref={containerRef} style={{ height: "500px" }} />;
};

export default TradingViewWidget;
