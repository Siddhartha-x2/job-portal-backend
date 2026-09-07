const { z } = require('zod');

const text = (min, max) => z.string().trim().min(min).max(max);
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const password = z.string().min(8).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes');
const skills = z.array(text(1, 60)).max(30);
const education = z.array(z.strictObject({
  institution: text(2, 150), degree: text(2, 150), fieldOfStudy: text(0, 150).optional(),
  startYear: z.number().int().min(1950).max(2100).optional(),
  endYear: z.number().int().min(1950).max(2100).optional()
}).refine(value => !value.startYear || !value.endYear || value.endYear >= value.startYear, 'End year must be at least the start year')).max(15);
const experience = z.array(z.strictObject({
  company: text(2, 120), title: text(2, 120), years: z.number().min(0).max(60), description: text(0, 1000).optional()
})).max(30);
const nonempty = schema => schema.refine(value => Object.keys(value).length > 0, 'Provide at least one field');

const register = z.strictObject({ name: text(2, 80), email, password, role: z.enum(['jobseeker', 'employer']) });
const login = z.strictObject({ email, password });
const updateProfile = nonempty(z.strictObject({ name: text(2, 80).optional(), skills: skills.optional(), education: education.optional(), experience: experience.optional() }));
const salaryRange = z.strictObject({ min: z.number().min(0).max(1e9), max: z.number().min(0).max(1e9), currency: z.string().regex(/^[A-Z]{3}$/).default('INR') })
  .refine(value => value.max >= value.min, 'Maximum salary must be at least the minimum');
const jobFields = {
  title: text(3, 120), companyName: text(2, 120), description: text(20, 10000), location: text(2, 120),
  employmentType: z.enum(['full-time', 'part-time', 'internship', 'contract']),
  salaryRange, requiredSkills: skills.min(1), experienceRequirement: z.number().min(0).max(60),
  applicationDeadline: z.iso.datetime({ offset: true }).refine(value => new Date(value) > new Date(), 'Deadline must be in the future'),
  status: z.enum(['active', 'closed'])
};
const createJob = z.strictObject({ ...jobFields, status: jobFields.status.default('active') });
const updateJob = nonempty(z.strictObject(jobFields).partial());
const apply = z.strictObject({ coverLetter: text(0, 5000).default('') });
const applicationStatus = z.strictObject({ status: z.enum(['pending', 'reviewing', 'accepted', 'rejected']) });
const userStatus = z.strictObject({ status: z.enum(['active', 'suspended']) });
const pageNumber = max => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(max));
const pageFields = { page: pageNumber(10000).default(1), limit: pageNumber(50).default(10) };
const pagination = z.strictObject(pageFields);
const jobQuery = z.strictObject({ ...pageFields, search: text(1, 100).optional(), location: text(1, 120).optional(), employmentType: jobFields.employmentType.optional() });
const ownJobQuery = z.strictObject({ ...pageFields, status: jobFields.status.optional() });
const userQuery = z.strictObject({ ...pageFields, role: z.enum(['jobseeker', 'employer', 'admin']).optional(), status: z.enum(['active', 'suspended']).optional() });

module.exports = { register, login, updateProfile, createJob, updateJob, apply, applicationStatus, userStatus, pagination, jobQuery, ownJobQuery, userQuery };
