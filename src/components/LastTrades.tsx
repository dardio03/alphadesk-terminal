import React from 'react';
import { Box } from '@mui/material';

interface LastTradesProps {
  symbol: string;
}

const LastTrades: React.FC<LastTradesProps> = ({ symbol }) => {
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Content will be implemented later */}
    </Box>
  );
};

export default LastTrades;