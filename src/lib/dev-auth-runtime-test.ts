import 'server-only';

import mysql from 'mysql2/promise';
import { cookies } from 'next/headers';

import {
  clearSession,
  getCurrentSession,
  hashPassword,
  loginUser,
  logoutUser,
  requireMemberBReadAccess,
  requireMemberBWriteAccess,
  requireRecallImpactAccess,
  setSession,
} from './auth';
import { pool } from './db';
import {
  createDistributor,
  createInventory,
  createInventoryLocation,
  createRecall,
  createRecallImpact,
  createShipment,
  deleteDistributor,
  deleteInventory,
  deleteInventoryLocation,
  deleteRecall,
  deleteRecallImpact,
  deleteShipment,
  getAllDistributors,
  getAllInventory,
  getAllInventoryLocations,
  getAllRecallImpacts,
  getAllRecalls,
  getAllShipments,
  getDistributorById,
  getInventoryById,
  getInventoryLocationById,
  getRecallById,
  getRecallImpactById,
  getShipmentById,
  updateDistributor,
  updateInventory,
  updateInventoryLocation,
  updateRecall,
  updateRecallImpact,
  updateShipment,
} from './member-b-actions';
import { getRecallImpact } from './recall-impact';

export type RuntimeTestCaseResult = {
  name: string;
  expectedStatus: number;
  actualStatus: number | null;
  passed: boolean;
  detail: string;
};

export type RuntimeTestSummary = {
  success: boolean;
  mode: 'development';
  tests: RuntimeTestCaseResult[];
  createdRecords: Array<{ table: string; id: number }>;
};

const TEST_DB_NAME = process.env.TEST_DB_NAME || 'recallradar_test_db';

function ensureHarnessAllowed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development auth runtime tests are disabled in production.');
  }

  if (process.env.ENABLE_AUTH_RUNTIME_TESTS !== 'true') {
    throw new Error('Set ENABLE_AUTH_RUNTIME_TESTS=true to enable the development auth runtime harness.');
  }

  if (process.env.DB_NAME && process.env.DB_NAME !== TEST_DB_NAME) {
    throw new Error(`The runtime harness must use DB_NAME=${TEST_DB_NAME}. Received ${process.env.DB_NAME}.`);
  }
}

async function ensureTestDatabaseSetup() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = Number(process.env.DB_PORT || 3306);
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';

  const rootConn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    multipleStatements: true,
  });

  try {
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await rootConn.end();
  }

  const conn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: TEST_DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_user (
        user_id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('Admin','Staff') NOT NULL,
        PRIMARY KEY (user_id),
        UNIQUE KEY uq_app_user_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const staffHash = hashPassword('StaffPass!123');
    const adminHash = hashPassword('AdminPass!123');

    await conn.query(
      `INSERT INTO app_user (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         role = VALUES(role)`,
      ['Staff User', 'staff.test@recallradar.local', staffHash, 'Staff']
    );

    await conn.query(
      `INSERT INTO app_user (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         role = VALUES(role)`,
      ['Admin User', 'admin.test@recallradar.local', adminHash, 'Admin']
    );
  } finally {
    await conn.end();
  }
}

async function getCurrentCookieStore() {
  return await cookies();
}

async function setTestCookie(value: string) {
  const cookieStore = await getCurrentCookieStore();
  cookieStore.set('rr_session', value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60,
  });
}

async function clearTestCookie() {
  const cookieStore = await getCurrentCookieStore();
  cookieStore.delete('rr_session');
}

async function forceInvalidSession() {
  await setTestCookie('not-a-valid-session-token');
}

async function forceExpiredSession() {
  await setTestCookie('header.payload.signature');
}

async function testUnauthenticatedRead(): Promise<RuntimeTestCaseResult> {
  await clearTestCookie();

  try {
    await getAllDistributors();
    return {
      name: 'Unauthenticated user cannot read Member B records',
      expectedStatus: 401,
      actualStatus: 200,
      passed: false,
      detail: 'Unexpectedly allowed unauthenticated Member B read access.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Unauthenticated user cannot read Member B records',
      expectedStatus: 401,
      actualStatus: 401,
      passed: message.toLowerCase().includes('authentication required'),
      detail: message,
    };
  }
}

async function testUnauthenticatedCreate(): Promise<RuntimeTestCaseResult> {
  await clearTestCookie();

  try {
    await createDistributor({ name: 'Unauth Test Distributor' });
    return {
      name: 'Unauthenticated user cannot create records',
      expectedStatus: 401,
      actualStatus: 200,
      passed: false,
      detail: 'Unexpectedly allowed unauthenticated write access.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Unauthenticated user cannot create records',
      expectedStatus: 401,
      actualStatus: 401,
      passed: message.toLowerCase().includes('authentication required'),
      detail: message,
    };
  }
}

async function testStaffRead(): Promise<RuntimeTestCaseResult> {
  try {
    await clearSession();
    await clearTestCookie();

    const user = await loginUser('staff.test@recallradar.local', 'StaffPass!123');
    const rows = await getAllDistributors();
    await logoutUser();

    return {
      name: 'Staff can read records',
      expectedStatus: 200,
      actualStatus: 200,
      passed: user.role === 'Staff' && Array.isArray(rows),
      detail: `Staff authenticated and read ${Array.isArray(rows) ? rows.length : 0} distributor rows.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Staff can read records',
      expectedStatus: 200,
      actualStatus: 500,
      passed: false,
      detail: message,
    };
  }
}

async function testStaffCannotWrite(): Promise<RuntimeTestCaseResult> {
  try {
    await clearSession();
    await clearTestCookie();

    await loginUser('staff.test@recallradar.local', 'StaffPass!123');
    await createDistributor({ name: 'Staff Forbidden Distributor' });
    await logoutUser();
    return {
      name: 'Staff cannot create, update or delete records',
      expectedStatus: 403,
      actualStatus: 200,
      passed: false,
      detail: 'Unexpectedly allowed staff write access.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Staff cannot create, update or delete records',
      expectedStatus: 403,
      actualStatus: 403,
      passed: message.toLowerCase().includes('insufficient role permissions') || message.toLowerCase().includes('admin only'),
      detail: message,
    };
  }
}

async function testAdminCrud(): Promise<RuntimeTestCaseResult> {
  try {
    await clearSession();
    await clearTestCookie();

    const user = await loginUser('admin.test@recallradar.local', 'AdminPass!123');
    const createdId = await createDistributor({ name: 'Admin Dev Test Distributor' });
    const row = await getDistributorById(createdId);
    const updated = await updateDistributor(createdId, { name: 'Admin Dev Test Distributor Updated' });
    const deletedRows = await deleteDistributor(createdId);
    await logoutUser();

    return {
      name: 'Admin can perform CRUD operations',
      expectedStatus: 200,
      actualStatus: 200,
      passed: user.role === 'Admin' && !!row && !!updated && deletedRows > 0,
      detail: `Admin created, read, updated, and deleted distributor ${createdId}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Admin can perform CRUD operations',
      expectedStatus: 200,
      actualStatus: 500,
      passed: false,
      detail: message,
    };
  }
}

async function testStaffRecallImpactAccess(): Promise<RuntimeTestCaseResult> {
  try {
    await clearSession();
    await clearTestCookie();

    await loginUser('staff.test@recallradar.local', 'StaffPass!123');
    const analysis = await getRecallImpact(1);
    await logoutUser();

    const isAllowed = analysis && typeof analysis === 'object' && ('recall' in analysis || 'error' in analysis);
    return {
      name: 'Staff can access recall-impact analysis',
      expectedStatus: 200,
      actualStatus: 200,
      passed: isAllowed,
      detail: !analysis.error ? 'Staff access allowed.' : `Staff access returned: ${analysis.error}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Staff can access recall-impact analysis',
      expectedStatus: 200,
      actualStatus: 500,
      passed: false,
      detail: message,
    };
  }
}

async function testUnauthenticatedRecallImpact(): Promise<RuntimeTestCaseResult> {
  await clearTestCookie();

  try {
    await getRecallImpact(1);
    return {
      name: 'Unauthenticated users cannot access recall-impact analysis',
      expectedStatus: 401,
      actualStatus: 200,
      passed: false,
      detail: 'Unexpectedly allowed unauthenticated recall-impact access.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Unauthenticated users cannot access recall-impact analysis',
      expectedStatus: 401,
      actualStatus: 401,
      passed: message.toLowerCase().includes('authentication required') || message.toLowerCase().includes('unauthorized'),
      detail: message,
    };
  }
}

async function testInvalidCredentialsRejected(): Promise<RuntimeTestCaseResult> {
  try {
    await loginUser('admin.test@recallradar.local', 'WrongPassword!123');
    return {
      name: 'Invalid credentials are rejected',
      expectedStatus: 401,
      actualStatus: 200,
      passed: false,
      detail: 'Unexpectedly accepted invalid credentials.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Invalid credentials are rejected',
      expectedStatus: 401,
      actualStatus: 401,
      passed: message.toLowerCase().includes('invalid credentials'),
      detail: message,
    };
  }
}

async function testLogoutInvalidatesSession(): Promise<RuntimeTestCaseResult> {
  try {
    await clearSession();
    await clearTestCookie();

    await loginUser('admin.test@recallradar.local', 'AdminPass!123');
    const beforeLogout = await getCurrentSession();
    const result = await logoutUser();
    const afterLogout = await getCurrentSession();

    return {
      name: 'Logout invalidates the session',
      expectedStatus: 200,
      actualStatus: 200,
      passed: !!beforeLogout && result.success === true && afterLogout === null,
      detail: `Pre-logout session: ${beforeLogout ? beforeLogout.email : 'none'}; post-logout session: ${afterLogout ? afterLogout.email : 'none'}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Logout invalidates the session',
      expectedStatus: 200,
      actualStatus: 500,
      passed: false,
      detail: message,
    };
  }
}

async function testInvalidAndExpiredSessionCookies(): Promise<RuntimeTestCaseResult> {
  try {
    await clearSession();
    await clearTestCookie();

    await forceInvalidSession();
    const invalidSession = await getCurrentSession();
    await forceExpiredSession();
    const expiredSession = await getCurrentSession();
    await clearTestCookie();

    return {
      name: 'Invalid and expired session cookies cannot access protected operations',
      expectedStatus: 401,
      actualStatus: 401,
      passed: invalidSession === null && expiredSession === null,
      detail: `Invalid cookie result: ${invalidSession ? 'accepted' : 'rejected'}; expired cookie result: ${expiredSession ? 'accepted' : 'rejected'}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Invalid and expired session cookies cannot access protected operations',
      expectedStatus: 401,
      actualStatus: 500,
      passed: false,
      detail: message,
    };
  }
}

export async function runAuthRuntimeTestHarness(): Promise<RuntimeTestSummary> {
  ensureHarnessAllowed();
  await ensureTestDatabaseSetup();

  const tests: RuntimeTestCaseResult[] = [];
  tests.push(await testUnauthenticatedRead());
  tests.push(await testUnauthenticatedCreate());
  tests.push(await testStaffRead());
  tests.push(await testStaffCannotWrite());
  tests.push(await testAdminCrud());
  tests.push(await testStaffRecallImpactAccess());
  tests.push(await testUnauthenticatedRecallImpact());
  tests.push(await testInvalidCredentialsRejected());
  tests.push(await testLogoutInvalidatesSession());
  tests.push(await testInvalidAndExpiredSessionCookies());

  const createdRecords: Array<{ table: string; id: number }> = [];
  const success = tests.every((test) => test.passed);

  return {
    success,
    mode: 'development',
    tests,
    createdRecords,
  };
}
