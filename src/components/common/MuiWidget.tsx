import React from 'react';
import { Paper, Box, IconButton, Typography, styled } from '@mui/material';
import { DragHandle, Close, Settings } from '@mui/icons-material';

interface WidgetProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  onSettings?: () => void;
  className?: string;
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
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  cursor: 'move',
  '& .MuiIconButton-root': {
    padding: theme.spacing(0.5),
  },
}));

const WidgetTitle = styled(Typography)(({ theme }) => ({
  flex: 1,
  fontWeight: theme.typography.fontWeightMedium,
  fontSize: theme.typography.pxToRem(14),
  color: theme.palette.text.primary,
  marginLeft: theme.spacing(1),
}));

const WidgetContent = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
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
}));

export const MuiWidget: React.FC<WidgetProps> = ({
  title,
  children,
  onClose,
  onSettings,
  className,
}) => {
  return (
    <WidgetContainer className={className} elevation={2}>
      <WidgetHeader className="widget-header">
        <DragHandle fontSize="small" color="action" />
        <WidgetTitle variant="subtitle2">{title}</WidgetTitle>
        {onSettings && (
          <IconButton
            size="small"
            onClick={onSettings}
            aria-label="Widget settings"
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
      </WidgetHeader>
      <WidgetContent>{children}</WidgetContent>
    </WidgetContainer>
  );
};