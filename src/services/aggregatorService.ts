import EventEmitter from 'eventemitter3';
import aggregatorWorkerInstance from '@/index';
import { AggregatorPayload } from '@/types/types';
import { randomString } from '@/helpers/utils';

class AggregatorService extends EventEmitter {
  public worker: Worker;

  constructor() {
    super();
    this.worker = aggregatorWorkerInstance;
    this.worker.addEventListener('message', event => {
      this.emit(event.data.op, event.data.data, event.data.trackingId);
    });
  }

  private dispatch(payload: AggregatorPayload) {
    this.worker.postMessage(payload);
  }

  private dispatchAsync(payload: AggregatorPayload): Promise<any> {
    const trackingId = randomString(8);
    return new Promise(resolve => {
      const listener = (event: MessageEvent) => {
        if (event.data.trackingId === trackingId) {
          this.worker.removeEventListener('message', listener);
          resolve(event.data.data);
        }
      };
      this.worker.addEventListener('message', listener);
      this.worker.postMessage({ ...payload, trackingId });
    });
  }

  connect(markets: string[]): Promise<any> {
    return this.dispatchAsync({ op: 'connect', data: markets });
  }

  disconnect(markets: string[]): Promise<any> {
    return this.dispatchAsync({ op: 'disconnect', data: markets });
  }

  configureAggregator(key: string, value: any): Promise<any> {
    return this.dispatchAsync({
      op: 'configureAggregator',
      data: { key, value }
    });
  }
}

export const aggregatorService = new AggregatorService();
export default aggregatorService;
