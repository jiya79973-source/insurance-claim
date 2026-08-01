const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { hashPassword, comparePassword } = require('../lib/password');
const { signToken } = require('../lib/jwt');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'AGENT', 'CUSTOMER']).optional(),
  dob: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, role, dob, phone, address } = req.body;
    const userRole = role || 'CUSTOMER';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: userRole,
        ...(userRole === 'CUSTOMER' && {
          customer: {
            create: {
              name,
              email,
              dob: dob ? new Date(dob) : new Date('1990-01-01'),
              phone: phone || '',
              address: address || '',
            },
          },
        }),
      },
      include: { customer: true },
    });

    const token = signToken({ userId: user.id, role: user.role });
    const { password: _, ...safeUser } = user;

    res.status(201).json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { customer: true },
    });

    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken({ userId: user.id, role: user.role });
    const { password: _, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
