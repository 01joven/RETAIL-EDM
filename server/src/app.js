import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';
import { errorHandler, notFound } from './middleware/errors.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
  next();
});
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
