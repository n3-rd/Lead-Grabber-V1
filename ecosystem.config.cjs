module.exports = {
  apps: [{
    name: 'a2p',
    script: './build/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3005,
      HOST: '0.0.0.0'
    }
  }]
};