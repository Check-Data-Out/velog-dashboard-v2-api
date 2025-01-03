module.exports = {
  apps: [
    {
      name: 'velog-dashboard-v2-api',
      script: 'dist/index.js', // 빌드된 메인 파일 경로
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      restart_delay: 4000,
    },
  ],
};
