import styled, { css } from 'styled-components';
import { theme } from '../../styles/theme';

interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body1' | 'body2' | 'caption' | 'numeric';
  weight?: keyof typeof theme.typography.fontWeights;
  color?: string;
  align?: 'left' | 'center' | 'right';
  truncate?: boolean;
}

const getVariantStyles = (variant: TypographyProps['variant'] = 'body1') => {
  const variants = {
    h1: css`
      font-size: ${theme.typography.fontSizes['4xl']};
      line-height: ${theme.typography.lineHeights.tight};
      font-weight: ${theme.typography.fontWeights.bold};
    `,
    h2: css`
      font-size: ${theme.typography.fontSizes['3xl']};
      line-height: ${theme.typography.lineHeights.tight};
      font-weight: ${theme.typography.fontWeights.bold};
    `,
    h3: css`
      font-size: ${theme.typography.fontSizes['2xl']};
      line-height: ${theme.typography.lineHeights.tight};
      font-weight: ${theme.typography.fontWeights.semibold};
    `,
    h4: css`
      font-size: ${theme.typography.fontSizes.xl};
      line-height: ${theme.typography.lineHeights.tight};
      font-weight: ${theme.typography.fontWeights.semibold};
    `,
    body1: css`
      font-size: ${theme.typography.fontSizes.md};
      line-height: ${theme.typography.lineHeights.normal};
      font-weight: ${theme.typography.fontWeights.normal};
    `,
    body2: css`
      font-size: ${theme.typography.fontSizes.sm};
      line-height: ${theme.typography.lineHeights.normal};
      font-weight: ${theme.typography.fontWeights.normal};
    `,
    caption: css`
      font-size: ${theme.typography.fontSizes.xs};
      line-height: ${theme.typography.lineHeights.normal};
      font-weight: ${theme.typography.fontWeights.normal};
    `,
    numeric: css`
      font-family: ${theme.typography.fontFamily.numeric};
      font-size: ${theme.typography.fontSizes.md};
      line-height: ${theme.typography.lineHeights.tight};
      font-weight: ${theme.typography.fontWeights.medium};
      font-feature-settings: 'tnum' on, 'lnum' on;
    `,
  };

  return variants[variant];
};

export const Typography = styled.span<TypographyProps>`
  ${({ variant }) => getVariantStyles(variant)};
  color: ${({ color }) => color || 'inherit'};
  font-weight: ${({ weight }) => weight && theme.typography.fontWeights[weight]};
  text-align: ${({ align = 'left' }) => align};
  
  ${({ truncate }) =>
    truncate &&
    css`
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `}
`;