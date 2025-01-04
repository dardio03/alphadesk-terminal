import styled, { css } from 'styled-components';
import { theme } from '../../styles/theme';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
}

const getVariantStyles = (variant: ButtonProps['variant'] = 'primary') => {
  const variants = {
    primary: css`
      background-color: ${theme.colors.primary.main};
      color: ${theme.colors.primary.contrast};
      border: none;

      &:hover:not(:disabled) {
        background-color: ${theme.colors.primary.dark};
      }

      &:active:not(:disabled) {
        background-color: ${theme.colors.primary.light};
      }
    `,
    secondary: css`
      background-color: transparent;
      color: ${theme.colors.primary.main};
      border: 2px solid ${theme.colors.primary.main};

      &:hover:not(:disabled) {
        background-color: ${theme.colors.primary.main}10;
      }

      &:active:not(:disabled) {
        background-color: ${theme.colors.primary.main}20;
      }
    `,
    ghost: css`
      background-color: transparent;
      color: ${theme.colors.text.primary};
      border: none;

      &:hover:not(:disabled) {
        background-color: ${theme.colors.background.raised};
      }

      &:active:not(:disabled) {
        background-color: ${theme.colors.background.paper};
      }
    `,
  };

  return variants[variant];
};

const getSizeStyles = (size: ButtonProps['size'] = 'md') => {
  const sizes = {
    sm: css`
      padding: ${theme.spacing.xs} ${theme.spacing.sm};
      font-size: ${theme.typography.fontSizes.sm};
      height: 32px;
    `,
    md: css`
      padding: ${theme.spacing.sm} ${theme.spacing.md};
      font-size: ${theme.typography.fontSizes.md};
      height: 40px;
    `,
    lg: css`
      padding: ${theme.spacing.md} ${theme.spacing.lg};
      font-size: ${theme.typography.fontSizes.lg};
      height: 48px;
    `,
  };

  return sizes[size];
};

export const Button = styled.button<ButtonProps>`
  ${({ variant }) => getVariantStyles(variant)};
  ${({ size }) => getSizeStyles(size)};
  width: ${({ fullWidth }) => (fullWidth ? '100%' : 'auto')};
  
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  border-radius: ${theme.radii.md};
  font-family: ${theme.typography.fontFamily.primary};
  font-weight: ${theme.typography.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  user-select: none;
  white-space: nowrap;
  position: relative;
  overflow: hidden;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  // Ripple effect
  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
    background-image: radial-gradient(circle, #fff 10%, transparent 10.01%);
    background-repeat: no-repeat;
    background-position: 50%;
    transform: scale(10, 10);
    opacity: 0;
    transition: transform 0.5s, opacity 1s;
  }

  &:active::after {
    transform: scale(0, 0);
    opacity: 0.3;
    transition: 0s;
  }

  // Improve accessibility
  &:focus-visible {
    outline: 2px solid ${theme.colors.primary.main};
    outline-offset: 2px;
  }
`;