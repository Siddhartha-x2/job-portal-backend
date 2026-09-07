const Job = require('../models/Job');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/pagination');

const employerPreview = { path: 'employer', select: 'name' };
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function availableFilter() {
  const employers = await User.find({ role: 'employer', status: 'active', deletedAt: null }).distinct('_id');
  return { status: 'active', deletedAt: null, applicationDeadline: { $gt: new Date() }, employer: { $in: employers } };
}

async function listJobs(req, res) {
  const filter = await availableFilter();
  const { search, location, employmentType } = req.filters;
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: regex }, { companyName: regex }, { requiredSkills: regex }];
  }
  if (location) filter.location = new RegExp(escapeRegex(location), 'i');
  if (employmentType) filter.employmentType = employmentType;
  res.json({ success: true, message: 'Jobs retrieved', ...await paginate(Job, filter, req.filters, employerPreview) });
}

async function getJob(req, res) {
  const job = await Job.findOne({ ...await availableFilter(), _id: req.params.jobId }).populate(employerPreview);
  if (!job) throw new ApiError(404, 'Available job not found');
  res.json({ success: true, message: 'Job retrieved', data: job });
}

async function createJob(req, res) {
  const job = await Job.create({ ...req.body, employer: req.user._id });
  res.status(201).json({ success: true, message: 'Job created', data: job });
}

async function listOwnJobs(req, res) {
  const filter = { employer: req.user._id, deletedAt: null };
  if (req.filters.status) filter.status = req.filters.status;
  res.json({ success: true, message: 'Jobs retrieved', ...await paginate(Job, filter, req.filters) });
}

async function findOwnJob(userId, jobId) {
  const job = await Job.findOne({ _id: jobId, deletedAt: null });
  if (!job) throw new ApiError(404, 'Job not found');
  if (job.employer.toString() !== userId.toString()) throw new ApiError(403, 'You do not own this job');
  return job;
}

async function getOwnJob(req, res) {
  res.json({ success: true, message: 'Job retrieved', data: await findOwnJob(req.user._id, req.params.jobId) });
}

async function updateJob(req, res) {
  const job = await findOwnJob(req.user._id, req.params.jobId);
  Object.assign(job, req.body);
  if (req.body.status === 'active' && job.applicationDeadline <= new Date()) {
    throw new ApiError(400, 'Set a future application deadline before reopening this job');
  }
  await job.save();
  res.json({ success: true, message: 'Job updated', data: job });
}

async function deleteJob(req, res) {
  const job = await findOwnJob(req.user._id, req.params.jobId);
  job.deletedAt = new Date();
  job.status = 'closed';
  await job.save();
  res.status(204).send();
}

module.exports = { listJobs, getJob, createJob, listOwnJobs, getOwnJob, updateJob, deleteJob, findOwnJob };
