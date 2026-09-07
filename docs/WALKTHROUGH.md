# Code walkthrough

Start with server.js. It loads environment configuration, calls config/db.js and starts the Express app from app.js. The app registers middleware and routes, followed by the 404 and error handlers.

## Registration and login

authRoutes.js validates the body before authController.js creates a user. Public registration only accepts jobseeker or employer. The User save hook hashes a modified password with bcrypt.

Login explicitly selects the hidden password hash, calls matchPassword(), checks that the account is active and passes the user to utils/generateToken.js. The token is sent as an httpOnly cookie. The JSON transform removes passwords and the internal session version.

## Authentication versus authorization

middleware/authMiddleware.js exports protect. It verifies the cookie, loads the user and checks current status and session version.

middleware/roleMiddleware.js exports authorizeRoles(...roles). A role check determines whether this type of account can use a route. Ownership is a separate check: findOwnJob() verifies that the job's employer ID matches req.user._id before returning private data or changing anything.

The seeker application query includes both the application ID and the logged-in applicant ID. Knowing another application's ID is not enough to read it.

## Models and relationships

User embeds education and experience because they belong to that profile. Job embeds its salary range and references the employer's User record. Application references a Job and a User.

populate() resolves selected reference fields for a useful response. It does not replace authentication or ownership checks. Explicit selections keep private authentication fields out of populated responses.

## Applying and reviewing

POST /api/jobs/:jobId/apply checks the job, status, deadline and employer availability. It saves the job/applicant references, cover letter, applied date and a small snapshot of the submitted name, email and skills.

The unique { job, applicant } index prevents duplicates even when two requests arrive together. A duplicate database key becomes HTTP 409.

An employer changes status through PATCH /api/applications/:applicationId/status. The controller loads the application, checks ownership of its linked job, then saves reviewing, accepted, rejected or pending.

## Admin and deletion

Admin routes require both protect and authorizeRoles('admin'). Suspending a user makes protected requests fail. Reactivation requires a new login because the session version changed.

Deletion is soft deletion. User/job documents receive deletedAt and disappear from active use, while existing applications retain valid references. This is not permanent data erasure.

## A few design decisions to explain

- Password hashing is one-way; login compares the entered password against the hash.
- HttpOnly prevents browser JavaScript from reading the cookie. SameSite and origin checks protect cookie-authenticated writes.
- A role check does not establish resource ownership.
- Whitelisted updates prevent role escalation through a profile body.
- Request validation gives helpful errors; database indexes enforce uniqueness under concurrency.
- Logout clears the cookie and revokes all sessions belonging to that account.
- .env stores private configuration; .env.example describes the required settings.
- npm run local retains MongoDB files; automated tests use isolated temporary databases.

