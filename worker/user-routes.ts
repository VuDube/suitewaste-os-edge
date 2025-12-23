import { Hono } from "hono";
import type { Context, Next } from 'hono';
import { SupplierEntity, InventoryLedgerEntity, TransactionEntity, UserEntity, SessionEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import type { InventoryLedgerEntry, Supplier, Transaction, User, ConfigUserUpdate, Session } from "@shared/types";
import { HTTPException } from "hono/http-exception";
export interface Env {
  GlobalDurableObject: DurableObjectNamespace<any>;
}
export type HonoApp = Hono<{ Bindings: Env; Variables: { user?: User; sessionId?: string } }>;
export type HonoContext = Context<{ Bindings: Env; Variables: { user?: User; sessionId?: string } }>;
const unauthorized = () => new HTTPException(401, { message: 'Unauthorized' });
const forbidden = () => new HTTPException(403, { message: 'Forbidden' });
const getEprStream = (materialType: string): string => {
  const lowerMat = materialType.toLowerCase();
  if (lowerMat.includes('plastic') || lowerMat.includes('pet')) return 'Plastic';
  if (lowerMat.includes('paper') || lowerMat.includes('cardboard')) return 'Paper & Packaging';
  if (lowerMat.includes('glass')) return 'Glass';
  if (lowerMat.includes('copper') || lowerMat.includes('aluminum') || lowerMat.includes('steel') || lowerMat.includes('metal')) return 'Metals';
  if (lowerMat.includes('electronic') || lowerMat.includes('weee') || lowerMat.includes('battery')) return 'Electrical & Electronic';
  return 'Other';
};
export function userRoutes(app: HonoApp) {
  // --- AUTH MIDDLEWARE ---
  app.use('/api/*', async (c: HonoContext, next: Next) => {
    const path = c.req.path;
    if (['/api/auth/init', '/api/auth/login', '/api/health'].some(p => path.startsWith(p))) {
      return next();
    }
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw unauthorized();
    const token = authHeader.split(' ')[1];
    const session = await new SessionEntity(c.env, token).getState();
    if (!session || !session.userId) throw unauthorized();
    const user = await new UserEntity(c.env, session.userId).getState();
    if (!user || !user.id || !user.active) throw unauthorized();
    c.set('user', user);
    c.set('sessionId', token);
    await next();
  });
  const requireRole = (roles: User['role'][]) => async (c: HonoContext, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) throw forbidden();
    await next();
  };
  // --- AUTH ROUTES ---
  app.get('/api/auth/init', async (c: HonoContext) => {
    const allUsers = (await UserEntity.list(c.env, null, 1)).items;
    if (allUsers.length === 0) {
      await UserEntity.ensureSeed(c.env);
      return ok(c, { seeded: true });
    }
    return ok(c, { seeded: false });
  });
  app.post('/api/auth/login', async (c: HonoContext) => {
    const { username, password } = await c.req.json<{ username?: string; password?: string }>();
    if (!username || !password) return bad(c, 'Username and password required');
    const allUsers = (await UserEntity.list(c.env, null, 100)).items;
    const user = allUsers.find(u => u.username === username && u.password_hash === password);
    if (!user || !user.active) return bad(c, 'Invalid credentials');
    const sessionId = crypto.randomUUID();
    await SessionEntity.create(c.env, {
      id: sessionId,
      userId: user.id,
      createdAt: Date.now()
    });
    const { password_hash, ...userWithoutPassword } = user;
    return ok(c, { user: userWithoutPassword, token: sessionId });
  });
  app.post('/api/auth/logout', async (c: HonoContext) => {
    const sessionId = c.get('sessionId');
    if (sessionId) {
      await SessionEntity.delete(c.env, sessionId);
    }
    return ok(c, { success: true });
  });
  app.get('/api/auth/me', async (c: HonoContext) => {
    const user = c.get('user');
    if (!user) throw unauthorized();
    const { password_hash, ...safeUser } = user;
    return ok(c, safeUser);
  });
  // --- ADMIN: GLOBAL SESSION CLEAR ---
  app.post('/api/admin/sessions/clear', requireRole(['admin']), async (c: HonoContext) => {
    const sessions = await SessionEntity.list(c.env, null, 1000);
    const ids = sessions.items.map(s => s.id);
    await SessionEntity.deleteMany(c.env, ids);
    return ok(c, { cleared: ids.length });
  });
  // --- DASHBOARD ---
  app.get('/api/dashboard', async (c: HonoContext) => {
    const user = c.get('user');
    if (!user) throw unauthorized();
    const [suppliersPage, ledgerPage, transactionsPage] = await Promise.all([
      SupplierEntity.list(c.env, null, 500),
      InventoryLedgerEntity.list(c.env, null, 500),
      TransactionEntity.list(c.env, null, 500),
    ]);
    const recentSuppliers = (suppliersPage.items || []).sort((a, b) => b.created_at - a.created_at).slice(0, 5);
    const recentLedger = (ledgerPage.items || []).sort((a, b) => b.capture_timestamp - a.capture_timestamp).slice(0, 5);
    const recentTransactions = (transactionsPage.items || []).sort((a, b) => b.transaction_timestamp - a.transaction_timestamp).slice(0, 5);
    const totalWeight = (ledgerPage.items || []).reduce((sum, item) => sum + item.weight_kg, 0);
    const totalValue = (transactionsPage.items || []).reduce((sum, item) => sum + item.amount, 0);
    const totalEPR = (transactionsPage.items || []).reduce((sum, item) => sum + item.epr_fee, 0);
    const weeeCompliantCount = (suppliersPage.items || []).filter(s => s.is_weee_compliant).length;
    const weeePct = (suppliersPage.items?.length || 0) > 0 ? (weeeCompliantCount / suppliersPage.items.length) * 100 : 0;
    const data = {
      operator: { recentTransactions, recentLedger },
      manager: { totalWeight, totalValue, totalEPR, recentSuppliers, recentLedger },
      admin: { totalWeight, totalValue, totalEPR, weeePct, recentSuppliers, userCount: (await UserEntity.list(c.env, null, 100)).items.length },
      auditor: { totalWeight, totalEPR, weeePct, recentLedger, recentTransactions },
    };
    return ok(c, {
      summary: data[user.role as keyof typeof data] || data.operator,
      hardwareStatus: { scale: 'connected', camera: 'healthy' },
      pendingSyncCount: 0,
    });
  });
  app.get('/api/epr-report', requireRole(['admin', 'auditor']), async (c: HonoContext) => {
    const [suppliers, ledger, transactions] = await Promise.all([
      SupplierEntity.list(c.env, null, 1000),
      InventoryLedgerEntity.list(c.env, null, 1000),
      TransactionEntity.list(c.env, null, 1000),
    ]);
    const supplierItems = suppliers.items || [];
    const ledgerItems = ledger.items || [];
    const transactionItems = transactions.items || [];
    const compliance_pct = supplierItems.length > 0 ? (supplierItems.filter(s => s.is_weee_compliant).length / supplierItems.length) * 100 : 0;
    const total_fees = transactionItems.reduce((sum, t) => sum + t.epr_fee, 0);
    const streams: { [key: string]: { weight: number; fees: number } } = {};
    const ledgerMap = new Map(ledgerItems.map(l => [l.id, l]));
    transactionItems.forEach(t => {
      const ledgerEntry = ledgerMap.get(t.ledger_entry_id);
      if (ledgerEntry) {
        const streamName = getEprStream(ledgerEntry.material_type);
        if (!streams[streamName]) streams[streamName] = { weight: 0, fees: 0 };
        streams[streamName].weight += ledgerEntry.weight_kg;
        streams[streamName].fees += t.epr_fee;
      }
    });
    return ok(c, { compliance_pct, total_fees, streams });
  });
  app.get('/api/config/users', requireRole(['admin']), async (c: HonoContext) => {
    const users = (await UserEntity.list(c.env, null, 200)).items || [];
    return ok(c, users.map(({ password_hash, ...u }) => u));
  });
  app.post('/api/config/users', requireRole(['admin']), async (c: HonoContext) => {
    const updates = await c.req.json<ConfigUserUpdate[]>();
    for (const update of updates) {
      const inst = new UserEntity(c.env, update.id);
      await inst.mutate(curr => ({ ...curr, role: update.role, active: update.active, features: update.features }));
    }
    return ok(c, { success: true });
  });
  app.get('/api/suppliers', async (c: HonoContext) => ok(c, (await SupplierEntity.list(c.env, null, 100)).items || []));
  app.post('/api/suppliers', requireRole(['admin', 'manager']), async (c: HonoContext) => {
    const body = await c.req.json<Partial<Supplier>>();
    const s: Supplier = {
      id: crypto.randomUUID(),
      name: body.name || "Unnamed",
      is_weee_compliant: body.is_weee_compliant || false,
      created_at: Date.now(),
      updated_at: Date.now(),
      ...body
    };
    return ok(c, await SupplierEntity.create(c.env, s));
  });
  app.delete('/api/suppliers/:id', requireRole(['admin', 'manager']), async (c: HonoContext) => {
    const id = c.req.param('id');
    const existed = await SupplierEntity.delete(c.env, id);
    return ok(c, { id, deleted: existed });
  });
  app.get('/api/ledger', async (c: HonoContext) => ok(c, (await InventoryLedgerEntity.list(c.env, null, 200)).items || []));
  app.post('/api/ledger', async (c: HonoContext) => {
    const body = await c.req.json<Partial<InventoryLedgerEntry>>();
    const entry: InventoryLedgerEntry = {
      id: crypto.randomUUID(),
      supplier_id: body.supplier_id || "",
      material_type: body.material_type || "",
      weight_kg: body.weight_kg || 0,
      capture_timestamp: Date.now(),
      is_synced: true,
      created_at: Date.now(),
      ...body
    };
    return ok(c, await InventoryLedgerEntity.create(c.env, entry));
  });
  app.get('/api/transactions', async (c: HonoContext) => ok(c, (await TransactionEntity.list(c.env, null, 200)).items || []));
  app.post('/api/transactions', async (c: HonoContext) => {
    const body = await c.req.json<Partial<Transaction>>();
    const t: Transaction = {
      id: crypto.randomUUID(),
      ledger_entry_id: body.ledger_entry_id || "",
      amount: body.amount || 0,
      currency: "ZAR",
      transaction_timestamp: Date.now(),
      epr_fee: body.epr_fee || 0,
      is_synced: true,
      created_at: Date.now(),
      ...body
    };
    return ok(c, await TransactionEntity.create(c.env, t));
  });
  app.post('/api/sync/ledger', async (c: HonoContext) => {
    const { pendingEntries } = await c.req.json<{ pendingEntries: InventoryLedgerEntry[] }>();
    if (pendingEntries) {
      for (const e of pendingEntries) await InventoryLedgerEntity.create(c.env, { ...e, is_synced: true });
    }
    return ok(c, { syncedIds: (pendingEntries || []).map(e => e.id) });
  });
  app.post('/api/sync/transactions', async (c: HonoContext) => {
    const { pendingTransactions } = await c.req.json<{ pendingTransactions: Transaction[] }>();
    if (pendingTransactions) {
      for (const t of pendingTransactions) await TransactionEntity.create(c.env, { ...t, is_synced: true });
    }
    return ok(c, { syncedIds: (pendingTransactions || []).map(t => t.id) });
  });
  app.get('/api/camera/snapshot', async (c: HonoContext) => ok(c, { imageUrl: `https://images.unsplash.com/photo-1581092919546-23c1c35a828d?q=80&w=800&auto=format&fit=crop&ixid=${Math.random()}` }));
}