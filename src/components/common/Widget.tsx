import React from 'react';
import styled from 'styled-components';
import { Card } from './Card';
import { Typography } from './Typography';
import { theme } from '../../styles/theme';

interface WidgetProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  className?: string;
}

const WidgetContainer = styled(Card)`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: ${theme.colors.background.paper};
  border: 1px solid ${theme.colors.border.main};
`;

const WidgetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border.main};
`;

const WidgetTitle = styled(Typography).attrs({ $variant: 'h4' })`
  color: ${theme.colors.text.primary};
`;

const WidgetContent = styled.div`
  flex: 1;
  overflow: auto;
  position: relative;
  padding: ${theme.spacing.md};
  
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
`;

const LoadingOverlay = styled.div`
  ${({ theme }) => theme.mixins.absoluteCenter};
  ${({ theme }) => theme.mixins.flexCenter};
  background-color: ${theme.colors.background.overlay};
  width: 100%;
  height: 100%;
  z-index: ${theme.zIndices.modal};
`;

const ErrorMessage = styled(Typography).attrs({ variant: 'body2' })`
  color: ${theme.colors.error.main};
  text-align: center;
  padding: ${theme.spacing.md};
`;

export const Widget: React.FC<WidgetProps> = ({
  title,
  children,
  loading = false,
  error = null,
  onRefresh,
  className,
}) => {
  return (
    <WidgetContainer className={className}>
      <WidgetHeader>
        <WidgetTitle>{title}</WidgetTitle>
        {onRefresh && (
          <button onClick={onRefresh} aria-label="Refresh widget">
            {/* Add refresh icon here */}
          </button>
        )}
      </WidgetHeader>
      
      <WidgetContent>
        {loading && (
          <LoadingOverlay>
            {/* Add loading spinner component here */}
          </LoadingOverlay>
        )}
        
        {error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          children
        )}
      </WidgetContent>
    </WidgetContainer>
  );
};