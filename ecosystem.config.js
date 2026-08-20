module.exports = {
  apps: [
    {
      name: 'guess-the-song-backend',
      script: 'backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'guess-the-song-frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: '--port 4342 --host',
      cwd: './frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
