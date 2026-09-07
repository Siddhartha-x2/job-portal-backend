const mongoose = require('mongoose');

// Keep what was submitted, even if the seeker edits their profile later.
const snapshotSchema = new mongoose.Schema({
  name: String,
  email: String,
  skills: [String]
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'reviewing', 'accepted', 'rejected'], default: 'pending' },
  coverLetter: { type: String, default: '', maxlength: 5000 },
  appliedAt: { type: Date, default: Date.now },
  applicantSnapshot: { type: snapshotSchema, required: true }
}, { timestamps: true });

// The index protects against simultaneous duplicate submissions too.
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ applicant: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
