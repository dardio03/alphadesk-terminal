import styled, { css } from 'styled-components';
import { theme } from '../../styles/theme';

interface CardProps {
  variant?: 'default' | 'elevated';
  padding?: keyof typeof theme.spacing;
  interactive?: boolean;
}

const getVariantStyles = (variant: CardProps['variant'] = 'default') => {
  const variants = {
    default: css`
      background-color: ${theme.colors.background.paper};
      box-shadow: ${theme.shadows.sm};
    `,
    elevated: css`
      background-color: ${theme.colors.background.raised};
      box-shadow: ${theme.shadows.lg};
    `,
  };

  return variants[variant];
};

export const Card = styled.div<CardProps>`
  ${({ variant }) => getVariantStyles(variant)};
  padding: ${({ padding = 'md' }) => theme.spacing[padding]};
  border-radius: ${theme.radii.lg};
  transition: transform ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};

  ${({ interactive }) =>
    interactive &&
    css`
      cursor: pointer;

      &:hover {
        transform: translateY(-2px);
        box-shadow: ${theme.shadows.xl};
      }

      &:active {
        transform: translateY(0);
        box-shadow: ${theme.shadows.md};
      }
    `}
`;