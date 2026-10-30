import { useEffect } from 'react';
import { API_BASE_URL } from '../api/client';

const STORAGE_KEY = 'shoe-style-visitor-id';
const HEARTBEAT_MS = 30_000;

function getVisitorId() {
  const existing = sessionStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const visitorId = crypto.randomUUID();
  sessionStorage.setItem(STORAGE_KEY, visitorId);
  return visitorId;
}

export function VisitorTracker() {
  useEffect(() => {
    const visitorId = getVisitorId();
    const sendHeartbeat = () => {
      void fetch(`${API_BASE_URL}/api/v1/analytics/visit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
        keepalive: true,
      }).catch(() => undefined);
    };

    sendHeartbeat();
    const heartbeat = window.setInterval(sendHeartbeat, HEARTBEAT_MS);
    return () => window.clearInterval(heartbeat);
  }, []);

  return null;
}
