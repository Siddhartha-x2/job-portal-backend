const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../app');
const { connectDatabase } = require('../config/db');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const startTempDatabase = require('../scripts/temp-database');

const password = randomBytes(18).toString('base64url');
const config = { jwtSecret: randomBytes(32).toString('hex'), tokenTtl: 86400, production: false, origin: 'http://localhost:5000' };
const missingId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const jobData = () => ({
  title: 'Backend Developer', companyName: 'TechCorp India', description: 'Build REST APIs and write tests for our job platform.',
  location: 'Bengaluru', employmentType: 'full-time', salaryRange: { min: 400000, max: 700000, currency: 'INR' },
  requiredSkills: ['Node.js', 'MongoDB'], experienceRequirement: 1, applicationDeadline: new Date(Date.now() + 86400000).toISOString()
});
let database, app, users, cookies, job;

function session(user, options = {}) {
  return `token=${jwt.sign({ v: user.tokenVersion }, config.jwtSecret, {
    algorithm: 'HS256', subject: user.id, expiresIn: 86400, issuer: 'job-portal-api', audience: 'job-portal-users', ...options
  })}`;
}
function auth(method, path, who = 'seeker') { return request(app)[method](path).set('Cookie', cookies[who]); }
async function submit(who = 'seeker') {
  return auth('post', `/api/jobs/${job.id}/apply`, who).send({ coverLetter: 'I have worked with Express and MongoDB.' });
}
function noSecrets(response) {
  const text = JSON.stringify(response.body);
  assert.doesNotMatch(text, /"password"|"tokenVersion"|\$2[aby]\$/);
}

before(async () => {
  database = await startTempDatabase();
  await connectDatabase(database.getUri('job_portal_tests'));
}, { timeout: 240000 });

after(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Job.deleteMany({}), Application.deleteMany({})]);
  app = createApp(config);
  const rows = await User.create([
    { name: 'Test Seeker', email: 'seeker@example.com', password, role: 'jobseeker', skills: ['Node.js'] },
    { name: 'Other Seeker', email: 'otherseeker@example.com', password, role: 'jobseeker' },
    { name: 'Test Employer', email: 'employer@example.com', password, role: 'employer' },
    { name: 'Other Employer', email: 'otheremployer@example.com', password, role: 'employer' },
    { name: 'Test Admin', email: 'admin@example.com', password, role: 'admin' }
  ]);
  users = Object.fromEntries(['seeker', 'otherSeeker', 'employer', 'otherEmployer', 'admin'].map((key, index) => [key, rows[index]]));
  cookies = Object.fromEntries(Object.entries(users).map(([key, user]) => [key, session(user)]));
  job = await Job.create({ ...jobData(), employer: users.employer._id });
});

describe('authentication and request security', () => {
  it('registers a seeker, normalizes email and hashes the password', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'New Student', email: 'NEW@example.com', password, role: 'jobseeker' }).expect(201);
    assert.equal(response.body.data.email, 'new@example.com');
    const stored = await User.findById(response.body.data._id).select('+password');
    assert.notEqual(stored.password, password);
    assert.ok(await stored.matchPassword(password));
    noSecrets(response);
  });
  it('registers an employer', async () => {
    await request(app).post('/api/auth/register').send({ name: 'New Employer', email: 'new@example.com', password, role: 'employer' }).expect(201);
  });
  it('rejects admin registration and mass assignment', async () => {
    await request(app).post('/api/auth/register').send({ name: 'New Admin', email: 'new@example.com', password, role: 'admin' }).expect(400);
    await request(app).post('/api/auth/register').send({ name: 'New User', email: 'new@example.com', password, role: 'jobseeker', status: 'active' }).expect(400);
  });
  it('rejects duplicate emails regardless of case', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Duplicate User', email: 'SEEKER@example.com', password, role: 'jobseeker' }).expect(409);
  });
  it('validates password bytes and email', async () => {
    for (const change of [{ password: 'short' }, { password: 'a'.repeat(73) }, { password: String.fromCodePoint(0x1F600).repeat(19) }, { email: 'invalid' }]) {
      await request(app).post('/api/auth/register').send({ name: 'New User', email: 'new@example.com', password, role: 'jobseeker', ...change }).expect(400);
    }
  });
  it('logs in through an httpOnly cookie and the cookie jar authenticates later requests', async () => {
    const agent = request.agent(app);
    const response = await agent.post('/api/auth/login').send({ email: users.seeker.email, password }).expect(200);
    assert.match(response.headers['set-cookie'][0], /HttpOnly/);
    assert.match(response.headers['set-cookie'][0], /SameSite=Strict/);
    assert.match(response.headers['set-cookie'][0], /Path=\/api/);
    noSecrets(response);
    noSecrets(await agent.get('/api/auth/me').expect(200));
  });
  it('sets Secure in production', async () => {
    const response = await request(createApp({ ...config, production: true })).post('/api/auth/login').send({ email: users.seeker.email, password }).expect(200);
    assert.match(response.headers['set-cookie'][0], /; Secure/);
  });
  it('rejects a wrong password and unknown account with the same message', async () => {
    const first = await request(app).post('/api/auth/login').send({ email: users.seeker.email, password: randomBytes(18).toString('hex') }).expect(401);
    const second = await request(app).post('/api/auth/login').send({ email: 'absent@example.com', password }).expect(401);
    assert.equal(first.body.message, second.body.message);
  });
  it('rejects missing, invalid, expired, wrong-audience and wrong-algorithm tokens', async () => {
    await request(app).get('/api/auth/me').expect(401);
    for (const cookie of ['token=garbage', session(users.seeker, { expiresIn: -1 }), session(users.seeker, { audience: 'different' }), session(users.seeker, { algorithm: 'HS384' })]) {
      await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
    }
  });
  it('does not accept bearer tokens in place of cookies', async () => {
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${cookies.seeker.slice(6)}`).expect(401);
  });
  it('clears cookies on logout and rejects replay of the old token', async () => {
    const response = await auth('post', '/api/auth/logout').expect(200);
    assert.match(response.headers['set-cookie'][0], /token=;/);
    assert.match(response.headers['set-cookie'][0], /Expires=Thu, 01 Jan 1970/);
    await auth('get', '/api/auth/me').expect(401);
  });
  it('rejects cross-origin and cross-site writes', async () => {
    await auth('patch', '/api/users/me').set('Origin', 'https://evil.example').send({ name: 'Changed' }).expect(403);
    await auth('patch', '/api/users/me').set('Sec-Fetch-Site', 'cross-site').send({ name: 'Changed' }).expect(403);
    await auth('patch', '/api/users/me').set('Origin', config.origin).send({ name: 'Changed' }).expect(200);
  });
  it('rejects malformed JSON, oversized bodies and form posts', async () => {
    await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{').expect(400);
    await request(app).post('/api/auth/login').send({ password: 'a'.repeat(60000) }).expect(413);
    await request(app).post('/api/auth/login').type('form').send({ email: 'test@example.com' }).expect(415);
  });
  it('rejects NoSQL operator objects', async () => {
    await request(app).post('/api/auth/login').send({ email: { $ne: null }, password }).expect(400);
  });
  it('limits repeated authentication attempts', async () => {
    for (let i = 0; i < 30; i++) await request(app).post('/api/auth/login').send({}).expect(400);
    await request(app).post('/api/auth/login').send({}).expect(429);
  });
});

describe('profiles and public job browsing', () => {
  it('updates embedded education and experience without losing other profile fields', async () => {
    const response = await auth('patch', '/api/users/me').send({
      education: [{ institution: 'City College', degree: 'B.Tech', endYear: 2027 }],
      experience: [{ company: 'Small Studio', title: 'Intern', years: 0.5 }]
    }).expect(200);
    assert.deepEqual(response.body.data.skills, ['Node.js']);
    assert.equal(response.body.data.education[0].degree, 'B.Tech');
    noSecrets(response);
  });
  it('prevents profile updates from changing role, password or status', async () => {
    for (const body of [{ role: 'admin' }, { password: randomBytes(18).toString('hex') }, { status: 'active' }, {}, { profile: {} }]) {
      await auth('patch', '/api/users/me').send(body).expect(400);
    }
  });
  it('lists available jobs and supports search, filters and pagination', async () => {
    const response = await request(app).get('/api/jobs?search=Backend&location=Bengaluru&employmentType=full-time&page=1&limit=1').expect(200);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.pagination.total, 1);
    assert.equal(response.body.data[0].employer.name, users.employer.name);
    assert.equal(response.body.data[0].employer.email, undefined);
    noSecrets(response);
    assert.equal((await request(app).get('/api/jobs?search=.*').expect(200)).body.data.length, 0);
  });
  it('does not expose closed, expired, deleted or inactive employer jobs publicly', async () => {
    for (const change of [{ status: 'closed' }, { applicationDeadline: new Date(Date.now() - 1000) }, { deletedAt: new Date() }]) {
      await Job.updateOne({ _id: job._id }, { $set: { status: 'active', deletedAt: null, applicationDeadline: new Date(Date.now() + 86400000), ...change } });
      assert.equal((await request(app).get('/api/jobs')).body.data.length, 0);
      await request(app).get(`/api/jobs/${job.id}`).expect(404);
    }
    await Job.updateOne({ _id: job._id }, { $set: { status: 'active', deletedAt: null } });
    await User.updateOne({ _id: users.employer._id }, { $set: { status: 'suspended' } });
    assert.equal((await request(app).get('/api/jobs')).body.data.length, 0);
  });
  it('gets a single available job', async () => {
    const response = await request(app).get(`/api/jobs/${job.id}`).expect(200);
    assert.equal(response.body.data.title, job.title);
  });
  it('validates IDs and query parameters', async () => {
    await request(app).get('/api/jobs/not-an-id').expect(400);
    await request(app).get(`/api/jobs/${missingId}`).expect(404);
    for (const query of ['limit=100', 'page=-1', 'page=abc', 'page=1&page=2', 'status=closed', 'search[$ne]=x']) {
      await request(app).get(`/api/jobs?${query}`).expect(400);
    }
    await request(app).get('/api/unknown').expect(404);
  });
});

describe('employer job management', () => {
  it('lets an employer create, read, update and delete a job', async () => {
    const created = await auth('post', '/api/jobs', 'employer').send(jobData()).expect(201);
    const id = created.body.data._id;
    assert.equal(created.body.data.employer, users.employer.id);
    await auth('get', `/api/jobs/employer/my-jobs/${id}`, 'employer').expect(200);
    const updated = await auth('patch', `/api/jobs/${id}`, 'employer').send({ title: 'Junior Backend Developer' }).expect(200);
    assert.equal(updated.body.data.title, 'Junior Backend Developer');
    await auth('delete', `/api/jobs/${id}`, 'employer').expect(204);
    await request(app).get(`/api/jobs/${id}`).expect(404);
    await auth('get', `/api/jobs/employer/my-jobs/${id}`, 'employer').expect(404);
  });
  it('rejects anonymous, seeker and admin creation', async () => {
    await request(app).post('/api/jobs').send(jobData()).expect(401);
    for (const who of ['seeker', 'admin']) await auth('post', '/api/jobs', who).send(jobData()).expect(403);
  });
  it('lists only the employer own jobs, including closed ones', async () => {
    await Job.create({ ...jobData(), employer: users.otherEmployer._id });
    await Job.updateOne({ _id: job._id }, { status: 'closed' });
    const response = await auth('get', '/api/jobs/employer/my-jobs?status=closed', 'employer').expect(200);
    assert.equal(response.body.pagination.total, 1);
    assert.equal(response.body.data[0]._id, job.id);
    await auth('get', `/api/jobs/employer/my-jobs/${job.id}`, 'employer').expect(200);
  });
  it('rejects another employer reading private details, editing or deleting a job', async () => {
    await auth('get', `/api/jobs/employer/my-jobs/${job.id}`, 'otherEmployer').expect(403);
    await auth('patch', `/api/jobs/${job.id}`, 'otherEmployer').send({ title: 'Stolen title' }).expect(403);
    await auth('delete', `/api/jobs/${job.id}`, 'otherEmployer').expect(403);
    assert.equal((await Job.findById(job.id)).title, job.title);
  });
  it('rejects invalid salaries, applicationDeadlines, types, skills and forged ownership', async () => {
    for (const change of [{ salaryRange: { min: 100, max: 50 } }, { applicationDeadline: '2000-01-01T00:00:00.000Z' }, { employmentType: 'random' }, { requiredSkills: [] }, { employer: users.otherEmployer.id }]) {
      await auth('post', '/api/jobs', 'employer').send({ ...jobData(), ...change }).expect(400);
    }
    await auth('patch', `/api/jobs/${job.id}`, 'employer').send({ salaryRange: { min: 100, max: 50 } }).expect(400);
    await auth('patch', `/api/jobs/${job.id}`, 'employer').send({}).expect(400);
    assert.equal((await Job.findById(job.id)).salaryRange.max, 700000);
  });
  it('requires a new applicationDeadline when reopening an expired job', async () => {
    await Job.updateOne({ _id: job._id }, { status: 'closed', applicationDeadline: new Date(Date.now() - 1000) });
    await auth('patch', `/api/jobs/${job.id}`, 'employer').send({ status: 'active' }).expect(400);
    await auth('patch', `/api/jobs/${job.id}`, 'employer').send({ status: 'active', applicationDeadline: jobData().applicationDeadline }).expect(200);
  });
});

describe('applications and ownership', () => {
  it('stores references, appliedAt and the submitted profile', async () => {
    const response = await submit();
    assert.equal(response.status, 201);
    assert.equal(response.body.data.job, job.id);
    assert.equal(response.body.data.applicant, users.seeker.id);
    assert.equal(response.body.data.status, 'pending');
    await auth('patch', '/api/users/me').send({ skills: ['Python'] }).expect(200);
    const application = await Application.findById(response.body.data._id);
    assert.deepEqual([...application.applicantSnapshot.skills], ['Node.js']);
  });
  it('allows an application with an optional cover letter', async () => {
    const response = await auth('post', `/api/jobs/${job.id}/apply`).send({}).expect(201);
    assert.equal(response.body.data.coverLetter, '');
    assert.ok(response.body.data.appliedAt);
    await auth('post', `/api/jobs/${job.id}/apply`, 'otherSeeker').send({}).expect(201);
  });
  it('prevents duplicate applications, including simultaneous submissions', async () => {
    const responses = await Promise.all([submit(), submit()]);
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
    assert.equal(await Application.countDocuments(), 1);
  });
  it('allows only authenticated seekers to apply', async () => {
    await request(app).post(`/api/jobs/${job.id}/apply`).send({}).expect(401);
    for (const who of ['employer', 'admin']) await auth('post', `/api/jobs/${job.id}/apply`, who).send({}).expect(403);
  });
  it('rejects applications to closed, expired, deleted and unavailable employer jobs', async () => {
    for (const [change, status] of [[{ status: 'closed' }, 400], [{ applicationDeadline: new Date(0) }, 400], [{ deletedAt: new Date() }, 404]]) {
      await Job.updateOne({ _id: job._id }, { $set: { status: 'active', applicationDeadline: new Date(Date.now() + 86400000), deletedAt: null, ...change } });
      assert.equal((await submit()).status, status);
    }
    await Job.updateOne({ _id: job._id }, { $set: { deletedAt: null } });
    await User.updateOne({ _id: users.employer._id }, { $set: { deletedAt: new Date() } });
    assert.equal((await submit()).status, 400);
  });
  it('prevents forged applicant/status fields and unsupported fields', async () => {
    for (const body of [{ applicant: users.otherSeeker.id }, { status: 'accepted' }, { resumeUrl: 'javascript:alert(1)' }]) {
      await auth('post', `/api/jobs/${job.id}/apply`).send(body).expect(400);
    }
  });
  it('lets seekers read only their own applications and status', async () => {
    const response = await submit();
    const id = response.body.data._id;
    await auth('get', `/api/applications/me/${id}`).expect(200);
    await auth('get', `/api/applications/me/${id}`, 'otherSeeker').expect(404);
    const list = await auth('get', '/api/applications/me', 'otherSeeker').expect(200);
    assert.equal(list.body.data.length, 0);
    const own = await auth('get', '/api/applications/me').expect(200);
    assert.equal(own.body.data[0].job.title, job.title);
    noSecrets(own);
  });
  it('lets the owning employer review and update application status', async () => {
    const response = await submit();
    const id = response.body.data._id;
    const list = await auth('get', `/api/jobs/${job.id}/applications`, 'employer').expect(200);
    assert.equal(list.body.data[0].applicantSnapshot.email, users.seeker.email);
    noSecrets(list);
    await auth('patch', `/api/applications/${id}/status`, 'employer').send({ status: 'reviewing' }).expect(200);
    assert.equal((await auth('get', `/api/applications/me/${id}`).expect(200)).body.data.status, 'reviewing');
    await auth('patch', `/api/applications/${id}/status`, 'employer').send({ status: 'invalid' }).expect(400);
  });
  it('rejects private application access and status changes by the wrong users', async () => {
    const response = await submit();
    const id = response.body.data._id;
    await auth('get', `/api/jobs/${job.id}/applications`, 'otherEmployer').expect(403);
    await auth('patch', `/api/applications/${id}/status`, 'otherEmployer').send({ status: 'accepted' }).expect(403);
    await auth('patch', `/api/applications/${id}/status`).send({ status: 'accepted' }).expect(403);
    await auth('get', `/api/jobs/${job.id}/applications`).expect(403);
    assert.equal((await Application.findById(id)).status, 'pending');
  });
  it('preserves application history after a job is removed', async () => {
    const response = await submit();
    await auth('delete', `/api/jobs/${job.id}`, 'employer').expect(204);
    const saved = await auth('get', `/api/applications/me/${response.body.data._id}`).expect(200);
    assert.equal(saved.body.data.job.title, job.title);
    assert.ok(saved.body.data.job.deletedAt);
    await auth('patch', `/api/applications/${response.body.data._id}/status`, 'employer').send({ status: 'accepted' }).expect(404);
  });
});

describe('admin controls', () => {
  it('protects every admin route from anonymous users and other roles', async () => {
    await request(app).get('/api/admin/users').expect(401);
    for (const who of ['seeker', 'employer']) {
      await auth('get', '/api/admin/users', who).expect(403);
      await auth('delete', `/api/admin/jobs/${job.id}`, who).expect(403);
    }
  });
  it('lists users, reads one user and exposes platform counts without passwords', async () => {
    noSecrets(await auth('get', '/api/admin/users?role=jobseeker', 'admin').expect(200));
    noSecrets(await auth('get', `/api/admin/users/${users.seeker.id}`, 'admin').expect(200));
    const stats = await auth('get', '/api/admin/stats', 'admin').expect(200);
    assert.equal(stats.body.data.users, 5);
    assert.equal(stats.body.data.jobSeekers, 2);
  });
  it('blocks login and existing sessions, then requires a fresh login after reactivation', async () => {
    await auth('patch', `/api/admin/users/${users.seeker.id}/status`, 'admin').send({ status: 'suspended' }).expect(200);
    await auth('get', '/api/auth/me').expect(403);
    await request(app).post('/api/auth/login').send({ email: users.seeker.email, password }).expect(403);
    await auth('patch', `/api/admin/users/${users.seeker.id}/status`, 'admin').send({ status: 'active' }).expect(200);
    await auth('get', '/api/auth/me').expect(401);
    await request(app).post('/api/auth/login').send({ email: users.seeker.email, password }).expect(200);
  });
  it('soft deletes a user, revokes their sessions and hides their jobs', async () => {
    await auth('delete', `/api/admin/users/${users.employer.id}`, 'admin').expect(204);
    await auth('get', '/api/auth/me', 'employer').expect(401);
    await request(app).post('/api/auth/login').send({ email: users.employer.email, password }).expect(401);
    await auth('get', `/api/admin/users/${users.employer.id}`, 'admin').expect(404);
    assert.equal((await request(app).get('/api/jobs')).body.data.length, 0);
    assert.ok(await User.findById(users.employer.id));
  });
  it('protects admin accounts against blocking and deletion', async () => {
    await auth('patch', `/api/admin/users/${users.admin.id}/status`, 'admin').send({ status: 'suspended' }).expect(403);
    await auth('delete', `/api/admin/users/${users.admin.id}`, 'admin').expect(403);
  });
  it('allows admins to read closed jobs and remove postings', async () => {
    await Job.updateOne({ _id: job._id }, { status: 'closed' });
    const list = await auth('get', '/api/admin/jobs?status=closed', 'admin').expect(200);
    assert.equal(list.body.data.length, 1);
    noSecrets(list);
    await auth('get', `/api/admin/jobs/${job.id}`, 'admin').expect(200);
    await auth('delete', `/api/admin/jobs/${job.id}`, 'admin').expect(204);
    await auth('get', `/api/admin/jobs/${job.id}`, 'admin').expect(404);
  });
  it('validates user status and missing resources', async () => {
    await auth('patch', `/api/admin/users/${users.seeker.id}/status`, 'admin').send({ status: 'superuser' }).expect(400);
    await auth('get', `/api/admin/users/${missingId}`, 'admin').expect(404);
    await auth('delete', `/api/admin/jobs/${missingId}`, 'admin').expect(404);
  });
});
