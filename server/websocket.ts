import { WebSocketServer } from 'ws';
import { storage } from './storage';

export function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Track connected clients
  const clients = new Set();

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Broadcast sync updates to all connected clients
  async function broadcastSyncUpdate() {
    if (clients.size === 0) return;

    try {
      const [metrics, errors] = await Promise.all([
        storage.getSyncMetrics(),
        storage.getRecentErrors()
      ]);

      const update = {
        type: 'sync_update',
        data: {
          metrics,
          errors,
          timestamp: new Date().toISOString()
        }
      };

      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(update));
        }
      }
    } catch (error) {
      console.error('Error broadcasting sync update:', error);
    }
  }

  // Broadcast updates every second
  setInterval(broadcastSyncUpdate, 1000);

  return wss;
}
