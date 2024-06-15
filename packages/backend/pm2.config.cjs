module.exports = {
  apps: [
    {
      name: 'node-server',
      script: './dist/server.prod.js',
      log_file: './logs/server.log',
      node_args: '--enable-source-maps',
      time: true,
      // Turning off watch because the docker container is going to be removed and replaced @ deployment time
      // so there's nothing to watch for: the service is going to be killed and replace entirely.
      // In the future, if this is moved to a replacement model then watch should be re-enabled
      // watch: true,
      // ignore_watch: ['node_modules', 'logs', 'cache'],
      max_memory_restart: '300M',
      instances: 1,
      max_restarts: 10,
      env: {
        PORT: 4000,
        ELASTIC: 'http://elasticsearch:9200',
        POSTGRES_URI: 'http://root:postgres@postgres:5432',
      },
    },
  ],
};
