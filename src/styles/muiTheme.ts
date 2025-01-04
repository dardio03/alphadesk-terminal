import { createTheme, ThemeOptions } from '@mui/material/styles';
import { theme as customTheme } from './theme';

export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: customTheme.colors.primary.main,
      light: customTheme.colors.primary.light,
      dark: customTheme.colors.primary.dark,
      contrastText: customTheme.colors.primary.contrast,
    },
    secondary: {
      main: customTheme.colors.secondary.main,
      light: customTheme.colors.secondary.light,
      dark: customTheme.colors.secondary.dark,
      contrastText: customTheme.colors.secondary.contrast,
    },
    error: {
      main: customTheme.colors.error.main,
      light: customTheme.colors.error.light,
      dark: customTheme.colors.error.dark,
      contrastText: customTheme.colors.error.contrast,
    },
    warning: {
      main: customTheme.colors.warning.main,
      light: customTheme.colors.warning.light,
      dark: customTheme.colors.warning.dark,
      contrastText: customTheme.colors.warning.contrast,
    },
    success: {
      main: customTheme.colors.success.main,
      light: customTheme.colors.success.light,
      dark: customTheme.colors.success.dark,
      contrastText: customTheme.colors.success.contrast,
    },
    background: {
      default: customTheme.colors.background.default,
      paper: customTheme.colors.background.paper,
    },
    text: {
      primary: customTheme.colors.text.primary,
      secondary: customTheme.colors.text.secondary,
      disabled: customTheme.colors.text.disabled,
    },
  },
  typography: {
    fontFamily: customTheme.typography.fontFamily.primary,
    fontSize: 14,
    h1: {
      fontSize: customTheme.typography.fontSizes['4xl'],
      fontWeight: customTheme.typography.fontWeights.bold,
      lineHeight: customTheme.typography.lineHeights.tight,
    },
    h2: {
      fontSize: customTheme.typography.fontSizes['3xl'],
      fontWeight: customTheme.typography.fontWeights.bold,
      lineHeight: customTheme.typography.lineHeights.tight,
    },
    h3: {
      fontSize: customTheme.typography.fontSizes['2xl'],
      fontWeight: customTheme.typography.fontWeights.semibold,
      lineHeight: customTheme.typography.lineHeights.tight,
    },
    h4: {
      fontSize: customTheme.typography.fontSizes.xl,
      fontWeight: customTheme.typography.fontWeights.semibold,
      lineHeight: customTheme.typography.lineHeights.tight,
    },
    h5: {
      fontSize: customTheme.typography.fontSizes.lg,
      fontWeight: customTheme.typography.fontWeights.medium,
      lineHeight: customTheme.typography.lineHeights.tight,
    },
    h6: {
      fontSize: customTheme.typography.fontSizes.md,
      fontWeight: customTheme.typography.fontWeights.medium,
      lineHeight: customTheme.typography.lineHeights.tight,
    },
    body1: {
      fontSize: customTheme.typography.fontSizes.md,
      lineHeight: customTheme.typography.lineHeights.normal,
    },
    body2: {
      fontSize: customTheme.typography.fontSizes.sm,
      lineHeight: customTheme.typography.lineHeights.normal,
    },
    caption: {
      fontSize: customTheme.typography.fontSizes.xs,
      lineHeight: customTheme.typography.lineHeights.normal,
    },
  },
  shape: {
    borderRadius: parseInt(customTheme.radii.md),
  },
  spacing: (factor: number) => `${factor * 8}px`,
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: customTheme.colors.background.paper,
          border: `1px solid ${customTheme.colors.border.main}`,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: customTheme.colors.primary.main,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: customTheme.colors.background.paper,
          border: `1px solid ${customTheme.colors.border.main}`,
          '&:hover': {
            borderColor: customTheme.colors.primary.main,
            boxShadow: customTheme.shadows.lg,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: customTheme.radii.md,
          fontWeight: customTheme.typography.fontWeights.medium,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: customTheme.radii.md,
        },
      },
    },
  },
} as ThemeOptions);