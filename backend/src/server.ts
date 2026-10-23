import 'dotenv/config';
import { app } from './app.js';
import { prisma } from './shared/database/prisma.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Trip Sheet Backend running on http://localhost:${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/v1/health`);
});

async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connections closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcefully terminating after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
