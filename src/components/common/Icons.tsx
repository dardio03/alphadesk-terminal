import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const IconWrapper = styled.svg<IconProps>`
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  fill: ${props => props.color || 'currentColor'};
  transition: fill ${theme.transitions.fast};
`;

const defaultProps = {
  size: 24,
  color: 'currentColor',
};

export const RefreshIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <IconWrapper
    viewBox="0 0 24 24"
    className={className}
    {...defaultProps}
    {...props}
  >
    <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </IconWrapper>
);

export const ChevronUpIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <IconWrapper
    viewBox="0 0 24 24"
    className={className}
    {...defaultProps}
    {...props}
  >
    <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
  </IconWrapper>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <IconWrapper
    viewBox="0 0 24 24"
    className={className}
    {...defaultProps}
    {...props}
  >
    <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
  </IconWrapper>
);

export const CloseIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <IconWrapper
    viewBox="0 0 24 24"
    className={className}
    {...defaultProps}
    {...props}
  >
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </IconWrapper>
);

export const SettingsIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <IconWrapper
    viewBox="0 0 24 24"
    className={className}
    {...defaultProps}
    {...props}
  >
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </IconWrapper>
);