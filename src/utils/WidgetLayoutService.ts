import { WidgetConfig } from './WidgetRegistry';

interface WidgetLayout {
  widgetId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  settings: Record<string, any>;
}

class WidgetLayoutService {
  private static STORAGE_KEY = 'widget-layouts';
  
  static saveLayout(layouts: WidgetLayout[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layouts));
    } catch (error) {
      console.error('Failed to save widget layout:', error);
    }
  }

  static loadLayout(): WidgetLayout[] {
    try {
      const layouts = localStorage.getItem(this.STORAGE_KEY);
      return layouts ? JSON.parse(layouts) : [];
    } catch (error) {
      console.error('Failed to load widget layout:', error);
      return [];
    }
  }

  static getDefaultLayout(widgetId: string, config: WidgetConfig): WidgetLayout {
    return {
      widgetId,
      position: { x: 0, y: 0 },
      size: config.defaultSize,
      settings: config.defaultProps
    };
  }

  static migrateLayouts(availableWidgets: string[]) {
    const layouts = this.loadLayout();
    const validLayouts = layouts.filter(layout => 
      availableWidgets.includes(layout.widgetId)
    );
    
    // Add missing widgets with default layout
    availableWidgets.forEach(widgetId => {
      if (!validLayouts.some(layout => layout.widgetId === widgetId)) {
        const config = getWidgetConfig(widgetId);
        validLayouts.push(this.getDefaultLayout(widgetId, config));
      }
    });

    this.saveLayout(validLayouts);
    return validLayouts;
  }
}

export default WidgetLayoutService;