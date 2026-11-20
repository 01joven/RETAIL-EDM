import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.get('/', authenticate, authorize('admin'), (req, res) => {
  res.json({
    apiVersion: 'v1',
    posIntegration: 'api-key',
    cardholderDataStorage: false,
    realtimeIngestion: 'rest-api',
    auditRetention: 'up to 200 recent events',
    voidAndRefundEnabled: true,
    roles: ['admin', 'cashier']
  });
});

export default router;
