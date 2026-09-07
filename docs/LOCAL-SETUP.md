# Prepared local setup

The project on this computer has a private .env and a persistent MongoDB database.

Run from the job-portal-api folder:

```sh
npm run local
```

API health: http://localhost:5000/api/health  
Available jobs: http://localhost:5000/api/jobs

Database files are in .data/mongodb. Stop with Ctrl+C and run the same command to restart. The launcher is not a Windows startup service.

## Existing local accounts

| Role | Email |
| --- | --- |
| Admin | admin@example.com |
| Employer | employer@example.com |
| Job seeker | seeker@example.com |

The three prepared accounts use the generated ADMIN_PASSWORD value in your private .env. Their existing passwords and IDs were preserved during the schema update. The password is not included in this document or in the source ZIP.

The saved jobs and application were migrated to companyName, experienceRequirement, applicationDeadline, active jobs, and reviewing application status. A private backup of the earlier data remains under .data/backups.

To test manually, log in using POST /api/auth/login with email and password. Import postman/Job_Portal_API.postman_collection.json and the private .cache/local.postman_environment.json. Run npm run postman:local to regenerate that environment.

The collection creates separate test accounts and leaves these prepared accounts alone. It logs the admin out when the run finishes.

## New computer

The source ZIP excludes .env, .data, .cache, node_modules and logs. Follow the README on a new computer: install dependencies, create private .env values, start MongoDB and run npm run seed:admin.

