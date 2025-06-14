import React, { createContext, useContext } from 'react';
import aggregatorService from './aggregatorService';

export const AggregatorContext = createContext(aggregatorService);

export const AggregatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AggregatorContext.Provider value={aggregatorService}>{children}</AggregatorContext.Provider>
);

export const useAggregator = () => useContext(AggregatorContext);
