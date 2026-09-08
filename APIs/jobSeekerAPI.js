const router = require('express').Router();
const User = require('../models/userModel');
const Job = require('../models/jobModel');
const Application = require('../models/applicationModel');
const { verifyToken, login, logout } = require('../middlewares/verifyToken');
const allowedRoles = require('../middlewares/allowedRoles');

router.post('/users', async (req, res) => {
  const { name, email, password, skills, education, experience } = req.body;
  if (typeof password !== 'string') return res.status(400).json({ success: false, message: 'Password is required' });
  const user = await User.create({ name, email, password, skills, education, experience, role: 'jobseeker' });
  res.status(201).json({ success: true, message: 'Account created', data: user });
});

router.post('/users/login', login('jobseeker'));

// Only show available jobs belonging to active employers.
async function availableJobs() {
  const employers = await User.find({ role: 'employer', status: 'active', deletedAt: null }).distinct('_id');
  return { jobStatus: 'active', deletedAt: null, applicationDeadline: { $gt: new Date() }, employerId: { $in: employers } };
}

router.get('/jobs', async (req, res) => {
  const jobs = await Job.find(await availableJobs()).populate('employerId', 'name').sort({ postedDate: -1 });
  res.json({ success: true, data: jobs });
});

router.get('/jobs/:jobId', async (req, res) => {
  const job = await Job.findOne({ ...await availableJobs(), _id: req.params.jobId }).populate('employerId', 'name');
  if (!job) return res.status(404).json({ success: false, message: 'Available job not found' });
  res.json({ success: true, data: job });
});

router.use(verifyToken, allowedRoles('jobseeker'));

router.get('/users', (req, res) => {
  res.json({ success: true, data: req.profile });
});

router.put('/users', async (req, res) => {
  const fields = ['name', 'skills', 'education', 'experience'];
  if (!Object.keys(req.body).length || Object.keys(req.body).some(key => !fields.includes(key))) {
    return res.status(400).json({ success: false, message: 'Only name, skills, education and experience can be updated' });
  }
  for (const key of Object.keys(req.body)) req.profile[key] = req.body[key];
  await req.profile.save();
  res.json({ success: true, message: 'Profile updated', data: req.profile });
});

router.post('/jobs/:jobId/apply', async (req, res) => {
  if (Object.keys(req.body).some(key => key !== 'coverLetter')) {
    return res.status(400).json({ success: false, message: 'Only coverLetter is allowed' });
  }
  const job = await Job.findOne({ _id: req.params.jobId, deletedAt: null });
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  const employer = await User.exists({ _id: job.employerId, status: 'active', deletedAt: null });
  if (!employer || job.jobStatus !== 'active' || job.applicationDeadline <= new Date()) {
    return res.status(400).json({ success: false, message: 'This job is no longer accepting applications' });
  }
  const application = await Application.create({
    applicantId: req.user.id, jobId: job.id, coverLetter: req.body.coverLetter
  });
  res.status(201).json({ success: true, message: 'Application submitted', data: application });
});

router.get('/applications', async (req, res) => {
  const applications = await Application.find({ applicantId: req.user.id })
    .populate('jobId', 'title company location jobStatus deletedAt').sort({ createdAt: -1 });
  res.json({ success: true, data: applications });
});

router.post('/logout', logout);

module.exports = router;
