const router = require('express').Router();
const User = require('../models/userModel');
const Job = require('../models/jobModel');
const Application = require('../models/applicationModel');
const { verifyToken, login, logout } = require('../middlewares/verifyToken');
const allowedRoles = require('../middlewares/allowedRoles');

// employerId comes from the logged-in user, not the request body.
const jobFields = ['title', 'company', 'description', 'location', 'employmentType',
  'salaryRange', 'requiredSkills', 'experienceRequirement', 'applicationDeadline', 'jobStatus'];

router.post('/users', async (req, res) => {
  const { name, email, password } = req.body;
  if (typeof password !== 'string') return res.status(400).json({ success: false, message: 'Password is required' });
  const user = await User.create({ name, email, password, role: 'employer' });
  res.status(201).json({ success: true, message: 'Account created', data: user });
});

router.post('/users/login', login('employer'));
router.use(verifyToken, allowedRoles('employer'));

router.post('/jobs', async (req, res) => {
  if (Object.keys(req.body).some(key => !jobFields.includes(key))) {
    return res.status(400).json({ success: false, message: 'Unknown job field' });
  }
  const job = await Job.create({ ...req.body, employerId: req.user.id });
  res.status(201).json({ success: true, message: 'Job created', data: job });
});

router.get('/jobs', async (req, res) => {
  const jobs = await Job.find({ employerId: req.user.id, deletedAt: null }).sort({ postedDate: -1 });
  res.json({ success: true, data: jobs });
});

// The same ownership check protects reading, editing and deleting a job.
router.use('/jobs/:jobId', async (req, res, next) => {
  const job = await Job.findOne({ _id: req.params.jobId, deletedAt: null });
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  if (job.employerId.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You do not own this job' });
  }
  req.job = job;
  next();
});

router.get('/jobs/:jobId', (req, res) => {
  res.json({ success: true, data: req.job });
});

router.put('/jobs/:jobId', async (req, res) => {
  if (!Object.keys(req.body).length || Object.keys(req.body).some(key => !jobFields.includes(key))) {
    return res.status(400).json({ success: false, message: 'Provide valid job fields; employerId cannot be changed' });
  }
  for (const key of Object.keys(req.body)) req.job[key] = req.body[key];
  await req.job.save();
  res.json({ success: true, message: 'Job updated', data: req.job });
});

router.delete('/jobs/:jobId', async (req, res) => {
  req.job.deletedAt = new Date();
  req.job.jobStatus = 'closed';
  await req.job.save();
  res.json({ success: true, message: 'Job removed' });
});

router.get('/applications', async (req, res) => {
  const jobs = await Job.find({ employerId: req.user.id, deletedAt: null }).distinct('_id');
  const applications = await Application.find({ jobId: { $in: jobs } })
    .populate('applicantId', 'name email skills education experience')
    .populate('jobId', 'title company').sort({ createdAt: -1 });
  res.json({ success: true, data: applications });
});

router.put('/applications/:applicationId', async (req, res) => {
  if (!req.body.applicationStatus || Object.keys(req.body).some(key => key !== 'applicationStatus')) {
    return res.status(400).json({ success: false, message: 'Provide only applicationStatus' });
  }
  const application = await Application.findById(req.params.applicationId);
  if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
  const job = await Job.findOne({ _id: application.jobId, deletedAt: null });
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  if (job.employerId.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You do not own this application\'s job' });
  }
  application.applicationStatus = req.body.applicationStatus;
  await application.save();
  res.json({ success: true, message: 'Application updated', data: application });
});

router.post('/logout', logout);

module.exports = router;
