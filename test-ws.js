const WebSocket = require('ws');

const ws = new WebSocket('wss://localhost:52390/api/copilot', {
  rejectUnauthorized: false
});

ws.on('open', () => {
  console.log('✓ WebSocket connected successfully');
  ws.close();
});

ws.on('error', (error) => {
  console.error('✗ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

setTimeout(() => {
  console.error('✗ Connection timeout');
  process.exit(1);
}, 5000);
