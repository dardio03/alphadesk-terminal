import React from 'react';
import { Box } from '@mui/material';

interface BidAskRangeProps {
  symbol: string;
}

const BidAskRange: React.FC<BidAskRangeProps> = ({ symbol }) => {
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Content will be implemented later */}
    </Box>
  );
};

export default BidAskRange;