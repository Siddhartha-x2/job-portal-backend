const router = require('express').Router();
const controller = require('../controllers/applicationController');
const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { validate, validateId } = require('../middleware/validate');
const schema = require('../utils/validators');

router.param('applicationId', validateId);
router.use(protect);
router.get('/me', authorizeRoles('jobseeker'), validate(schema.pagination, 'query'), controller.listMyApplications);
router.get('/me/:applicationId', authorizeRoles('jobseeker'), controller.getMyApplication);
router.patch('/:applicationId/status', authorizeRoles('employer'), validate(schema.applicationStatus), controller.updateApplicationStatus);

module.exports = router;
