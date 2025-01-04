import React from 'react';
import { Box } from '@mui/material';

interface OrderBookDepthProps {
  symbol: string;
}

const OrderBookDepth: React.FC<OrderBookDepthProps> = ({ symbol }) => {
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Content will be implemented later */}
    </Box>
  );
};

export default OrderBookDepth;