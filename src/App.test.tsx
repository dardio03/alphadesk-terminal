import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    render(<App />);
  });

  test('renders order book widget', () => {
    const orderBookElement = screen.getByText(/Order Book/i);
    expect(orderBookElement).toBeInTheDocument();
  });

  test('renders live price widget', () => {
    const livePriceElement = screen.getByText(/Live Price/i);
    expect(livePriceElement).toBeInTheDocument();
  });

  test('renders price range widget', () => {
    const priceRangeElement = screen.getByText(/Price Range/i);
    expect(priceRangeElement).toBeInTheDocument();
  });

  test('renders chart widget', () => {
    const chartElement = screen.getByText(/Chart/i);
    expect(chartElement).toBeInTheDocument();
  });
});
