const router = require('express').Router();
const controller = require('../controllers/adminController');
const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { validate, validateId } = require('../middleware/validate');
const schema = require('../utils/validators');

router.param('id', validateId);
router.use(protect, authorizeRoles('admin'));
router.get('/stats', controller.getStats);
router.get('/users', validate(schema.userQuery, 'query'), controller.listUsers);
router.get('/users/:id', controller.getUser);
router.patch('/users/:id/status', validate(schema.userStatus), controller.updateUserStatus);
router.delete('/users/:id', controller.deleteUser);
router.get('/jobs', validate(schema.ownJobQuery, 'query'), controller.listJobs);
router.get('/jobs/:id', controller.getJob);
router.delete('/jobs/:id', controller.deleteJob);

module.exports = router;
