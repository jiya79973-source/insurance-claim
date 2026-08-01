const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');

const router = express.Router();

const customerSchema = z.object({
  name: z.string().min(2),
  dob: z.string(),
  phone: z.string().min(5),
  address: z.string().min(3),
  email: z.string().email(),
});

const querySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

router.use(authenticate);

router.get('/', authorize('ADMIN', 'AGENT'), validateQuery(querySchema), async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { policies: true, documents: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      data: customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authorize('ADMIN', 'AGENT', 'CUSTOMER'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (req.user.role === 'CUSTOMER' && req.user.customer?.id !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        policies: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('ADMIN', 'AGENT'), validate(customerSchema), async (req, res, next) => {
  try {
    const { name, dob, phone, address, email } = req.body;

    const customer = await prisma.customer.create({
      data: { name, dob: new Date(dob), phone, address, email },
    });

    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorize('ADMIN', 'AGENT', 'CUSTOMER'), validate(customerSchema.partial()), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (req.user.role === 'CUSTOMER' && req.user.customer?.id !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const data = { ...req.body };
    if (data.dob) data.dob = new Date(data.dob);

    const customer = await prisma.customer.update({ where: { id }, data });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
