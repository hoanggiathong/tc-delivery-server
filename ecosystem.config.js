const APP_VERSION = '1.0.1';

module.exports = {
  apps: [
    // ==================== CRONJOB UAT ====================
    {
      name: 'tc-delivery-debt-calculator-uat',
      version: APP_VERSION,
      script: 'dist/cronjob/calculate-debt.cronjob.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'uat',
      },
      env_file: '.env.uat',
      log_file: './logs/debt-calculator-uat-combined.log',
      out_file: './logs/debt-calculator-uat-out.log',
      error_file: './logs/debt-calculator-uat-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      cron_restart: '0 0,2 * * *', // Run at 0:00 and 2:00 AM
      watch: false,
      autorestart: false,
      max_memory_restart: '1G',
      health_check_grace_period: 10000,
    },
    {
      name: 'tc-delivery-sms-queue-uat',
      version: APP_VERSION,
      script: 'dist/cronjob/process-sms-queue.cronjob.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      // Environment variables
      env: {
        NODE_ENV: 'uat',
      },
      // Load environment variables from file
      env_file: '.env.uat',
      // Logging
      log_file: './logs/sms-queue-uat-combined.log',
      out_file: './logs/sms-queue-uat-out.log',
      error_file: './logs/sms-queue-uat-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Process settings - Keep running (no cron_restart)
      watch: false,
      autorestart: true,
      max_memory_restart: '258M',
      // Restart policies
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      // Health check
      health_check_grace_period: 10000,
    },
    // ==================== CRONJOB PROD ====================
    {
      name: 'tc-delivery-debt-calculator-prod',
      version: APP_VERSION,
      script: 'dist/cronjob/calculate-debt.cronjob.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env.production',
      log_file: './logs/debt-calculator-prod-combined.log',
      out_file: './logs/debt-calculator-prod-out.log',
      error_file: './logs/debt-calculator-prod-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      cron_restart: '0 0,2 * * *',
      watch: false,
      autorestart: false,
      max_memory_restart: '1G',
      health_check_grace_period: 10000,
    },
    /* {
      name: 'tc-delivery-sms-queue-prod',
      version: APP_VERSION,
      script: 'dist/cronjob/process-sms-queue.cronjob.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env.production',
      log_file: './logs/sms-queue-prod-combined.log',
      out_file: './logs/sms-queue-prod-out.log',
      error_file: './logs/sms-queue-prod-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
      autorestart: true,
      max_memory_restart: '512M',
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      health_check_grace_period: 10000,
    },*/
    {
      name: 'tc-delivery-sms-queue-prod',
      version: APP_VERSION,
      script: 'dist/cronjob/process-sms-queue.cronjob.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',

      cron_restart: '*/1 * * * *',

      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env.production',

      log_file: './logs/sms-queue-prod-combined.log',
      out_file: './logs/sms-queue-prod-out.log',
      error_file: './logs/sms-queue-prod-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      watch: false,
      autorestart: false, // tắt autorestart
      max_restarts: 0, // tránh PM2 kill
      health_check_grace_period: 10000,
    },
    // ==================== SERVER ====================
    {
      name: 'tc-delivery-server-prod',
      version: APP_VERSION,
      script: 'dist/src/index.js',
      cwd: './',
      instances: 1, // Number of instances (can increase to 'max' or specific number)
      exec_mode: 'fork', // or 'cluster' for multi-instance

      // Load environment variables from file
      env_file: '.env.production',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3011,
        BASE_URL: 'https://vantai.giaphuocexpress.vn',
      },

      // Logging
      log_file: './logs/prod-combined.log',
      out_file: './logs/prod-out.log',
      error_file: './logs/prod-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Auto restart settings
      watch: false, // Disable watch in production
      ignore_watch: ['node_modules', 'logs', 'dist'],
      max_memory_restart: '2G',

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
      version: APP_VERSION,
      script: 'dist/src/index.js',
      cwd: './',
      instances: 1, // Number of instances for UAT
      exec_mode: 'fork',

      // Load environment variables from file
      env_file: '.env.uat',

      // Environment variables
      env: {
        NODE_ENV: 'uat',
        PORT: 3010,
        BASE_URL: 'https://uat.giaphuocexpress.vn',
      },

      // Logging
      log_file: './logs/uat-combined.log',
      out_file: './logs/uat-out.log',
      error_file: './logs/uat-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Auto restart settings
      watch: false, // Disable watch in UAT
      ignore_watch: ['node_modules', 'logs', 'dist'],
      max_memory_restart: '1G', // Lower memory limit for UAT

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
