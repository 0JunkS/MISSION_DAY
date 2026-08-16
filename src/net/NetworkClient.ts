// Real-time WebSocket Network Client with Offline Singleplayer Fallback

export class NetworkClient {
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private onMessageCallback: ((msg: any) => void) | null = null;

  constructor() {
    this.connect();
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8080`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[NetworkClient] WebSocket Connected to Server:', wsUrl);
        this.isConnected = true;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        } catch (err) {
          console.error('[NetworkClient] Error parsing message:', err);
        }
      };

      this.socket.onclose = () => {
        console.warn('[NetworkClient] Disconnected. Fallback to Local Offline Simulation.');
        this.isConnected = false;
      };

      this.socket.onerror = () => {
        this.isConnected = false;
      };
    } catch (e) {
      console.warn('[NetworkClient] WebSocket connection failed. Running in standalone local mode.');
      this.isConnected = false;
    }
  }

  setOnMessage(cb: (msg: any) => void) {
    this.onMessageCallback = cb;
  }

  send(type: string, payload: any) {
    if (this.socket && this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}
