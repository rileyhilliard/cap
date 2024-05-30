module.exports = {
  apps: [
    {
      name: 'node-server',
      script: './dist/server.prod.js',
      log_file: '/app/logs/server.log',
      time: true,
      watch: true,
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '500M',
      instances: 1,
      max_restarts: 10,
      env: {
        PORT: 5000,
        ELASTIC: 'http://elasticsearch:9200',
      },
    },
  ],
};
