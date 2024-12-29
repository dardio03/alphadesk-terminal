declare module 'react-grid-layout' {
  import type { ComponentType, PropsWithChildren } from 'react';

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    resizeHandles?: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>;
    isBounded?: boolean;
  }

  export interface Layouts {
    [key: string]: Layout[];
  }

  export interface ReactGridLayoutProps extends PropsWithChildren {
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    autoSize?: boolean;
    cols?: number;
    draggableCancel?: string;
    draggableHandle?: string;
    verticalCompact?: boolean;
    compactType?: 'vertical' | 'horizontal' | null;
    layout?: Layout[];
    margin?: [number, number];
    containerPadding?: [number, number];
    rowHeight?: number;
    maxRows?: number;
    isBounded?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    preventCollision?: boolean;
    useCSSTransforms?: boolean;
    transformScale?: number;
    onLayoutChange?: (layout: Layout[]) => void;
    onDragStart?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, event: MouseEvent, element: HTMLElement) => void;
    onDrag?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, event: MouseEvent, element: HTMLElement) => void;
    onDragStop?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, event: MouseEvent, element: HTMLElement) => void;
    onResizeStart?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, event: MouseEvent, element: HTMLElement) => void;
    onResize?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, event: MouseEvent, element: HTMLElement) => void;
    onResizeStop?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, event: MouseEvent, element: HTMLElement) => void;
  }

  export interface ResponsiveProps extends ReactGridLayoutProps {
    breakpoint?: string;
    breakpoints?: { [key: string]: number };
    cols?: { [key: string]: number };
    layouts?: Layouts;
    width?: number;
    onBreakpointChange?: (newBreakpoint: string, newCols: number) => void;
    onLayoutChange?: (currentLayout: Layout[], allLayouts: Layouts) => void;
    onLayoutsChange?: (currentLayout: Layout[], allLayouts: Layouts) => void;
    onWidthChange?: (containerWidth: number, margin: [number, number], cols: number, containerPadding: [number, number]) => void;
  }

  export interface WidthProviderProps extends PropsWithChildren {
    className?: string;
    measureBeforeMount?: boolean;
  }

  export function WidthProvider<P extends WidthProviderProps>(
    component: ComponentType<P>
  ): ComponentType<Omit<P, 'width'>>;

  export class Responsive extends React.Component<ResponsiveProps> {}
  export default class ReactGridLayout extends React.Component<ReactGridLayoutProps> {}
}