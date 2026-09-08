const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  min: { type: Number, required: true, min: 0 },
  max: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', uppercase: true, match: /^[A-Z]{3}$/ }
}, { _id: false });

salarySchema.pre('validate', function () {
  if (this.max < this.min) this.invalidate('max', 'Maximum salary must be at least the minimum');
});

const jobSchema = new mongoose.Schema({
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  company: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 5, maxlength: 10000 },
  location: { type: String, required: true, trim: true, maxlength: 120 },
  employmentType: { type: String, required: true, enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'] },
  salaryRange: { type: salarySchema, required: true },
  requiredSkills: { type: [String], validate: value => value.length > 0 },
  experienceRequirement: { type: Number, required: true, min: 0, max: 60 },
  postedDate: { type: Date, default: Date.now },
  applicationDeadline: { type: Date, required: true },
  jobStatus: { type: String, enum: ['active', 'closed'], default: 'active' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

jobSchema.pre('validate', function () {
  const reopening = this.isModified('jobStatus') && this.jobStatus === 'active';
  if ((this.isNew || this.isModified('applicationDeadline') || reopening) && this.applicationDeadline <= new Date()) {
    this.invalidate('applicationDeadline', 'Set a future application deadline');
  }
});

module.exports = mongoose.model('Job', jobSchema);
