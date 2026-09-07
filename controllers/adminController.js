const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/pagination');

async function listUsers(req, res) {
  const filter = { deletedAt: null };
  if (req.filters.role) filter.role = req.filters.role;
  if (req.filters.status) filter.status = req.filters.status;
  res.json({ success: true, message: 'Records retrieved', ...await paginate(User, filter, req.filters) });
}

async function findUser(id) {
  const user = await User.findOne({ _id: id, deletedAt: null });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

async function getUser(req, res) {
  res.json({ success: true, message: 'Request successful', data: await findUser(req.params.id) });
}

async function updateUserStatus(req, res) {
  const user = await findUser(req.params.id);
  if (user.role === 'admin') throw new ApiError(403, 'Admin accounts cannot be changed through this endpoint');
  const updated = await User.findByIdAndUpdate(user._id, {
    $set: { status: req.body.status }, $inc: { tokenVersion: 1 }
  }, { returnDocument: 'after', runValidators: true });
  res.json({ success: true, message: 'Request successful', data: updated });
}

async function deleteUser(req, res) {
  const user = await findUser(req.params.id);
  if (user.role === 'admin') throw new ApiError(403, 'Admin accounts cannot be deleted through this endpoint');
  await User.updateOne({ _id: user._id }, {
    $set: { deletedAt: new Date(), status: 'suspended' }, $inc: { tokenVersion: 1 }
  });
  res.status(204).send();
}

async function listJobs(req, res) {
  const filter = { deletedAt: null };
  if (req.filters.status) filter.status = req.filters.status;
  res.json({ success: true, message: 'Records retrieved', ...await paginate(Job, filter, req.filters, { path: 'employer', select: 'name email status deletedAt' }) });
}

async function getJob(req, res) {
  const job = await Job.findOne({ _id: req.params.id, deletedAt: null }).populate('employer', 'name email status deletedAt');
  if (!job) throw new ApiError(404, 'Job not found');
  res.json({ success: true, message: 'Request successful', data: job });
}

async function deleteJob(req, res) {
  const job = await Job.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, {
    $set: { deletedAt: new Date(), status: 'closed' }
  }, { returnDocument: 'after', runValidators: true });
  if (!job) throw new ApiError(404, 'Job not found');
  res.status(204).send();
}

async function getStats(req, res) {
  const [users, jobs, applications, usersByRole] = await Promise.all([
    User.countDocuments({ deletedAt: null }), Job.countDocuments({ deletedAt: null }), Application.countDocuments(),
    User.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$role', count: { $sum: 1 } } }])
  ]);
  res.json({ success: true, message: 'Request successful', data: { users, jobSeekers: usersByRole.find(row => row._id === 'jobseeker')?.count || 0, employers: usersByRole.find(row => row._id === 'employer')?.count || 0, jobs, applications } });
}

module.exports = { listUsers, getUser, updateUserStatus, deleteUser, listJobs, getJob, deleteJob, getStats };
