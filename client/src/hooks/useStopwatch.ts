import { useState, useRef, useCallback, useEffect } from 'react';

export function useStopwatch() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setElapsedMs(0);
    setIsRunning(true);
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      if (startTimeRef.current !== null) {
        // A frame timestamp can precede a start triggered within that frame.
        setElapsedMs(Math.max(0, now - startTimeRef.current));
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback((exactFinalMs?: number) => {
    setIsRunning(false);
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (exactFinalMs !== undefined) {
      setElapsedMs(exactFinalMs);
    }
    startTimeRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    startTimeRef.current = null;
    setElapsedMs(0);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Format as 00:01.842 (Minutes:Seconds.Milliseconds)
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor(ms % 1000);

    const pad = (n: number, size = 2) => n.toString().padStart(size, '0');
    return `${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
  };

  return {
    elapsedMs,
    formattedTime: formatTime(elapsedMs),
    isRunning,
    start,
    stop,
    reset,
  };
}

