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
  const widgetRef = useRef<any>(null);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (widgetRef.current && widgetRef.current.resize) {
        widgetRef.current.resize();
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    // Store widget instance
    let widget: any;
    
    // Load TradingView script only if not already loaded
    const loadTradingView = () => {
      return new Promise<void>((resolve) => {
        if (window.TradingView) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    // Initialize widget
    const initWidget = () => {
      if (!containerRef.current) return;

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
        hide_volume,
        // Add options to improve performance
        library_path: '/charting_library/',
        disabled_features: [
          'use_localstorage_for_settings',
          'volume_force_overlay',
          'create_volume_indicator_by_default',
        ],
        enabled_features: [
          'disable_resolution_rebuild',
        ],
        load_last_chart: false,
        auto_save_delay: 5
      };

      widget = new window.TradingView.widget(config);
      widgetRef.current = widget;
    };

    // Load script and initialize widget
    loadTradingView().then(initWidget);

    // Cleanup
    return () => {
      if (widget && widget.remove) {
        widget.remove();
      }
    };
  }, [
    // Only include props that should trigger a reload
    symbol,
    interval,
    timezone,
    theme,
    style,
    container_id,
    // Exclude size-related props
    // width,
    // height,
    // autosize,
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