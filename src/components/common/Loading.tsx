import styled, { keyframes } from 'styled-components';
import { theme } from '../../styles/theme';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const getSpinnerSize = (size: SpinnerProps['size'] = 'md') => {
  const sizes = {
    sm: '16px',
    md: '24px',
    lg: '32px',
  };
  return sizes[size];
};

export const Spinner = styled.div<SpinnerProps>`
  width: ${props => getSpinnerSize(props.size)};
  height: ${props => getSpinnerSize(props.size)};
  border: 2px solid ${props => props.color || theme.colors.primary.main};
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

interface SkeletonProps {
  width?: string;
  height?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton = styled.div<SkeletonProps>`
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '1em'};
  background-color: ${theme.colors.background.raised};
  border-radius: ${props =>
    props.variant === 'circular'
      ? '50%'
      : props.variant === 'text'
      ? '4px'
      : theme.radii.md};
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

export const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${theme.colors.background.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndices.modal};
`;