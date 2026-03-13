const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.API_PORT || 3000;
const STREAM_NAME = process.env.STREAM_NAME || 'radio';
const ICECAST_PORT = process.env.ICECAST_PORT || 8000;
const MOUNT_POINT = process.env.MOUNT_POINT || '/live';
const STREAM_TITLE = process.env.STREAM_TITLE || 'Live Radio';

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    streamName: STREAM_NAME,
    streamTitle: STREAM_TITLE,
    streamUrl: `http://localhost:${ICECAST_PORT}${MOUNT_POINT}`,
    status: 'live'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    streamName: STREAM_NAME,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[${STREAM_NAME}] Live Radio API server running on port ${PORT}`);
});
