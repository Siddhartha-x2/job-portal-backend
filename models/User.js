const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const educationSchema = new mongoose.Schema({
  degree: { type: String, required: true, trim: true },
  institution: { type: String, required: true, trim: true },
  fieldOfStudy: { type: String, trim: true, default: '' },
  startYear: { type: Number, min: 1950, max: 2100 },
  endYear: { type: Number, min: 1950, max: 2100 }
}, { _id: false });

educationSchema.pre('validate', function () {
  if (this.startYear && this.endYear && this.endYear < this.startYear) {
    this.invalidate('endYear', 'End year must be at least the start year');
  }
});

const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  years: { type: Number, required: true, min: 0, max: 60 },
  description: { type: String, default: '', maxlength: 1000 }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['jobseeker', 'employer', 'admin'], required: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  // These details belong to this user and are usually read with the profile.
  skills: { type: [String], default: [] },
  education: { type: [educationSchema], default: [] },
  experience: { type: [experienceSchema], default: [] },
  tokenVersion: { type: Number, default: 0, select: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (Buffer.byteLength(this.password, 'utf8') > 72) throw new Error('Password exceeds bcrypt input limit');
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, result) => {
    delete result.password;
    delete result.tokenVersion;
    delete result.__v;
    return result;
  }
});

module.exports = mongoose.model('User', userSchema);
