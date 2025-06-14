import React from 'react';
import WidgetHeader from './WidgetHeader';

interface WidgetContainerProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  onSettingsClick?: () => void;
  onRefresh?: () => void;
  isDraggable?: boolean;
  isResizable?: boolean;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  widgetId?: string;
  onPositionChange?: (position: { x: number, y: number }) => void;
  onSizeChange?: (size: { width: number, height: number }) => void;
}

import { useState, useEffect } from 'react';
import WidgetLayoutService from '../utils/WidgetLayoutService';

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  title,
  children,
  className = '',
  onClose,
  onSettingsClick,
  onRefresh,
  isDraggable = false,
  isResizable = false,
  initialWidth = 300,
  initialHeight = 200,
  minWidth = 200,
  minHeight = 150,
  maxWidth = 800,
  maxHeight = 600,
  widgetId,
  onPositionChange,
  onSizeChange
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });

  // Load layout on mount
  useEffect(() => {
    if (widgetId) {
      const layout = WidgetLayoutService.loadLayout()
        .find(l => l.widgetId === widgetId);
      
      if (layout) {
        setPosition(layout.position);
        setSize(layout.size);
      }
    }
  }, [widgetId]);

  // Save layout on changes
  useEffect(() => {
    if (widgetId) {
      const layouts = WidgetLayoutService.loadLayout();
      const existingIndex = layouts.findIndex(l => l.widgetId === widgetId);
      const layout = {
        widgetId,
        position,
        size,
        settings: {} // Will be populated by widget settings
      };

      if (existingIndex >= 0) {
        layouts[existingIndex] = layout;
      } else {
        layouts.push(layout);
      }

      WidgetLayoutService.saveLayout(layouts);
    }
  }, [widgetId, position, size]);
  const handleDragStart = (e: React.MouseEvent) => {
    if (!isDraggable) return;
    
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - startX;
      const newY = e.clientY - startY;
      setPosition({ x: newX, y: newY });
      if (onPositionChange) {
        onPositionChange({ x: newX, y: newY });
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResize = (e: React.MouseEvent, direction: string) => {
    if (!isResizable) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (direction.includes('e')) newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
      if (direction.includes('s')) newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY));
      
      setSize({ width: newWidth, height: newHeight });
      if (onSizeChange) {
        onSizeChange({ width: newWidth, height: newHeight });
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      className={`widget-container ${className}`}
      style={{
        width: size.width,
        height: size.height,
        minWidth,
        minHeight,
        maxWidth,
        maxHeight,
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDraggable ? 'move' : 'default'
      }}
      onMouseDown={isDraggable ? handleDragStart : undefined}
    >
      {isResizable && (
        <>
          <div className="resize-handle resize-handle-e" onMouseDown={e => handleResize(e, 'e')} />
          <div className="resize-handle resize-handle-s" onMouseDown={e => handleResize(e, 's')} />
          <div className="resize-handle resize-handle-se" onMouseDown={e => handleResize(e, 'se')} />
        </>
      )}
      <WidgetHeader
        title={title}
        onClose={onClose}
        onSettingsClick={onSettingsClick}
        onRefresh={onRefresh}
      />
      <div className="widget-content">
        {children}
      </div>
    </div>
  );
};