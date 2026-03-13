#!/bin/bash

echo "🎵 Starting ${STREAM_NAME} Radio Services..."

# Generate Icecast config from template
sed -e "s/ICECAST_PORT/${ICECAST_PORT}/g" \
    -e "s|MOUNT_POINT|${MOUNT_POINT}|g" \
    -e "s/STREAM_TITLE/${STREAM_TITLE}/g" \
    -e "s/STREAM_DESCRIPTION/${STREAM_DESCRIPTION}/g" \
    /config/icecast.xml.template > /config/icecast.xml

# Ensure proper permissions for nobody user
chown -R nobody:nobody /var/log/icecast /config /app/audio-cache /tmp

# Start Icecast as root (it will drop privileges automatically)
echo "📡 Starting Icecast server for ${STREAM_NAME}..."
icecast -c /config/icecast.xml -b &
ICECAST_PID=$!

# Wait for Icecast to start
echo "⏳ Waiting for Icecast to initialize..."
sleep 10

# Check if Icecast is running
if curl -f http://localhost:${ICECAST_PORT}/ > /dev/null 2>&1; then
    echo "✅ Icecast server started successfully on port ${ICECAST_PORT}"
else
    echo "❌ Icecast server failed to start"
    echo "🔍 Checking Icecast process..."
    ps aux | grep icecast
    echo "🔍 Checking port ${ICECAST_PORT}..."
    netstat -tlnp | grep :${ICECAST_PORT} || echo "Port ${ICECAST_PORT} not listening"
    echo "🔍 Icecast logs:"
    tail -20 /var/log/icecast/error.log 2>/dev/null || echo "No error log found"
    exit 1
fi

# Start Node.js server in background
echo "🚀 Starting Node.js API server on port ${API_PORT}..."
node src/server.js &
API_PID=$!

# Wait a moment for API server to start
sleep 3

# Start FFmpeg streaming to Icecast
echo "🎶 Starting FFmpeg stream manager for ${STREAM_NAME}..."
node src/stream-manager.js &
STREAM_PID=$!

echo "✅ All services started for ${STREAM_NAME}!"
echo "🎵 Icecast PID: $ICECAST_PID"
echo "🚀 API PID: $API_PID" 
echo "🎶 Stream PID: $STREAM_PID"
echo "📻 Stream URL: http://localhost:${ICECAST_PORT}${MOUNT_POINT}"
echo "🔌 API URL: http://localhost:${API_PORT}/api/current"

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down ${STREAM_NAME} services..."
    kill $ICECAST_PID $API_PID $STREAM_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Keep container alive and wait for all processes
wait
