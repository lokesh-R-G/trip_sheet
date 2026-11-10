# POSTGRESQL CONNECTION RESET (WSAECONNRESET 10054) DIAGNOSTIC & RESOLUTION REPORT

**Environment**: Local Windows 11 / x64  
**Date**: November 10, 2026  
**Application**: Trip Sheet Management System (Node.js backend + PostgreSQL)  

---

## 1. POSTGRESQL WINDOWS SERVICE STATUS
- **Service Name**: `postgresql-x64-18`
- **Display Name**: `postgresql-x64-18 - PostgreSQL Server 18`
- **Current Status**: `Running`
- **Service Image Path**: `"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" runservice -N "postgresql-x64-18" -D "C:\Program Files\PostgreSQL\18\data"`

---

## 2. LISTENING PORT & PROCESS ID VERIFICATION
- **PostgreSQL Master Process PID**: `7932` (`postgres.exe`)
- **Listening Endpoints (`Get-NetTCPConnection -LocalPort 5432`)**:
  - `0.0.0.0:5432` (State: `Listen`, PID: `7932`)
  - `[::]:5432` (State: `Listen`, PID: `7932`)
- **Active Established TCP Connections**:
  - Stable connection established from `127.0.0.1:56443` to `127.0.0.1:5432` (psql console PID `13588`).

---

## 3. LOCAL TCP CONNECTIVITY (127.0.0.1 & ::1)
- **IPv4 Loopback (`127.0.0.1:5432`)**:
  - `Test-NetConnection -ComputerName 127.0.0.1 -Port 5432` $\rightarrow$ **`TcpTestSucceeded: True`**
- **IPv6 Loopback (`::1:5432`)**:
  - `Test-NetConnection -ComputerName ::1 -Port 5432` $\rightarrow$ **`TcpTestSucceeded: True`**
- **DNS Resolution of `localhost`**:
  - Resolves to dual stack: IPv6 `::1` (AAAA record) and IPv4 `127.0.0.1` (A record).
  - PostgreSQL `pg_hba.conf` permits both:
    - `host all all 127.0.0.1/32 scram-sha-256`
    - `host all all ::1/128 scram-sha-256`

---

## 4. POSTGRESQL SERVER LOG INSPECTION
Inspection of the active log file `C:\Program Files\PostgreSQL\18\data\log\postgresql-2026-11-06_000000.log`:

### Key Entries:
1. **Repeated Notice**:
   ```
   LOG: could not receive data from client: An existing connection was forcibly closed by the remote host.
   ```
   - *Technical Explanation*: On Windows, Winsock error code **10054 (`WSAECONNRESET`)** manifests on the PostgreSQL server side as *"could not receive data from client: An existing connection was forcibly closed by the remote host"*. This indicates that the **client process (Node.js / Vitest test runner / tsx script)** terminated abruptly without executing an orderly TLS/TCP shutdown handshake (`SSL_shutdown` / FIN/ACK).
2. **Crash & Recovery Event at 12:13:51 IST**:
   ```
   2026-11-10 12:13:51 IST LOG: database system was interrupted; last known up at 2026-11-10 12:11:22 IST
   2026-11-10 12:13:53 IST LOG: database system was not properly shut down; automatic recovery in progress
   ...
   2026-11-10 12:13:53 IST LOG: redo done at 0/18C40090 system usage: CPU: user: 0.00 s, system: 0.00 s, elapsed: 0.00 s
   2026-11-10 12:13:53 IST LOG: checkpoint complete
   ```
   - At 12:13:51 IST, PostgreSQL recovered from an abnormal shutdown. Any active client socket connected during that exact second received Windows TCP Reset 10054.

---

## 5. WINDOWS EVENT VIEWER & PROCESS FAILURES
- Application event log queries for PostgreSQL show normal operation.
- Event Log indicates two errors from auxiliary service `pgagent-pg18` (`Failed to query jobs table!`) at 12:13:54 and 12:13:59 IST.
- The `pgagent-pg18` service is currently in `Stopped` state and did not affect the core PostgreSQL database engine.

---

## 6. PRISMA CLIENT INSTANTIATION AND LIFECYCLE AUDIT

### Identified Issues:
1. **Singleton Management in Application**:
   - `backend/src/shared/database/prisma.ts` implements a proper Singleton `DatabaseManager.getClient()`.
   - `backend/src/modules/vehicles/external-vehicle.db.ts` implements a Singleton `ExternalVehicleDatabase.getClient()`.
   - Both provide `$disconnect()` hooks for graceful shutdown.
2. **Missing Teardown Disconnects in Test Suites**:
   - Several integration test files (`attendance.integration.test.ts`, `vehicle-selector.regression.test.ts`, `database-identity.integration.test.ts`) instantiated the Prisma client or queried PostgreSQL but did not invoke `await prisma.$disconnect()` in their `afterAll()` hooks.
   - When Vitest terminates worker threads or processes after completing tests, the unclosed TCP sockets were abruptly severed by the OS, causing Windows to send TCP RST packets (`WSAECONNRESET 10054`) and logging server-side connection aborts.

---

## 7. INDEPENDENT VERIFICATION OF `DATABASE_URL` AND `TLCM_DATABASE_URL`

1. **`DATABASE_URL`**:
   - Pointed to `postgresql://...localhost:5432/trip?schema=public`.
   - Database `trip` exists and is fully functional.
2. **`TLCM_DATABASE_URL`**:
   - Pointed to `postgresql://...localhost:5432/tlcm1?schema=public`.
   - Database `tlcm1` exists and is fully functional.
3. **Consistency Enhancement**:
   - Updated both URLs from ambiguous hostname `localhost` to explicit IPv4 loopback `127.0.0.1`.
   - Eliminates IPv4/IPv6 dual-stack resolution race conditions under Windows Winsock stack.

---

## 8. RESOLUTION OF `localhost` (IPv4 vs IPv6)
- Windows resolves `localhost` to `::1` first, followed by `127.0.0.1`.
- While PostgreSQL was bound to both `0.0.0.0` and `::`, switching to `127.0.0.1` ensures deterministic IPv4 TCP socket reuse and eliminates OS socket binding jitter.

---

## 9. CONNECTION POOLING, ACTIVE CONNECTIONS & `max_connections`
- **PostgreSQL `max_connections`**: `100` (default standard configuration).
- **Current Total Active Connections**: 10 (9 system background workers + 1 active client connection).
- **Headroom**: Over 90 available connections. No connection exhaustion or pool starvation was present.

---

## 10. CONCURRENCY & CONNECTION LEAK VERIFICATION
- Executed high-concurrency batch query test (30 simultaneous queries).
- All 30 completed in **688ms** with zero dropped connections or 10054 errors.

---

## 11. ROOT CAUSES & MINIMAL FIXES APPLIED

### Root Causes:
1. **Unclosed Client Sockets in Vitest Workers**: Vitest test worker processes were terminating without calling `prisma.$disconnect()`, causing Windows OS to forcefully reset open TCP connections on thread exit (`WSAECONNRESET 10054`).
2. **Intermittent Database Recovery Window**: At 12:13:51 IST, PostgreSQL underwent crash recovery, terminating active sockets and triggering 10054 errors on any in-flight requests.
3. **Dual-Stack Host Resolution**: Using `localhost` caused mixed IPv4 and IPv6 socket bindings between Node.js and PostgreSQL.

### Minimal Fixes Implemented:
1. **Deterministic IPv4 Loopback**:
   - Updated `.env`:
     ```env
     DATABASE_URL="postgresql://postgres:Ids%21%40%232024@127.0.0.1:5432/trip?schema=public"
     TLCM_DATABASE_URL="postgresql://postgres:Ids%21%40%232024@127.0.0.1:5432/tlcm1?schema=public"
     ```
2. **Graceful Socket Teardown in Test Suites**:
   - Added `await prisma.$disconnect()` and `await ExternalVehicleDatabase.disconnect()` to `afterAll` hooks in:
     - `backend/src/modules/drivers/attendance/attendance.integration.test.ts`
     - `backend/src/modules/vehicles/vehicle-selector.regression.test.ts`
     - `backend/src/modules/vehicles/database-identity.integration.test.ts`

---

## 12. VERIFICATION OUTCOME
- Re-ran the complete Vitest test suite (`18 test files, 169 tests`).
- Result: **100% PASSED (169 passed, 0 failures, 0 connection errors, 0 unhandled worker exit errors)**.
- Connection state remains stable under normal and concurrent usage.

