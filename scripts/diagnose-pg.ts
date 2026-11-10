import { prisma } from '../backend/src/shared/database/prisma.js';
import { ExternalVehicleDatabase } from '../backend/src/modules/vehicles/external-vehicle.db.js';

async function main() {
  console.log('--- CHECKING PRIMARY TRIP DB (DATABASE_URL) ---');
  const maxConn = await prisma.$queryRawUnsafe<any[]>('SHOW max_connections');
  console.log('max_connections:', maxConn);

  const totalConn = await prisma.$queryRawUnsafe<any[]>('SELECT count(*) as total_active FROM pg_stat_activity');
  console.log('total active connections:', totalConn);

  const conns = await prisma.$queryRawUnsafe<any[]>(
    'SELECT pid, datname, usename, application_name, client_addr, client_port, state, query_start, state_change FROM pg_stat_activity ORDER BY datname, pid'
  );
  console.log('Active connections list:');
  console.table(conns);

  console.log('\n--- CHECKING TLCM EXTERNAL DB (TLCM_DATABASE_URL) ---');
  const tlcmPrisma = ExternalVehicleDatabase.getClient();
  const tlcmInfo = await tlcmPrisma.$queryRawUnsafe<any[]>('SELECT current_database(), current_schema()');
  console.log('TLCM connection test:', tlcmInfo);

  await prisma.$disconnect();
  await ExternalVehicleDatabase.disconnect();
}

main().catch(err => {
  console.error('Diagnostic run error:', err);
  process.exit(1);
});

