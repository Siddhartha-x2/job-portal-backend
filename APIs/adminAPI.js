const router = require('express').Router();
const User = require('../models/userModel');
const Job = require('../models/jobModel');
const { verifyToken, login, logout } = require('../middlewares/verifyToken');
const allowedRoles = require('../middlewares/allowedRoles');

router.post('/admin/login', login('admin'));
router.use(verifyToken, allowedRoles('admin'));

router.get('/users', async (req, res) => {
  res.json({ success: true, data: await User.find({ deletedAt: null }) });
});

router.get('/users/:userId', async (req, res) => {
  const user = await User.findOne({ _id: req.params.userId, deletedAt: null });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user });
});

router.put('/users/:userId/status', async (req, res) => {
  if (!req.body.status || Object.keys(req.body).some(key => key !== 'status')) {
    return res.status(400).json({ success: false, message: 'Provide only status' });
  }
  const user = await User.findOne({ _id: req.params.userId, deletedAt: null }).select('+tokenVersion');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Admin accounts cannot be suspended' });
  user.status = req.body.status;
  user.tokenVersion += 1;
  await user.save();
  res.json({ success: true, message: 'User status updated', data: user });
});

router.delete('/users/:userId', async (req, res) => {
  const user = await User.findOne({ _id: req.params.userId, deletedAt: null });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Admin accounts cannot be removed' });
  await User.updateOne({ _id: user.id }, {
    $set: { deletedAt: new Date(), status: 'suspended' }, $inc: { tokenVersion: 1 }
  });
  res.json({ success: true, message: 'User removed' });
});

router.get('/jobs', async (req, res) => {
  const jobs = await Job.find({ deletedAt: null }).populate('employerId', 'name email');
  res.json({ success: true, data: jobs });
});

router.get('/jobs/:jobId', async (req, res) => {
  const job = await Job.findOne({ _id: req.params.jobId, deletedAt: null }).populate('employerId', 'name email');
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  res.json({ success: true, data: job });
});

router.delete('/jobs/:jobId', async (req, res) => {
  const job = await Job.findOneAndUpdate({ _id: req.params.jobId, deletedAt: null },
    { $set: { deletedAt: new Date(), jobStatus: 'closed' } });
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  res.json({ success: true, message: 'Job removed' });
});

router.post('/logout', logout);

module.exports = router;
