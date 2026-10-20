class Emitter {
  constructor() { this._h = {}; }
  on(e, f) { (this._h[e] || (this._h[e] = [])).push(f); return this; }
  emit(e, ...a) { (this._h[e] || []).slice().forEach(f => f(...a)); return true; }
}
class ServerSocket extends Emitter {
  constructor(server, client) { super(); this.server = server; this.client = client; this.readyState = 1; }
  send(m) { if (this.readyState !== 1) return; const c = this.client; setTimeout(() => c._recv(String(m)), 0); }
  ping() { setTimeout(() => this.emit('pong'), 0); }
  terminate() { this.close(); }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.server.clients.delete(this);
    this.emit('close');
    const c = this.client;
    setTimeout(() => c._closed(), 0);
  }
}
class WebSocketServer extends Emitter {
  constructor() { super(); this.clients = new Set(); }
  handleUpgrade(req, socket, head, cb) {
    const ws = new ServerSocket(this, socket.client);
    this.clients.add(ws);
    socket.client._server = ws;
    cb(ws);
  }
}
module.exports = { WebSocketServer, WebSocket: { OPEN: 1 } };
