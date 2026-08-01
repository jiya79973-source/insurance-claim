const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');

const router = express.Router();

const paymentSchema = z.object({
  policyId: z.number().int().positive(),
  amount: z.number().positive(),
  dueDate: z.string(),
});

const paySchema = z.object({
  paymentStatus: z.enum(['PAID', 'FAILED']).optional().default('PAID'),
});

const querySchema = z.object({
  status: z.enum(['PAID', 'PENDING', 'OVERDUE', 'FAILED']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

router.use(authenticate);

router.get('/', validateQuery(querySchema), async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.paymentStatus = status;

    if (req.user.role === 'CUSTOMER') {
      where.policy = { customerId: req.user.customer?.id };
    }

    const [payments, total] = await Promise.all([
      prisma.premiumPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'desc' },
        include: {
          policy: {
            include: { customer: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
      prisma.premiumPayment.count({ where }),
    ]);

    res.json({
      data: payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/overdue', authorize('ADMIN', 'AGENT'), async (_req, res, next) => {
  try {
    const payments = await prisma.premiumPayment.findMany({
      where: {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lt: new Date() },
      },
      include: {
        policy: { include: { customer: { select: { id: true, name: true, email: true, phone: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(payments);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('ADMIN', 'AGENT'), validate(paymentSchema), async (req, res, next) => {
  try {
    const { policyId, amount, dueDate } = req.body;

    const payment = await prisma.premiumPayment.create({
      data: {
        policyId,
        amount,
        dueDate: new Date(dueDate),
        paymentStatus: 'PENDING',
      },
      include: { policy: true },
    });

    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/pay', validate(paySchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { paymentStatus } = req.body;

    const existing = await prisma.premiumPayment.findUnique({
      where: { id },
      include: { policy: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (req.user.role === 'CUSTOMER' && existing.policy.customerId !== req.user.customer?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payment = await prisma.premiumPayment.update({
      where: { id },
      data: {
        paymentStatus,
        paymentDate: paymentStatus === 'PAID' ? new Date() : null,
      },
      include: { policy: { include: { customer: true } } },
    });

    res.json(payment);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
