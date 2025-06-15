import React from 'react';
import { Box } from '@mui/material';

interface AlertsProps {
  symbol: string;
}

const Alerts: React.FC<AlertsProps> = ({ symbol }) => {
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Alerts content will go here */}
      <p>Alerts for {symbol}</p>
    </Box>
  );
};

export default Alerts;