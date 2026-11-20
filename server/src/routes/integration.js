import { Router } from 'express';
import { pool } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/activity', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [events, summary] = await Promise.all([
      pool.query(
        `SELECT id, received_at, source, event_type, success, external_id,
                http_status, duration_ms, error_message
         FROM integration_events
         ORDER BY received_at DESC
         LIMIT 100`
      ),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '24 hours')::integer AS requests_24h,
                COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '24 hours' AND success)::integer AS successful_24h,
                COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '24 hours' AND NOT success)::integer AS failed_24h,
                COALESCE(AVG(duration_ms) FILTER (WHERE received_at >= NOW() - INTERVAL '24 hours'), 0)::integer AS avg_duration_ms,
                MAX(received_at) AS last_received_at
         FROM integration_events`
      )
    ]);
    res.json({ summary: summary.rows[0], events: events.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
