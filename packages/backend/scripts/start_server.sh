#!/bin/sh

# Start the server with PM2
yarn pm2 start pm2.config.cjs --env production

# Keep the container running
tail -f /app/logs/server-0.log