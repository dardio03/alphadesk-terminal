import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    TradingView: {
      widget: new (config: TradingViewConfig) => any;
    };
  }
}

interface TradingViewConfig {
  symbol: string;
  interval?: string;
  timezone?: string;
  theme?: 'light' | 'dark';
  style?: '1' | '2' | '3' | '4';
  locale?: string;
  toolbar_bg?: string;
  enable_publishing?: boolean;
  allow_symbol_change?: boolean;
  container_id: string;
  width?: string | number;
  height?: string | number;
  autosize?: boolean;
  show_popup_button?: boolean;
  popup_width?: string | number;
  popup_height?: string | number;
  studies?: string[];
  hide_side_toolbar?: boolean;
  withdateranges?: boolean;
  hide_legend?: boolean;
  save_image?: boolean;
  enable_publishing?: boolean;
  hide_top_toolbar?: boolean;
  withdateranges?: boolean;
  hide_volume?: boolean;
  [key: string]: any;
}

interface TradingViewWidgetProps {
  symbol: string;
  theme?: 'light' | 'dark';
  autosize?: boolean;
  interval?: string;
  timezone?: string;
  style?: '1' | '2' | '3' | '4';
  locale?: string;
  toolbar_bg?: string;
  enable_publishing?: boolean;
  allow_symbol_change?: boolean;
  width?: string | number;
  height?: string | number;
  studies?: string[];
  hide_side_toolbar?: boolean;
  withdateranges?: boolean;
  hide_legend?: boolean;
  save_image?: boolean;
  hide_top_toolbar?: boolean;
  hide_volume?: boolean;
  container_id?: string;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol,
  theme = 'dark',
  autosize = true,
  interval = 'D',
  timezone = 'Etc/UTC',
  style = '1',
  locale = 'en',
  toolbar_bg = '#f1f3f6',
  enable_publishing = false,
  allow_symbol_change = true,
  width = '100%',
  height = '100%',
  studies = [],
  hide_side_toolbar = false,
  withdateranges = true,
  hide_legend = false,
  save_image = true,
  hide_top_toolbar = false,
  hide_volume = false,
  container_id = 'tradingview_widget'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== 'undefined' && containerRef.current) {
        const config: TradingViewConfig = {
          symbol,
          interval,
          timezone,
          theme,
          style,
          locale,
          toolbar_bg,
          enable_publishing,
          allow_symbol_change,
          container_id,
          width,
          height,
          autosize,
          studies,
          hide_side_toolbar,
          withdateranges,
          hide_legend,
          save_image,
          hide_top_toolbar,
          hide_volume
        };

        new window.TradingView.widget(config);
      }
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [
    symbol,
    interval,
    timezone,
    theme,
    style,
    locale,
    toolbar_bg,
    enable_publishing,
    allow_symbol_change,
    container_id,
    width,
    height,
    autosize,
    studies,
    hide_side_toolbar,
    withdateranges,
    hide_legend,
    save_image,
    hide_top_toolbar,
    hide_volume
  ]);

  return (
    <div
      id={container_id}
      ref={containerRef}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
};

export default TradingViewWidget;