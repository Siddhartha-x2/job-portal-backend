const router = require('express').Router();
const jobs = require('../controllers/jobController');
const applications = require('../controllers/applicationController');
const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { validate, validateId } = require('../middleware/validate');
const schema = require('../utils/validators');

router.param('jobId', validateId);
router.get('/', validate(schema.jobQuery, 'query'), jobs.listJobs);
// Specific paths must appear before the generic /:jobId route.
router.get('/employer/my-jobs', protect, authorizeRoles('employer'), validate(schema.ownJobQuery, 'query'), jobs.listOwnJobs);
router.get('/employer/my-jobs/:jobId', protect, authorizeRoles('employer'), jobs.getOwnJob);
router.post('/', protect, authorizeRoles('employer'), validate(schema.createJob), jobs.createJob);
router.get('/:jobId', jobs.getJob);
router.patch('/:jobId', protect, authorizeRoles('employer'), validate(schema.updateJob), jobs.updateJob);
router.delete('/:jobId', protect, authorizeRoles('employer'), jobs.deleteJob);
router.post('/:jobId/apply', protect, authorizeRoles('jobseeker'), validate(schema.apply), applications.applyForJob);
router.get('/:jobId/applications', protect, authorizeRoles('employer'), validate(schema.pagination, 'query'), applications.listJobApplications);

module.exports = router;
