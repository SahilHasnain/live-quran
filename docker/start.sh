#!/bin/bash

echo "🎵 Starting ${STREAM_NAME} Radio Services..."

# Generate Icecast config from template using cat and here-doc (more reliable than sed)
cat > /config/icecast.xml << EOF
<icecast>
    <location>Earth</location>
    <admin>admin@localhost</admin>
    
    <!-- Security: Run as non-root user -->
    <security>
        <chroot>0</chroot>
        <changeowner>
            <user>nobody</user>
            <group>nobody</group>
        </changeowner>
    </security>
    
    <limits>
        <clients>100</clients>
        <sources>10</sources>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
        <burst-on-connect>1</burst-on-connect>
        <burst-size>65535</burst-size>
    </limits>

    <authentication>
        <source-password>hackme</source-password>
        <relay-password>hackme</relay-password>
        <admin-user>admin</admin-user>
        <admin-password>hackme</admin-password>
    </authentication>

    <hostname>localhost</hostname>
    
    <listen-socket>
        <port>${ICECAST_PORT}</port>
        <bind-address>0.0.0.0</bind-address>
    </listen-socket>

    <mount type="normal">
        <mount-name>${MOUNT_POINT}</mount-name>
        <password>hackme</password>
        <max-listeners>100</max-listeners>
        <burst-size>65536</burst-size>
        <hidden>0</hidden>
        <no-yp>1</no-yp>
        <stream-name>${STREAM_TITLE}</stream-name>
        <stream-description>${STREAM_DESCRIPTION}</stream-description>
        <stream-genre>Islamic</stream-genre>
        <http-headers>
            <header name="Access-Control-Allow-Origin" value="*" />
            <header name="Access-Control-Allow-Headers" value="Origin, Accept, X-Requested-With, Content-Type" />
            <header name="Access-Control-Allow-Methods" value="GET, OPTIONS, HEAD" />
        </http-headers>
    </mount>

    <fileserve>1</fileserve>
    
    <paths>
        <basedir>/usr/share/icecast</basedir>
        <logdir>/var/log/icecast</logdir>
        <webroot>/usr/share/icecast/web</webroot>
        <adminroot>/usr/share/icecast/admin</adminroot>
        <pidfile>/tmp/icecast.pid</pidfile>
        <alias source="/" destination="/status.xsl"/>
    </paths>

    <logging>
        <accesslog>-</accesslog>
        <errorlog>-</errorlog>
        <loglevel>3</loglevel>
        <logsize>10000</logsize>
    </logging>
</icecast>
EOF

# Verify the config was generated
if [ ! -s /config/icecast.xml ]; then
    echo "❌ Failed to generate Icecast config"
    exit 1
fi

echo "✅ Icecast config generated successfully"

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
