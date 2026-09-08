function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.code === 11000) {
    const message = error.keyPattern?.email ? 'Email already registered' : 'Already applied for this job';
    return res.status(409).json({ success: false, message });
  }
  if (['ValidationError', 'CastError', 'StrictModeError'].includes(error.name) || error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid input. Check the fields and IDs.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large' });
  }
  console.error('Request failed:', error.name);
  res.status(500).json({ success: false, message: 'Server error' });
}

module.exports = handleError;
