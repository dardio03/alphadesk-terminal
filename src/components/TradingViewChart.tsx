import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, LineWidth, MouseEventParams, Time } from 'lightweight-charts';

interface TradingViewChartProps {
  data: LineData[];
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  autosize?: boolean;
  onCrosshairMove?: (price: number, time: number) => void;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  data,
  width = 800,
  height = 400,
  theme = 'dark',
  autosize = true,
  onCrosshairMove
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartOptions = {
      width,
      height,
      layout: {
        background: {
          color: theme === 'dark' ? '#1e222d' : '#ffffff'
        },
        textColor: theme === 'dark' ? '#d1d4dc' : '#000000',
      },
      grid: {
        vertLines: {
          color: theme === 'dark' ? '#334158' : '#e1e3e6',
        },
        horzLines: {
          color: theme === 'dark' ? '#334158' : '#e1e3e6',
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1 as LineWidth,
          color: theme === 'dark' ? '#758696' : '#96a2b4',
          style: 2,
        },
        horzLine: {
          width: 1 as LineWidth,
          color: theme === 'dark' ? '#758696' : '#96a2b4',
          style: 2,
        },
      },
      timeScale: {
        borderColor: theme === 'dark' ? '#485c7b' : '#d1d4dc',
      },
      rightPriceScale: {
        borderColor: theme === 'dark' ? '#485c7b' : '#d1d4dc',
      },
    };

    chartRef.current = createChart(chartContainerRef.current, chartOptions);
    seriesRef.current = chartRef.current.addLineSeries({
      color: '#2962FF',
      lineWidth: 2,
    });

    if (onCrosshairMove) {
      chartRef.current.subscribeCrosshairMove((param) => {
        if (
          param.point === undefined ||
          !param.time ||
          param.point.x < 0 ||
          param.point.x > width ||
          param.point.y < 0 ||
          param.point.y > height
        ) {
          return;
        }

        const price = (param as any).seriesPrices?.get(seriesRef.current!)?.toString();
        if (price) {
          onCrosshairMove(parseFloat(price), param.time as number);
        }
      });
    }

    if (autosize) {
      const resizeObserver = new ResizeObserver(entries => {
        if (entries[0]) {
          const { width, height } = entries[0].contentRect;
          chartRef.current?.applyOptions({ width, height });
        }
      });

      resizeObserver.observe(chartContainerRef.current);
      return () => resizeObserver.disconnect();
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [width, height, theme, autosize, onCrosshairMove]);

  useEffect(() => {
    if (seriesRef.current && data) {
      seriesRef.current.setData(data);
    }
  }, [data]);

  return (
    <div
      ref={chartContainerRef}
      style={{
        width: autosize ? '100%' : width,
        height: autosize ? '100%' : height
      }}
    />
  );
};

export default TradingViewChart;