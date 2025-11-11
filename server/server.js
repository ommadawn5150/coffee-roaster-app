const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const path = require('path');
const fs = require('fs/promises');
const cors = require('cors');

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;

const app = express();
app.use(cors({ origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ["GET", "POST"]
  }
});
let serialPort = null; // 現在のポート接続を保持する変数
let parser = null;
let portInterval = null; // 定期実行を管理する変数
let isConnecting = false;
let latestTemperature = null;
let roastSessions = [];

const dataDir = path.join(__dirname, 'data');
const sessionsPath = path.join(dataDir, 'sessions.json');

const ensureDataFileExists = async () => {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.access(sessionsPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(sessionsPath, JSON.stringify([], null, 2), 'utf-8');
    } else {
      throw err;
    }
  }
};

const loadSessionsFromDisk = async () => {
  try {
    await ensureDataFileExists();
    const raw = await fs.readFile(sessionsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      roastSessions = parsed;
    } else if (Array.isArray(parsed.sessions)) {
      roastSessions = parsed.sessions;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Failed to load sessions from disk:', err);
    }
  }
};

const saveSessionsToDisk = async () => {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(sessionsPath, JSON.stringify(roastSessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save sessions to disk:', err);
    throw err;
  }
};

loadSessionsFromDisk();

app.get('/sessions', (_req, res) => {
  res.json({ sessions: roastSessions });
});

app.post('/sessions', async (req, res) => {
  const incoming = Array.isArray(req.body) ? req.body : req.body?.sessions;
  if (!Array.isArray(incoming)) {
    res.status(400).json({ error: 'Invalid payload: sessions array required.' });
    return;
  }
  roastSessions = incoming;
  try {
    await saveSessionsToDisk();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to persist sessions.' });
  }
});

const findDefaultPort = async () => {
  try {
    const ports = await SerialPort.list();
    if (!Array.isArray(ports) || ports.length === 0) {
      console.warn('No serial ports detected.');
      return null;
    }

    const preferredPort = ports.find((port) => {
      const lowerPath = port.path?.toLowerCase() ?? '';
      const manufacturer = port.manufacturer?.toLowerCase() ?? '';
      return lowerPath.includes('ttyusb') || lowerPath.includes('ttyacm') || manufacturer.includes('arduino');
    });

    return (preferredPort ?? ports[0]).path;
  } catch (err) {
    console.error('Error listing serial ports:', err);
    return null;
  }
};

// フロントエンドとの接続処理
io.on('connection', (socket) => {
  console.log('✅ Client connected');

  // 2. ポート接続要求の待受
  socket.on('connectPort', async (requestedPath) => {
    const sanitizedPath = typeof requestedPath === 'string' && requestedPath.trim().length > 0
      ? requestedPath.trim()
      : null;

    const path = sanitizedPath ?? await findDefaultPort();

    if (!path) {
      console.error('No serial port path available.');
      io.emit('portStatus', { status: 'error', message: 'Invalid serial port path.' });
      return;
    }

    if (serialPort && serialPort.isOpen) {
      socket.emit('portStatus', { status: 'connected', path: serialPort.path });
      if (latestTemperature !== null) {
        socket.emit('temperatureUpdate', latestTemperature);
      }
      return;
    }

    if (isConnecting) {
      socket.emit('portStatus', { status: 'connecting', path: path });
      return;
    }

    isConnecting = true;
    io.emit('portStatus', { status: 'connecting', path });

    if (serialPort && serialPort.isOpen) {
      console.log(`Closing existing port ${serialPort.path}`);
      serialPort.close();
    }

    console.log(`Attempting to connect to port ${path}`);
    try {
      serialPort = new SerialPort({ path, baudRate: 9600 });
    } catch (err) {
      console.error(`Failed to open port ${path}: ${err.message}`);
      io.emit('portStatus', { status: 'error', message: err.message });
      serialPort = null;
      isConnecting = false;
      return;
    }
    if (parser) {
      parser.removeAllListeners('data');
    }
    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    // 接続成功時の処理
    serialPort.on('open', () => {
      console.log(`✅ Port ${path} opened`);
      io.emit('portStatus', { status: 'connected', path });
      isConnecting = false;

      // 温度取得コマンドを1秒ごとに送信開始
      if (portInterval) clearInterval(portInterval);
      portInterval = setInterval(() => {
        if (serialPort && serialPort.isOpen) {
          serialPort.write('t\n');
        }
      }, 1000);
    });

    // データ受信時の処理
    parser.on('data', (temp) => {
      const parsed = parseFloat(temp);
      if (!Number.isNaN(parsed)) {
        latestTemperature = parsed;
        io.emit('temperatureUpdate', parsed);
      }
    });

    // エラー時の処理
    serialPort.on('error', (err) => {
      console.error(`Port error: ${err.message}`);
      io.emit('portStatus', { status: 'error', message: err.message });
      serialPort = null;
      isConnecting = false;
    });

    // 切断時の処理
    serialPort.on('close', () => {
      console.log(`Port ${path} closed`);
      if (portInterval) clearInterval(portInterval);
      io.emit('portStatus', { status: 'disconnected' });
      serialPort = null;
      isConnecting = false;
    });
  });
  
  // 3. ポート切断要求の待受
  socket.on('disconnectPort', () => {
    if (serialPort && serialPort.isOpen) {
      serialPort.close();
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
  });
});

server.listen(3001, () => {
  console.log('🔥 Roasting server listening on port 3001');
});
