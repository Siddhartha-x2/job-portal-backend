const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const educationSchema = new mongoose.Schema({
  institution: { type: String, required: true, trim: true },
  degree: { type: String, required: true, trim: true },
  fieldOfStudy: { type: String, trim: true },
  startDate: Date,
  endDate: Date
}, { _id: false });

const experienceSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  startDate: Date,
  endDate: Date,
  description: { type: String, maxlength: 1000 }
}, { _id: false });

for (const schema of [educationSchema, experienceSchema]) {
  schema.pre('validate', function () {
    if (this.startDate && this.endDate && this.endDate < this.startDate) {
      this.invalidate('endDate', 'End date must be after start date');
    }
  });
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String, required: true, minlength: 8, select: false,
    validate: value => Buffer.byteLength(value, 'utf8') <= 72 },
  role: { type: String, enum: ['jobseeker', 'employer', 'admin'], required: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  skills: [String],
  education: [educationSchema],
  experience: [experienceSchema],
  tokenVersion: { type: Number, default: 0, select: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.set('toJSON', {
  transform: (_doc, user) => {
    delete user.password;
    delete user.tokenVersion;
    delete user.__v;
    return user;
  }
});

module.exports = mongoose.model('User', userSchema);
