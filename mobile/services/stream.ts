import { API_BASE_URL } from '@/constants/api';
import { useAuthStore } from '@/store/auth';

/**
 * Connect to the streaming summary SSE endpoint.
 * Calls onChunk for each text token, onDone when complete.
 */
export function streamScanSummary(
  scanId: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): () => void {
  const token = useAuthStore.getState().token;
  let cancelled = false;
  let controller: AbortController | null = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/scan/${scanId}/stream-summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: controller?.signal,
      });

      if (!res.ok || !res.body) {
        onError(`HTTP ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') {
              onDone();
              return;
            }
            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) {
                onError(parsed.error);
                return;
              }
              if (parsed.text) {
                onChunk(parsed.text);
              }
            } catch {}
          }
        }
      }
      onDone();
    } catch (e: any) {
      if (!cancelled) onError(e.message || 'Stream failed');
    }
  })();

  return () => {
    cancelled = true;
    controller?.abort();
    controller = null;
  };
}

/**
 * Analyze a scan for all family members.
 */
export async function analyzeFamilyScan(scanId: string): Promise<any[]> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE_URL}/scan/${scanId}/analyze-family`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.family_results || [];
}
