const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/pagination');
const { findOwnJob } = require('./jobController');

const jobPreview = { path: 'job', select: 'title companyName location employmentType status applicationDeadline deletedAt' };

async function applyForJob(req, res) {
  const job = await Job.findOne({ _id: req.params.jobId, deletedAt: null });
  if (!job) throw new ApiError(404, 'Job not found');
  if (job.status !== 'active' || job.applicationDeadline <= new Date()) {
    throw new ApiError(400, 'This job is no longer accepting applications');
  }
  const employer = await User.exists({ _id: job.employer, status: 'active', deletedAt: null });
  if (!employer) throw new ApiError(400, 'This job is no longer accepting applications');
  const { name, email, skills } = req.user;
  const application = await Application.create({
    job: job._id, applicant: req.user._id, coverLetter: req.body.coverLetter,
    applicantSnapshot: { name, email, skills }
  });
  res.status(201).json({ success: true, message: 'Application submitted', data: application });
}

async function listMyApplications(req, res) {
  res.json({ success: true, message: 'Applications retrieved', ...await paginate(Application, { applicant: req.user._id }, req.filters, jobPreview) });
}

async function getMyApplication(req, res) {
  const application = await Application.findOne({ _id: req.params.applicationId, applicant: req.user._id }).populate(jobPreview);
  if (!application) throw new ApiError(404, 'Application not found');
  res.json({ success: true, message: 'Application retrieved', data: application });
}

async function listJobApplications(req, res) {
  await findOwnJob(req.user._id, req.params.jobId);
  const applicantPreview = { path: 'applicant', select: 'name email skills education experience status deletedAt' };
  res.json({ success: true, message: 'Applications retrieved', ...await paginate(Application, { job: req.params.jobId }, req.filters, applicantPreview) });
}

async function updateApplicationStatus(req, res) {
  const application = await Application.findById(req.params.applicationId);
  if (!application) throw new ApiError(404, 'Application not found');
  await findOwnJob(req.user._id, application.job);
  application.status = req.body.status;
  await application.save();
  res.json({ success: true, message: 'Application status updated', data: application });
}

module.exports = { applyForJob, listMyApplications, getMyApplication, listJobApplications, updateApplicationStatus };
