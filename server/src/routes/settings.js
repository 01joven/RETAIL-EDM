import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.get('/', authenticate, authorize('admin'), (req, res) => {
  res.json({
    apiVersion: 'v1',
    posIntegration: 'api-key',
    cardholderDataStorage: false,
    roles: ['admin', 'cashier']
  });
});

export default router;
