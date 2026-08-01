function errorHandler(err, _req, res, _next) {
  console.error(err);

  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.message?.includes('Invalid file type')) {
    return res.status(400).json({ message: err.message });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'Record already exists' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
