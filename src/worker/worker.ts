/* eslint-disable no-restricted-globals */
const worker = self as unknown as Worker;

interface OrderBookData {
  bids: [string, string][];
  asks: [string, string][];
}

let orderBookData: OrderBookData = {
  bids: [],
  asks: []
};

worker.onmessage = (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'UPDATE_ORDERBOOK':
      orderBookData = data;
      break;
    case 'GET_ORDERBOOK':
      worker.postMessage({
        type: 'ORDERBOOK_DATA',
        data: orderBookData
      });
      break;
  }
};

export {};