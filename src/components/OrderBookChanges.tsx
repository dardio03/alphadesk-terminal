import React, { useState, useEffect, useCallback } from 'react';
import { OrderBookEntry } from '../types/exchange';
import { formatPrice, formatQuantity } from '../utils/formatPrice';

interface OrderBookChange extends OrderBookEntry {
  type: 'bid' | 'ask';
  timestamp: number;
}

interface OrderBookChangesProps {
  maxEntries?: number;
  className?: string;
}

const OrderBookChanges: React.FC<OrderBookChangesProps> = ({
  maxEntries = 50,
  className = ''
}) => {
  const [changes, setChanges] = useState<OrderBookChange[]>([]);

  const addChange = useCallback((change: OrderBookChange) => {
    setChanges(prevChanges => {
      const newChanges = [change, ...prevChanges];
      return newChanges.slice(0, maxEntries);
    });
  }, [maxEntries]);

  useEffect(() => {
    // Reset changes when maxEntries changes
    setChanges([]);
  }, [maxEntries]);

  const getChangeClass = (type: 'bid' | 'ask'): string => {
    return type === 'bid' ? 'change-buy' : 'change-sell';
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className={`order-book-changes ${className}`}>
      <div className="changes-header">
        <div className="time">Time</div>
        <div className="price">Price</div>
        <div className="quantity">Quantity</div>
      </div>
      <div className="changes-body">
        {changes.map((change, index) => (
          <div key={index} className={`change-row ${getChangeClass(change.type)}`}>
            <div className="time">{formatTimestamp(change.timestamp)}</div>
            <div className="price">{formatPrice(change.price)}</div>
            <div className="quantity">{formatQuantity(change.quantity)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBookChanges;