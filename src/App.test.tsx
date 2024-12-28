import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders order book widget', () => {
  render(<App />);
  const orderBookElement = screen.getByText(/Order Book/i);
  expect(orderBookElement).toBeInTheDocument();
});

test('renders live price widget', () => {
  render(<App />);
  const livePriceElement = screen.getByText(/Live Price/i);
  expect(livePriceElement).toBeInTheDocument();
});

test('renders price range widget', () => {
  render(<App />);
  const priceRangeElement = screen.getByText(/Price Range/i);
  expect(priceRangeElement).toBeInTheDocument();
});

test('renders chart widget', () => {
  render(<App />);
  const chartElement = screen.getByText(/Chart/i);
  expect(chartElement).toBeInTheDocument();
});