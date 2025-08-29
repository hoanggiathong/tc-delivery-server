module.exports = {
  apps: [
    {
      name: 'tc-delivery-server-prod',
      script: 'dist/src/index.js',
      cwd: '/Users/nguyenquocbao/Desktop/tochau/tc-delivery-server',
      instances: 1, // Number of instances (can increase to 'max' or specific number)
      exec_mode: 'fork', // or 'cluster' for multi-instance

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3011,
      },
      env_file: '.env.production',

      // Logging
      log_file: './logs/prod-combined.log',
      out_file: './logs/prod-out.log',
      error_file: './logs/prod-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Auto restart settings
      watch: false, // Disable watch in production
      ignore_watch: ['node_modules', 'logs', 'dist'],
      max_memory_restart: '1G',

      // Restart policies
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',

      // Advanced settings
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Health check
      health_check_grace_period: 10000,
    },
    {
      name: 'tc-delivery-server-uat',
      script: 'dist/src/index.js',
      cwd: '/Users/nguyenquocbao/Desktop/tochau/tc-delivery-server',
      instances: 1, // Number of instances for UAT
      exec_mode: 'fork',

      // Environment variables
      env: {
        NODE_ENV: 'uat',
        PORT: 3010,
      },
      env_file: '.env.uat',

      // Logging
      log_file: './logs/uat-combined.log',
      out_file: './logs/uat-out.log',
      error_file: './logs/uat-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Auto restart settings
      watch: false, // Disable watch in UAT
      ignore_watch: ['node_modules', 'logs', 'dist'],
      max_memory_restart: '2G', // Lower memory limit for UAT

      // Restart policies
      restart_delay: 1000,
      max_restarts: 5, // Fewer restarts for UAT
      min_uptime: '10s',

      // Advanced settings
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Health check
      health_check_grace_period: 10000,
    },
  ],
};
