import { Layout } from 'react-grid-layout';

export interface SavedLayout {
  name: string;
  data: {
    layouts: {
      [key: string]: Layout[];
    };
    symbol: string;
  };
  timestamp: number;
} 