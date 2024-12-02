import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

const TradingChart = () => {
  const chartContainerRef = useRef(null);
  let chart = null;

  useEffect(() => {
    if (chartContainerRef.current) {
      chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 500,
        layout: {
          backgroundColor: '#FFFFFF',
          textColor: '#000',
        },
        grid: {
          vertLines: { color: '#e1e1e1' },
          horzLines: { color: '#e1e1e1' },
        },
        crosshair: {
          mode: 1,
        },
        priceScale: {
          borderColor: '#cccccc',
        },
        timeScale: {
          borderColor: '#cccccc',
        },
      });

      const lineSeries = chart.addLineSeries();
      lineSeries.setData([
        { time: '2023-11-20', value: 100 },
        { time: '2023-11-21', value: 101 },
        { time: '2023-11-22', value: 102 },
        { time: '2023-11-23', value: 103 },
        { time: '2023-11-24', value: 104 },
      ]);

      const handleResize = () => {
        chart.resize(chartContainerRef.current.clientWidth, 500);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
  }, []);

  return (
    <div
      ref={chartContainerRef}
      style={{ width: '100%', height: '500px', position: 'relative' }}
    />
  );
};

export default TradingChart;
