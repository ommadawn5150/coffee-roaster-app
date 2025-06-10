const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

let serialPort = null; // 現在のポート接続を保持する変数
let parser = null;
let portInterval = null; // 定期実行を管理する変数

// フロントエンドとの接続処理
io.on('connection', (socket) => {
  console.log('✅ Client connected');

  // 1. ポートリスト取得要求の待受
  socket.on('getPorts', async () => {
    try {
      const ports = await SerialPort.list();
      socket.emit('portsList', ports); // 見つかったポートのリストを送信
    } catch (err) {
      console.error('Error listing ports:', err);
    }
  });

  // 2. ポート接続要求の待受
  socket.on('connectPort', (path) => {
    if (serialPort && serialPort.isOpen) {
      console.log(`Closing existing port ${serialPort.path}`);
      serialPort.close();
    }

    console.log(`Attempting to connect to port ${path}`);
    serialPort = new SerialPort({ path, baudRate: 9600 });
    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    // 接続成功時の処理
    serialPort.on('open', () => {
      console.log(`✅ Port ${path} opened`);
      io.emit('portStatus', { status: 'connected', path });

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
      io.emit('temperatureUpdate', parseFloat(temp));
    });

    // エラー時の処理
    serialPort.on('error', (err) => {
      console.error(`Port error: ${err.message}`);
      io.emit('portStatus', { status: 'error', message: err.message });
      serialPort = null;
    });

    // 切断時の処理
    serialPort.on('close', () => {
      console.log(`Port ${path} closed`);
      if (portInterval) clearInterval(portInterval);
      io.emit('portStatus', { status: 'disconnected' });
      serialPort = null;
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