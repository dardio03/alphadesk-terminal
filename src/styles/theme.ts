import { createGlobalStyle, css } from 'styled-components';

export const breakpoints = {
  mobile: '320px',
  tablet: '768px',
  laptop: '1024px',
  desktop: '1440px',
};

export const theme = {
  colors: {
    // Primary colors
    primary: {
      main: '#2962FF',
      light: '#768FFF',
      dark: '#0039CB',
      contrast: '#FFFFFF',
    },
    // Secondary colors for actions and highlights
    secondary: {
      main: '#00C853',
      light: '#5EFF82',
      dark: '#009624',
      contrast: '#FFFFFF',
    },
    // Error states
    error: {
      main: '#FF1744',
      light: '#FF616F',
      dark: '#C4001D',
      contrast: '#FFFFFF',
    },
    // Warning states
    warning: {
      main: '#FFA000',
      light: '#FFC947',
      dark: '#C67100',
      contrast: '#000000',
    },
    // Success states
    success: {
      main: '#00C853',
      light: '#5EFF82',
      dark: '#009624',
      contrast: '#FFFFFF',
    },
    // Text colors
    text: {
      primary: '#E0E0E0',
      secondary: '#9E9E9E',
      disabled: '#616161',
    },
    // Background colors
    background: {
      default: '#0A0A0A',
      paper: '#1A1A1A',
      raised: '#242424',
      overlay: 'rgba(0, 0, 0, 0.8)',
    },
    // Border colors
    border: {
      light: '#3A3A3A',
      main: '#2A2A2A',
      dark: '#1A1A1A',
    },
    // Chart and graph colors
    chart: {
      grid: '#2C2C2C',
      axis: '#424242',
      positive: '#00C853',
      negative: '#FF1744',
      volume: '#4527A0',
    },
  },

  typography: {
    fontFamily: {
      primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'IBM Plex Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
      numeric: "'Roboto Mono', monospace",
    },
    fontSizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '2.5rem', // 40px
    '3xl': '3rem',   // 48px
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.25)',
    md: '0 2px 4px rgba(0, 0, 0, 0.25)',
    lg: '0 4px 8px rgba(0, 0, 0, 0.25)',
    xl: '0 8px 16px rgba(0, 0, 0, 0.25)',
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  radii: {
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    full: '9999px',
  },

  zIndices: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
  },
};

// Media queries for responsive design
export const media = {
  mobile: `@media (min-width: ${breakpoints.mobile})`,
  tablet: `@media (min-width: ${breakpoints.tablet})`,
  laptop: `@media (min-width: ${breakpoints.laptop})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`,
};

// Mixins for common styles
export const mixins = {
  flexCenter: css`
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  
  flexBetween: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,

  gridCenter: css`
    display: grid;
    place-items: center;
  `,

  absoluteCenter: css`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  `,

  truncate: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  scrollbar: css`
    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    &::-webkit-scrollbar-track {
      background: ${theme.colors.background.default};
    }

    &::-webkit-scrollbar-thumb {
      background: ${theme.colors.border.main};
      border-radius: ${theme.radii.full};
    }

    &::-webkit-scrollbar-thumb:hover {
      background: ${theme.colors.border.light};
    }
  `,
};

// Global styles
export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: ${theme.typography.fontFamily.primary};
    background-color: ${theme.colors.background.default};
    color: ${theme.colors.text.primary};
    line-height: ${theme.typography.lineHeights.normal};
  }

  // Improve accessibility
  :focus-visible {
    outline: 2px solid ${theme.colors.primary.main};
    outline-offset: 2px;
  }

  // Improve touch targets on mobile
  @media (max-width: ${breakpoints.tablet}) {
    button, a {
      min-height: 44px;
      min-width: 44px;
    }
  }

  // Improve animation performance
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

export default theme;