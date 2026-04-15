import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import productRoutes from './routes/product.routes';
import customerRoutes from './routes/customer.routes';
import invoiceRoutes from './routes/invoice.routes';
import vdsRoutes from './routes/vds.routes';
import registerRoutes from './routes/register.routes';
import returnRoutes from './routes/return.routes';
import auditLogRoutes from './routes/auditLog.routes';
import importExportRoutes from './routes/importExport.routes';
import backupRoutes from './routes/backup.routes';
import reportsRoutes from './routes/reports.routes';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/vds', vdsRoutes);
app.use('/api/v1/registers', registerRoutes);
app.use('/api/v1/returns', returnRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1', importExportRoutes);
app.use('/api/v1/backup', backupRoutes);
app.use('/api/v1/reports', reportsRoutes);

export default app;
