const express = require('express');
const PDFDocument = require('pdfkit');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'AGENT'));

router.get('/dashboard', async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalCustomers,
      activePolicies,
      expiredPolicies,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      totalPremiumCollected,
      monthlyPremium,
      newCustomersThisMonth,
      policiesByType,
      claimsByStatus,
      monthlyCustomers,
      monthlyPremiums,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.policy.count({ where: { status: 'ACTIVE' } }),
      prisma.policy.count({ where: { status: 'EXPIRED' } }),
      prisma.claim.count({ where: { status: 'PENDING' } }),
      prisma.claim.count({ where: { status: 'APPROVED' } }),
      prisma.claim.count({ where: { status: 'REJECTED' } }),
      prisma.premiumPayment.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.premiumPayment.aggregate({
        where: { paymentStatus: 'PAID', paymentDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.policy.groupBy({
        by: ['policyType'],
        _count: { id: true },
      }),
      prisma.claim.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      getMonthlyCounts(prisma.customer, 'createdAt', startOfYear),
      getMonthlyPremiumTotals(startOfYear),
    ]);

    res.json({
      summary: {
        totalCustomers,
        activePolicies,
        expiredPolicies,
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        totalPremiumCollected: totalPremiumCollected._sum.amount || 0,
        monthlyPremium: monthlyPremium._sum.amount || 0,
        newCustomersThisMonth,
      },
      policiesByType: policiesByType.map((p) => ({
        type: p.policyType,
        count: p._count.id,
      })),
      claimsByStatus: claimsByStatus.map((c) => ({
        status: c.status,
        count: c._count.id,
      })),
      monthlyCustomers,
      monthlyPremiums,
    });
  } catch (err) {
    next(err);
  }
});

async function getMonthlyCounts(model, field, startDate) {
  const months = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 0, 23, 59, 59);

    if (monthStart < startDate) continue;

    const count = await model.count({
      where: { [field]: { gte: monthStart, lte: monthEnd } },
    });

    months.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      count,
    });
  }

  return months;
}

async function getMonthlyPremiumTotals(startDate) {
  const months = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 0, 23, 59, 59);

    if (monthStart < startDate) continue;

    const result = await prisma.premiumPayment.aggregate({
      where: {
        paymentStatus: 'PAID',
        paymentDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    months.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      amount: result._sum.amount || 0,
    });
  }

  return months;
}

router.get('/pdf', async (_req, res, next) => {
  try {
    const [customers, policies, claims, payments] = await Promise.all([
      prisma.customer.count(),
      prisma.policy.count({ where: { status: 'ACTIVE' } }),
      prisma.claim.count(),
      prisma.premiumPayment.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=insurance-report.pdf');

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(22).text('Insurance Management Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(2);

    doc.fontSize(16).text('Business Summary');
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total Customers: ${customers}`);
    doc.text(`Active Policies: ${policies}`);
    doc.text(`Total Claims: ${claims}`);
    doc.text(`Premium Collected: $${(payments._sum.amount || 0).toFixed(2)}`);

    doc.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
