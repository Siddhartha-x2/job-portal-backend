# Test results

Verified on 7 September 2026 using Windows, Node.js 24.14.1 and real MongoDB 7.0.24 instances.

| Check | Result |
| --- | --- |
| Dependency installation | npm install completed successfully |
| Syntax checks | All JavaScript files passed |
| API tests | 44 passed; 0 failed; 5 suites |
| Postman collection through Newman | 90 requests, 193 assertions; 0 failures |
| Cookie jar | Login, subsequent authenticated requests, logout and unauthenticated follow-up passed |
| Workflow | pending -> reviewing -> accepted passed |
| Authorization | Wrong roles, cross-employer operations and private application access rejected |
| Validation | Duplicate emails/applications, invalid IDs, fields, salary/year ranges and expired tokens covered |

The API suite uses Supertest and real isolated MongoDB instances. The Postman collection was run through Newman, not manually through the Postman desktop interface. It uses automatic cookie handling for positive requests and isolated explicit cookies for negative tests.

The test runners never clear the configured persistent database. postman-summary.json contains only run counts and failures, with no live credentials or cookies.

The local data migration and persistent restart check are recorded separately in persistence-check.json. These checks cover functionality; deployment to a hosting service and load testing were outside the requested scope.

Run your own checks:

```sh
npm run check
npm test
npm run test:postman
```

