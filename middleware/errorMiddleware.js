const ApiError = require('../utils/ApiError');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof ApiError) return res.status(err.status).json({ success: false, message: err.message });
  if (err.code === 11000) {
    const message = err.keyPattern?.email ? 'This email is already registered' : 'You have already applied for this job';
    return res.status(409).json({ success: false, message });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid data supplied' });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'Request body is too large' });
  console.error('Request failed:', err.name);
  res.status(500).json({ success: false, message: 'Something went wrong' });
}

module.exports = errorHandler;
