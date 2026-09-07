const ApiError = require('../utils/ApiError');

function protectWrites(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== req.app.locals.config.origin)) {
      throw new ApiError(403, 'Cross-origin writes are not allowed');
    }
    const hasBody = Number(req.get('content-length')) > 0 || req.get('transfer-encoding');
    if (hasBody && !req.is('application/json')) throw new ApiError(415, 'Send the request body as application/json');
  }
  next();
}

module.exports = protectWrites;
