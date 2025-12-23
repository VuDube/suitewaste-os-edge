import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
// Add TypeScript definitions for the Web Serial API
// This ensures type safety and autocompletion for the Web Serial API.
type SerialPortRequestOptions = {
  filters?: { usbVendorId?: number; usbProductId?: number }[];
};
type SerialPort = EventTarget & {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  addEventListener(type: 'disconnect', listener: (ev: Event) => any, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: 'disconnect', listener: (ev: Event) => any, options?: boolean | EventListenerOptions): void;
};
declare global {
  interface Navigator {
    serial: {
      requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
      getPorts(): Promise<SerialPort[]>;
    };
  }
}
type ScaleStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'parsing';
interface SerialScale {
  weight: number;
  status: ScaleStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}
const WEIGHT_REGEX = /(\d+\.\d+)/;
export function useSerialScale(): SerialScale {
  const [weight, setWeight] = useState<number>(0.0);
  const [status, setStatus] = useState<ScaleStatus>('disconnected');
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const keepReadingRef = useRef<boolean>(true);
  const disconnectHandlerRef = useRef<(() => void) | null>(null);
  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (error) {
        // Ignore cancel error, it's expected on disconnect
      } finally {
        // This check is important because the reader might already be released
        if (readerRef.current) {
            try {
                readerRef.current.releaseLock();
            } catch (e) {
                // Lock might already be released
            }
        }
        readerRef.current = null;
      }
    }
    if (portRef.current) {
      if (disconnectHandlerRef.current) {
        portRef.current.removeEventListener('disconnect', disconnectHandlerRef.current);
        disconnectHandlerRef.current = null;
      }
      try {
        await portRef.current.close();
      } catch (error) {
        console.error('Failed to close port:', error);
      } finally {
        portRef.current = null;
      }
    }
    setStatus('disconnected');
    setWeight(0.0);
  }, []);
  const readLoop = useCallback(async () => {
    if (!portRef.current?.readable || !keepReadingRef.current) return;
    readerRef.current = portRef.current.readable.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    setStatus('parsing');
    while (portRef.current?.readable && keepReadingRef.current) {
      try {
        const { value, done } = await readerRef.current.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/[\r\n]+/);
        if (lines.length > 1) {
          const completeLine = lines[lines.length - 2];
          const match = completeLine.match(WEIGHT_REGEX);
          if (match && match[1]) {
            setWeight(parseFloat(match[1]));
          }
          buffer = lines[lines.length - 1];
        }
      } catch (error) {
        if (keepReadingRef.current) { // Only show error if not intentionally disconnecting
          toast.error('Scale read error', { description: 'The connection was lost.' });
          setStatus('error');
        }
        break;
      }
    }
  }, []);
  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      toast.error('Web Serial API not supported', { description: 'Please use a compatible browser like Chrome or Edge.' });
      setStatus('error');
      return;
    }
    if (portRef.current) {
      toast.info('A scale is already connected.');
      return;
    }
    setStatus('connecting');
    try {
      const port = await navigator.serial.requestPort();
      portRef.current = port;
      await port.open({ baudRate: 9600 });
      keepReadingRef.current = true;
      disconnectHandlerRef.current = () => {
        toast.warning('Scale disconnected.');
        disconnect();
      };
      port.addEventListener('disconnect', disconnectHandlerRef.current);
      setStatus('connected');
      toast.success('Scale connected successfully!');
      readLoop();
    } catch (err) {
      setStatus('error');
      if (err instanceof Error && err.name !== 'NotFoundError') {
        toast.error('Failed to connect to scale', { description: err.message });
      } else {
        setStatus('disconnected');
      }
      portRef.current = null;
    }
  }, [readLoop, disconnect]);
  useEffect(() => {
    return () => {
      if (portRef.current) {
        disconnect();
      }
    };
  }, [disconnect]);
  return { weight, status, connect, disconnect };
}