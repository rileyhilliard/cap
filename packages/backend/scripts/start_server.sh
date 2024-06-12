#!/bin/sh

# Start the server with PM2
yarn pm2 start pm2.config.cjs --env production

# Keep the container running
if [ -f "/app/logs/server-0.log" ]; then
    tail -f "/app/logs/server-0.log"
else
    tail -f "/dev/null"
fi
