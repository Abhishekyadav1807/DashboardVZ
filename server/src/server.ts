import http from 'http';
import app from './app';
import { env } from './config/env';
import { initSocket } from './socket';
import { startOverdueTaskScheduler } from './jobs/overdue-tasks.job';

const server = http.createServer(app);

// Initialize real-time WebSockets
initSocket(server);

// Start background cron scheduler for overdue tasks
startOverdueTaskScheduler();

const port = Number(process.env.PORT) || 4000;
const host = '0.0.0.0';

server.listen(port, host, () => {
  console.log(`✅  API server running on http://${host}:${port}`);
  console.log(`    Environment : ${env.NODE_ENV}`);
  console.log(`    CORS origin : ${env.CLIENT_URL}`);
  console.log(`    WebSockets  : Socket.io enabled`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string): void {
  console.log(`\n⚠️   ${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('🛑  HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('💥  Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥  Unhandled promise rejection:', reason);
  process.exit(1);
});

export { server };
