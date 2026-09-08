# Job Portal Backend

A college mini-project for posting jobs and applying for them. This is a backend API, tested with Postman.

**Tools:** Node.js, Express, MongoDB, Mongoose, bcryptjs, JWT, cookie-parser and dotenv.

## Roles and models

- **Job Seeker** (`jobseeker`): manage their profile, browse jobs and apply.
- **Employer** (`employer`): manage their own jobs and review applications.
- **Admin** (`admin`): manage users, suspend accounts and remove jobs.

There are three models: **User**, **Job** and **Application**.
Skills, education and experience are embedded in User; salaryRange is embedded in Job.
Job references its employer through `employerId`. Application references `applicantId` and `jobId`.

Passwords are hashed. Login saves a one-day JWT in an httpOnly `accessToken` cookie.
Middleware checks the user and role. Logout ends the account's sessions.
Removed users and jobs are hidden, while old applications keep their references.

## Run locally

Use Node.js 22.12 or later and have MongoDB running.

1. Run `npm install`.
2. Copy `.env.example` to `.env`, or keep your existing `.env`.
3. Set `MONGO_URI`, a random `JWT_SECRET` of at least 32 characters, and the three `ADMIN_*` values. Passwords need at least 8 characters and at most 72 bytes. `PORT` defaults to 5000.
4. Run `npm start`, or `npm run dev` to restart automatically after edits.
5. In another terminal, run `npm run seed:admin`. It creates the admin without resetting an existing account.

Check [localhost:5000/api/health](http://localhost:5000/api/health). Keep your real `.env` private.

## Main endpoints

Paths below follow the prefix in the first column. Use JSON request bodies.

| Prefix | Endpoints |
| --- | --- |
| `/jobSeeker-api` | POST `/users`, `/users/login`; GET/PUT `/users`; GET `/jobs`, `/jobs/:jobId`; POST `/jobs/:jobId/apply`; GET `/applications` |
| `/employer-api` | POST `/users`, `/users/login`; POST/GET `/jobs`; GET/PUT/DELETE `/jobs/:jobId`; GET `/applications`; PUT `/applications/:applicationId` |
| `/admin-api` | POST `/admin/login`; GET `/users`, `/users/:userId`; PUT `/users/:userId/status`; DELETE `/users/:userId`; GET `/jobs`, `/jobs/:jobId`; DELETE `/jobs/:jobId` |

Each prefix also has POST `/logout`. Admin routes require admin login.

Jobs use `active` or `closed`. Applications use `pending`, `reviewing`, `accepted` or `rejected`.

## Postman

Import `job-portal.postman_collection.json`. Set its `adminEmail` and `adminPassword` variables to your local admin details, then run the whole collection in order.

It creates sample users and jobs, saves their IDs, and uses Postman's cookie jar after login. It also checks missing tokens, wrong roles, duplicate applications and another employer's access. It removes its sample records at the end.

This refactor replaces the old `/api/auth`, `/api/jobs` and related routes with the role prefixes above. Use the new collection. Existing local accounts and records were preserved.
