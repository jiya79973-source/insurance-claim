require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const prisma = require('./lib/prisma');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const policyRoutes = require('./routes/policies');
const claimRoutes = require('./routes/claims');
const paymentRoutes = require('./routes/payments');
const documentRoutes = require('./routes/documents');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir)));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

async function updateOverduePayments() {
  await prisma.premiumPayment.updateMany({
    where: {
      paymentStatus: 'PENDING',
      dueDate: { lt: new Date() },
    },
    data: { paymentStatus: 'OVERDUE' },
  });
}

async function updateExpiredPolicies() {
  await prisma.policy.updateMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });
}

app.listen(PORT, async () => {
  try {
    await updateOverduePayments();
    await updateExpiredPolicies();
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (err) {
    console.error('Startup error:', err.message);
  }
});

module.exports = app;
