import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(token: string | null): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return;
    }
    const s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
      auth: { token },
      withCredentials: true,
    });
    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [token]);

  return socket;
}
