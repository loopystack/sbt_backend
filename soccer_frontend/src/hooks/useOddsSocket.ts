import { useEffect } from "react";

export function useOddsSocket(onMessage?: (data: any) => void) {
  useEffect(() => {
    const url = (import.meta.env.VITE_WS_URL as string) || "ws://localhost:5001/ws/odds";
    const ws = new WebSocket(url);
    ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe", matches: ["match-1"] }));
    ws.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)); } catch {}
    };
    return () => ws.close();
  }, [onMessage]);
}
