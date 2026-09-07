const router = require('express').Router();
const controller = require('../controllers/userController');
const protect = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const schema = require('../utils/validators');

router.use(protect);
router.get('/me', controller.getProfile);
router.patch('/me', validate(schema.updateProfile), controller.updateProfile);

module.exports = router;
