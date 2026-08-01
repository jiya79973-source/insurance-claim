const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');

const router = express.Router();

const claimSchema = z.object({
  policyId: z.number().int().positive(),
  claimAmount: z.number().positive(),
  reason: z.string().min(10),
});

const reviewSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  reviewNotes: z.string().optional(),
});

const querySchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

router.use(authenticate);

router.get('/', validateQuery(querySchema), async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    if (req.user.role === 'CUSTOMER') {
      where.policy = { customerId: req.user.customer?.id };
    }

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submissionDate: 'desc' },
        include: {
          policy: {
            include: { customer: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
      prisma.claim.count({ where }),
    ]);

    res.json({
      data: claims,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        policy: { include: { customer: true } },
      },
    });

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    if (req.user.role === 'CUSTOMER' && claim.policy.customerId !== req.user.customer?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(claim);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('CUSTOMER', 'ADMIN', 'AGENT'), validate(claimSchema), async (req, res, next) => {
  try {
    const { policyId, claimAmount, reason } = req.body;

    const policy = await prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    if (req.user.role === 'CUSTOMER' && policy.customerId !== req.user.customer?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (policy.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Policy must be active to submit a claim' });
    }

    const claim = await prisma.claim.create({
      data: { policyId, claimAmount, reason, status: 'PENDING' },
      include: { policy: { include: { customer: true } } },
    });

    res.status(201).json(claim);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/review', authorize('ADMIN', 'AGENT'), validate(reviewSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, reviewNotes } = req.body;

    const claim = await prisma.claim.update({
      where: { id },
      data: {
        status,
        reviewNotes,
        reviewedAt: new Date(),
      },
      include: { policy: { include: { customer: true } } },
    });

    res.json(claim);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
