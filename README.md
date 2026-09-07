# Job Portal Backend

A backend project where job seekers apply for jobs, employers post jobs, and admins manage users and jobs. It uses Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs and cookies.

## Features

- Job seekers can register, log in, update their profile and apply for jobs.
- Employers can manage their own jobs and review applications.
- Admins can view users and jobs, suspend users and remove records.
- Passwords are hashed. Login uses a JWT in an httpOnly cookie.
- A user cannot apply for the same job twice.

The database has three models: User, Job and Application. Skills, education and experience are stored in the user profile. Applications link a user to a job.

## How to Run

Install Node.js 22.12 or later and open a terminal in this folder.

1. Install the packages:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` if you do not have one. Set a random `JWT_SECRET` of at least 32 characters and your admin name, email and password. Use at least 8 characters for the password. Keep the other settings for local use.

3. Start the server and local MongoDB:

   ```sh
   npm run local
   ```

   The first run downloads MongoDB if needed. Your data is saved after restarting.

4. Keep it running and open another terminal to create the admin:

   ```sh
   npm run seed:admin
   ```

Check the server: [localhost:5000/api/health](http://localhost:5000/api/health).

## Testing

There is no frontend. Use Postman to test the API.

With the server running, run:

```sh
npm run postman:local
```

Import these files into Postman:

- `postman/Job_Portal_API.postman_collection.json`
- `.cache/local.postman_environment.json`

Select the imported environment and run the collection from **Health**. It includes the routes and sample request bodies for login, profiles, jobs, applications and admin actions.

Keep `.env` and the generated Postman environment private because they contain login details.

To run the automated tests:

```sh
npm test
npm run test:postman
```

