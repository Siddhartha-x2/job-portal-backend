const ApiError = require('../utils/ApiError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }))
      });
    }
    if (source === 'query') req.filters = result.data;
    else req.body = result.data;
    next();
  };
}

function validateId(req, res, next, value) {
  if (!/^[a-fA-F0-9]{24}$/.test(value)) return next(new ApiError(400, 'Invalid resource ID'));
  next();
}

module.exports = { validate, validateId };
