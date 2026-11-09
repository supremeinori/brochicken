// Bro Chicken Real-Time Event Hub (Server-Sent Events / SSE)
const { EventEmitter } = require('node:events');

class SimulationEventHub extends EventEmitter {
  constructor() {
    super();
    // Set response SSE untuk Admin
    this.adminClients = new Set();
    // Map response SSE untuk Pelanggan berdasarkan nomor telepon yang dinormalisasi
    this.customerClients = new Map();

    // Ping periodik setiap 25 detik agar koneksi HTTP tetap hidup (keep-alive)
    // unref() mencegah timer menahan proses Node tetap hidup saat server ditutup (mis. di test)
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
    if (typeof this.heartbeatTimer.unref === 'function') {
      this.heartbeatTimer.unref();
    }
  }

  // Setup headers SSE
  setupSSEHeaders(res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 5000\n\n');
  }

  // Format pengiriman data SSE
  formatSSE(event, data) {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  // Registrasi Client Admin
  registerAdmin(res) {
    this.setupSSEHeaders(res);
    this.adminClients.add(res);

    // Kirim konfirmasi koneksi
    res.write(this.formatSSE('connected', { role: 'ADMIN', timestamp: new Date().toISOString() }));

    res.on('close', () => {
      this.adminClients.delete(res);
    });
  }

  // Registrasi Client Pelanggan berdasarkan nomor WhatsApp
  registerCustomer(phone, res) {
    this.setupSSEHeaders(res);
    if (!this.customerClients.has(phone)) {
      this.customerClients.set(phone, new Set());
    }
    const clientSet = this.customerClients.get(phone);
    clientSet.add(res);

    // Kirim konfirmasi koneksi
    res.write(this.formatSSE('connected', { role: 'CUSTOMER', phone, timestamp: new Date().toISOString() }));

    res.on('close', () => {
      clientSet.delete(res);
      if (clientSet.size === 0) {
        this.customerClients.delete(phone);
      }
    });
  }

  // Broadcast pesan dari pelanggan ke seluruh Admin yang sedang aktif membuka konsol CRM
  broadcastToAdmins(event, payload) {
    const message = this.formatSSE(event, payload);
    for (const client of this.adminClients) {
      try {
        client.write(message);
      } catch (err) {
        this.adminClients.delete(client);
      }
    }
  }

  // Kirim pesan balasan dari Admin langsung ke Pelanggan yang bersangkutan
  sendToCustomer(phone, event, payload) {
    const clientSet = this.customerClients.get(phone);
    if (!clientSet || clientSet.size === 0) {
      return false;
    }
    const message = this.formatSSE(event, payload);
    for (const client of clientSet) {
      try {
        client.write(message);
      } catch (err) {
        clientSet.delete(client);
      }
    }
    return true;
  }

  // Keep-alive heartbeat
  sendHeartbeat() {
    const comment = ': ping\n\n';
    for (const client of this.adminClients) {
      try { client.write(comment); } catch (e) { this.adminClients.delete(client); }
    }
    for (const [phone, set] of this.customerClients.entries()) {
      for (const client of set) {
        try { client.write(comment); } catch (e) { set.delete(client); }
      }
      if (set.size === 0) this.customerClients.delete(phone);
    }
  }
}

const eventHub = new SimulationEventHub();
module.exports = eventHub;
