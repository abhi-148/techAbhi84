import { pool } from '../db.js';
// Audit trail for admin actions. Failure to log never blocks the action itself.
export async function logActivity(adminId, action, entity, entityId = null, detail = null) {
  try { await pool.query('INSERT INTO admin_activity (admin_id, action, entity, entity_id, detail, created_at) VALUES (?,?,?,?,?, UTC_TIMESTAMP())', [adminId ?? null, action, entity, entityId, detail ? String(detail).slice(0, 300) : null]); }
  catch (e) { console.error('activity log failed:', e?.code || e?.name); }
}
