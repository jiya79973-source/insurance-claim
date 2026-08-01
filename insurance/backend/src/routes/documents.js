const express = require('express');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.get('/customer/:customerId', async (req, res, next) => {
  try {
    const customerId = parseInt(req.params.customerId, 10);

    if (req.user.role === 'CUSTOMER' && req.user.customer?.id !== customerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const documents = await prisma.document.findMany({
      where: { customerId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(documents);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/upload',
  authorize('CUSTOMER', 'ADMIN', 'AGENT'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const customerId = parseInt(req.body.customerId, 10);
      const docType = req.body.docType || 'OTHER';

      if (req.user.role === 'CUSTOMER' && req.user.customer?.id !== customerId) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Access denied' });
      }

      const document = await prisma.document.create({
        data: {
          customerId,
          fileName: req.file.originalname,
          filePath: req.file.filename,
          docType,
        },
      });

      res.status(201).json(document);
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      next(err);
    }
  }
);

router.get('/:id/download', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    const document = await prisma.document.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (req.user.role === 'CUSTOMER' && document.customerId !== req.user.customer?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, document.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(filePath, document.fileName);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('ADMIN', 'AGENT'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, document.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.document.delete({ where: { id } });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
