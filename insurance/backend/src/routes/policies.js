const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');

const router = express.Router();

const policySchema = z.object({
  customerId: z.number().int().positive(),
  policyType: z.string().min(2),
  premiumAmount: z.number().positive(),
  startDate: z.string(),
  endDate: z.string(),
});

const querySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED', 'RENEWED']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

function generatePolicyNumber() {
  return `POL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

router.use(authenticate);

router.get('/', validateQuery(querySchema), async (req, res, next) => {
  try {
    const { search, status, page, limit } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.customer?.id;
    }

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { policyNumber: { contains: search, mode: 'insensitive' } },
        { policyType: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          _count: { select: { claims: true, payments: true } },
        },
      }),
      prisma.policy.count({ where }),
    ]);

    res.json({
      data: policies,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/expiring', authorize('ADMIN', 'AGENT'), async (req, res, next) => {
  try {
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const policies = await prisma.policy.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: thirtyDays, gte: new Date() },
      },
      include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { endDate: 'asc' },
    });

    res.json(policies);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        customer: true,
        claims: { orderBy: { submissionDate: 'desc' } },
        payments: { orderBy: { dueDate: 'desc' } },
      },
    });

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    if (req.user.role === 'CUSTOMER' && policy.customerId !== req.user.customer?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(policy);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('ADMIN', 'AGENT'), validate(policySchema), async (req, res, next) => {
  try {
    const { customerId, policyType, premiumAmount, startDate, endDate } = req.body;

    const policy = await prisma.policy.create({
      data: {
        customerId,
        policyType,
        policyNumber: generatePolicyNumber(),
        premiumAmount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'ACTIVE',
      },
      include: { customer: { select: { id: true, name: true, email: true } } },
    });

    // Create first premium payment due
    await prisma.premiumPayment.create({
      data: {
        policyId: policy.id,
        amount: premiumAmount,
        dueDate: new Date(startDate),
        paymentStatus: 'PENDING',
      },
    });

    res.status(201).json(policy);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/renew', authorize('ADMIN', 'AGENT'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const policy = await prisma.policy.findUnique({ where: { id } });

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    const newEndDate = new Date(policy.endDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);

    const renewed = await prisma.policy.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        endDate: newEndDate,
        startDate: policy.endDate,
      },
    });

    await prisma.premiumPayment.create({
      data: {
        policyId: id,
        amount: policy.premiumAmount,
        dueDate: new Date(policy.endDate),
        paymentStatus: 'PENDING',
      },
    });

    res.json(renewed);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/cancel', authorize('ADMIN', 'AGENT'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    const policy = await prisma.policy.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(policy);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
