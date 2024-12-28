import React, { useEffect, useRef } from 'react';

let tvScriptLoadingPromise;

const TradingViewWidget = () => {
  const onLoadScriptRef = useRef(null);

  useEffect(() => {
    onLoadScriptRef.current = createWidget;

    if (!tvScriptLoadingPromise) {
      tvScriptLoadingPromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.id = 'tradingview-widget-loading-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.type = 'text/javascript';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    tvScriptLoadingPromise.then(() => onLoadScriptRef.current && onLoadScriptRef.current());

    return () => {
      onLoadScriptRef.current = null;
    };

    function createWidget() {
      if (document.getElementById('tradingview_chart') && 'TradingView' in window) {
        new window.TradingView.widget({
          autosize: true,
          symbol: "BINANCE:BTCUSDT",
          interval: "15",
          timezone: "exchange",
          theme: "light",
          style: "1",
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: "tradingview_chart",
        });
      }
    }
  }, []);

  return (
    <div className='tradingview-widget-container'>
      <div id='tradingview_chart' style={{ height: "500px", width: "100%" }} />
    </div>
  );
};

export default TradingViewWidget;
