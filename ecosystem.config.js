module.exports = {
  apps: [{
    name: "mrigasthali_backend",
    script: "./dist/server.js",
    instances: 1,
    autorestart: true,
    watch: true,
    ignore_watch: ["logs/*"],
    max_memory_restart: "1G",
    env_production: {
      NODE_ENV: "production",
      PORT: 3001
    },
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    log_file: "logs/combined.log",
    time: true
  }]
}
