import React from 'react';
import { Paper, Box, IconButton, Typography, styled } from '@mui/material';
import { DragHandle, Close, Settings } from '@mui/icons-material';

interface WidgetProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  onSettings?: (event: React.MouseEvent<HTMLElement>) => void;
  className?: string;
  noScroll?: boolean;
  hideHeader?: boolean;
}

const WidgetContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: theme.shadows[4],
  },
}));

const WidgetHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  height: '21px',
  padding: '0 8px',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  cursor: 'move',
  '& .MuiIconButton-root': {
    padding: 2,
    width: 18,
    height: 18,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  '& .MuiSvgIcon-root': {
    fontSize: '0.875rem',
  },
}));

const WidgetTitle = styled(Typography)(({ theme }) => ({
  flex: 1,
  fontWeight: theme.typography.fontWeightMedium,
  fontSize: '12px',
  color: theme.palette.text.primary,
  marginLeft: '4px',
  lineHeight: '21px',
}));

const WidgetActions = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

interface WidgetContentProps {
  noScroll?: boolean;
}

const WidgetContent = styled(Box)<WidgetContentProps>(({ theme, noScroll }) => ({
  flex: 1,
  overflow: noScroll ? 'hidden' : 'auto',
  padding: 4,
  backgroundColor: theme.palette.background.default,
  ...(noScroll ? {} : {
    '&::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: theme.palette.background.paper,
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.divider,
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.action.hover,
      },
    },
  }),
}));

export const MuiWidget: React.FC<WidgetProps> = ({
  title,
  children,
  onClose,
  onSettings,
  className,
  noScroll,
  hideHeader = false,
}) => {
  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (onSettings) {
      onSettings(event);
    }
  };

  return (
    <WidgetContainer className={className} elevation={2}>
      {!hideHeader && (
        <WidgetHeader className="widget-header">
          <DragHandle fontSize="small" color="action" />
          <WidgetTitle variant="subtitle2">{title}</WidgetTitle>
          <WidgetActions>
            {onSettings && (
              <IconButton
                size="small"
                onClick={handleSettingsClick}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                aria-label="Widget settings"
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '&:active': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:focus': {
                    outline: 'none',
                  },
                  '&:focus-visible': {
                    outline: '2px solid rgba(255, 255, 255, 0.3)',
                    outlineOffset: '2px',
                  },
                }}
              >
                <Settings fontSize="small" />
              </IconButton>
            )}
            {onClose && (
              <IconButton
                size="small"
                onClick={onClose}
                aria-label="Close widget"
              >
                <Close fontSize="small" />
              </IconButton>
            )}
          </WidgetActions>
        </WidgetHeader>
      )}
      <WidgetContent noScroll={noScroll}>{children}</WidgetContent>
    </WidgetContainer>
  );
};