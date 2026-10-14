module.exports = {
  apps: [
    {
      name: 'fintech-backend',
      script: 'dist/infrastructure/server.js',
      cwd: './platform-1-documentation/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    },
    {
      name: 'fintech-frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: '--port 3000',
      cwd: './platform-1-documentation/frontend',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
