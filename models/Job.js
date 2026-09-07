const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  min: { type: Number, required: true, min: 0 },
  max: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', match: /^[A-Z]{3}$/ }
}, { _id: false });

salarySchema.pre('validate', function () {
  if (this.max < this.min) this.invalidate('max', 'Maximum salary must be at least the minimum');
});

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  companyName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 20, maxlength: 10000 },
  location: { type: String, required: true, trim: true, maxlength: 120 },
  employmentType: { type: String, required: true, enum: ['full-time', 'part-time', 'internship', 'contract'] },
  salaryRange: { type: salarySchema, required: true },
  requiredSkills: { type: [String], validate: value => value.length > 0 },
  experienceRequirement: { type: Number, required: true, min: 0, max: 60 },
  postedDate: { type: Date, default: Date.now },
  applicationDeadline: { type: Date, required: true },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  // The employer has an account and lifecycle separate from its job postings.
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

jobSchema.index({ status: 1, deletedAt: 1, applicationDeadline: 1 });
jobSchema.index({ employer: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
