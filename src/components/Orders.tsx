import React from 'react';
import { Box } from '@mui/material';

interface OrdersProps {
  symbol: string;
}

const Orders: React.FC<OrdersProps> = ({ symbol }) => {
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Orders content will go here */}
      <p>Orders for {symbol}</p>
    </Box>
  );
};

export default Orders;