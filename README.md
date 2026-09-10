# Job Portal Backend

A backend project where job seekers apply for jobs, employers post jobs, and admins manage users and jobs. There is no frontend; the API is tested using Postman.

## Technologies

Node.js, Express, MongoDB, Mongoose, bcryptjs, JWT, cookie-parser and dotenv.

## Roles

- Job seeker (`jobseeker`): update their profile, view jobs, apply and check application status.
- Employer (`employer`): manage their own jobs and review applications.
- Admin (`admin`): view users and jobs, suspend users and remove records.

## Database

There are three models: User, Job and Application.

Skills, education and experience are stored inside User. Salary details are stored inside Job. These are embedded data.

A job stores its employer's ID. An application stores the job ID and applicant ID. These references connect the models.

Passwords are hashed before saving. Login uses a JWT in an httpOnly `accessToken` cookie. Protected routes check the user and role. A seeker cannot apply to the same job twice.

## Setup

Install Node.js 22.12 or later and start MongoDB. Open a terminal in this folder.

1. Run `npm install`.
2. Copy `.env.example` to `.env` if you do not have one.
3. Set `MONGO_URI` and a random `JWT_SECRET` of at least 32 characters.
4. Set `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Passwords need at least 8 characters and at most 72 bytes.
5. Run `npm start`. For automatic restarts while editing, use `npm run dev`.
6. In another terminal, run `npm run seed:admin`. This creates the admin account.

The default port is 5000. Check [localhost:5000/api/health](http://localhost:5000/api/health). Keep your real `.env` private.

## API routes

| Prefix | Main routes |
| --- | --- |
| `/jobSeeker-api` | `/users`, `/users/login`, `/jobs`, `/jobs/:jobId/apply`, `/applications` |
| `/employer-api` | `/users`, `/users/login`, `/jobs`, `/jobs/:jobId`, `/applications/:applicationId` |
| `/admin-api` | `/admin/login`, `/users`, `/users/:userId/status`, `/jobs` |

Each role also has POST `/logout`. The Postman collection includes all methods, routes and sample JSON bodies.

Jobs can be `active` or `closed`. Applications can be `pending`, `reviewing`, `accepted` or `rejected`.
Removed users and jobs stay in the database so old applications keep their references.

## Postman testing

Import `job-portal.postman_collection.json`. Set `adminEmail` and `adminPassword` to your local admin details, then run the collection from **Health**.

Postman saves the login cookie automatically. The collection tests all three roles, including wrong-role access, duplicate applications and employer ownership. It creates sample records and removes them at the end.
