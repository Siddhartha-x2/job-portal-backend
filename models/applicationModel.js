const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicationStatus: { type: String, enum: ['pending', 'reviewing', 'accepted', 'rejected'], default: 'pending' },
  coverLetter: { type: String, default: '', maxlength: 5000 }
}, { timestamps: true });

// MongoDB also prevents duplicates when requests arrive at the same time.
applicationSchema.index({ applicantId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
