import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(token: string | null): Socket | null {
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;
    ref.current = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      withCredentials: true,
    });
    return () => { ref.current?.disconnect(); ref.current = null; };
  }, [token]);

  return ref.current;
}
