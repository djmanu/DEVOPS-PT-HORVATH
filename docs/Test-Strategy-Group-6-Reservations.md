# Test Strategy Document

## Group 6 Reservations

Course: FHB MCCE Test Automation  
Assignment: Group Assignment - Test Strategy, Automation and CI/CD  
System Under Test: Library Management System  
Assigned domain: Group 6 - Reservations  
Test repository purpose: Automated verification of the reservation domain, including API, business-rule, negative-path, and UI/E2E coverage.

## 1. Domain Overview

The Reservations domain manages the waiting list for books that are currently unavailable. It is a business-rule-heavy part of the system because a reservation is only valid when several preconditions across books, members, and loans are satisfied at the same time.

The assigned API scope is:

- `GET /api/reservations`
- `GET /api/reservations/:id`
- `POST /api/reservations`
- `POST /api/reservations/:id/cancel`

The main business rules are:

- a reservation is allowed only when `availableCopies === 0`
- a member cannot reserve a book they already have on active loan
- a member cannot hold more than one active reservation for the same book
- a member may hold at most three active reservations across `pending` and `ready`
- inactive members cannot create new reservations
- pending and ready reservations can be cancelled
- cancelling a reservation that is already cancelled must return HTTP 409

The main risks in this domain are rule collisions and cross-domain side effects. A reservation is not created in isolation. It depends on book availability, member status, and loan state. That means a superficially simple endpoint can still fail because the related book is available, because the related member is inactive, or because the same member already has the book on loan.

The highest-priority rules for testing are the availability rule, duplicate prevention, member eligibility, and the maximum-active-reservation limit. These rules directly protect the integrity of the waitlist and are the most likely sources of regression when the surrounding books, members, or loans logic changes.

## 2. Test Strategy

### 2.1 Selected testing levels

The test suite uses three levels:

- API tests for the reservation endpoints and their response contracts
- integration tests for cross-domain flows where reservations depend on loans and books
- UI/E2E tests for the browser-visible reservation workflows

Unit tests were intentionally not added. The assignment centers on the externally observable behavior of a provided SUT, and the highest value for Group 6 lies in business-rule verification through the public HTTP and UI interfaces.

### 2.2 Test design techniques

The suite uses three main design techniques:

- equivalence partitioning for valid versus invalid member and book states
- boundary value analysis for the reservation limit at 2, 3, and 4 active reservations
- state-transition testing for `pending -> ready -> cancelled`

These techniques map well to the reservation domain because most defects occur around rule boundaries and status changes rather than around complex calculations.

### 2.3 Test prioritisation

Test cases were prioritised using the following order:

- High: business-rule enforcement that blocks or allows reservation creation
- High: cancellation behavior and error handling for already cancelled reservations
- High: UI smoke coverage for the main reserve and cancel flows
- Medium: list and lookup behavior, because these are lower risk but still required for domain completeness

### 2.4 What is explicitly out of scope

The following areas were not included in the automated suite:

- performance or load testing
- browser matrix testing beyond Chromium
- authentication and authorization, because the SUT does not expose an auth layer
- direct database assertions, because the assignment is best served by black-box verification through API and UI
- reporting and search endpoints, because they belong to other assigned groups

## 3. Test Plan - Functional Test Cases

The table below documents the planned and automated Group 6 test cases.

| ID | Title | Preconditions | Steps | Expected result | Priority | Type |
| --- | --- | --- | --- | --- | --- | --- |
| G6-RES-API-01 | List seeded reservations | Seeded SUT is running | Call `GET /api/reservations` | HTTP 200 and array with reservation fields | High | Positive |
| G6-RES-API-02 | Filter reservations by book member and status | Unavailable book and matching pending reservation exist | Call `GET /api/reservations?bookId=...&memberId=...&status=pending` | HTTP 200 and every returned row matches the filters | High | Positive |
| G6-RES-API-03 | Get reservation by id | Pending reservation exists | Call `GET /api/reservations/:id` | HTTP 200 and exact reservation is returned | High | Positive |
| G6-RES-API-04 | Unknown reservation lookup | No reservation with the chosen id exists | Call `GET /api/reservations/999999` | HTTP 404 with not-found message | Medium | Negative |
| G6-RES-API-05 | Create reservation for unavailable book | Book with 1 copy is borrowed by another member | Call `POST /api/reservations` for eligible member | HTTP 201 and created reservation has status `pending` | High | Positive |
| G6-RES-API-06 | Reject reservation when book is available | Book has available copies and member is active | Call `POST /api/reservations` | HTTP 400 and error explains that the book should be borrowed instead | High | Negative |
| G6-RES-API-07 | Reject inactive member | Book is unavailable and member is deactivated | Call `POST /api/reservations` | HTTP 400 and inactive-member message | High | Negative |
| G6-RES-API-08 | Reject missing book | Valid member exists but target book id does not | Call `POST /api/reservations` with non-existent `bookId` | HTTP 404 and `Book not found` | High | Negative |
| G6-RES-API-09 | Reject missing member | Book is unavailable but target member id does not exist | Call `POST /api/reservations` with non-existent `memberId` | HTTP 404 and `Member not found` | High | Negative |
| G6-RES-API-10 | Reject reservation when active loan already exists | Same member already has the same book on active loan | Call `POST /api/reservations` | HTTP 409 and active-loan conflict message | High | Negative |
| G6-RES-API-11 | Reject duplicate active reservation | Same member already has a pending reservation for the same book | Call `POST /api/reservations` again | HTTP 409 and duplicate-reservation conflict message | High | Negative |
| G6-RES-API-12 | Allow third active reservation | Member already holds 2 active reservations | Create another reservation for a different unavailable book | HTTP 201 and member now has 3 active reservations | High | Boundary |
| G6-RES-API-13 | Reject fourth active reservation | Member already holds 3 active reservations | Attempt to reserve a fourth unavailable book | HTTP 409 and max-limit message | High | Boundary |
| G6-RES-API-14 | Cancel pending reservation | Pending reservation exists | Call `POST /api/reservations/:id/cancel` | HTTP 200 and reservation status becomes `cancelled` | High | Positive |
| G6-RES-API-15 | Cancel missing reservation | No reservation with the chosen id exists | Call `POST /api/reservations/999999/cancel` | HTTP 404 and `Reservation not found` | Medium | Negative |
| G6-RES-API-16 | Reject double cancellation | Reservation was already cancelled once | Call `POST /api/reservations/:id/cancel` again | HTTP 409 and already-cancelled message | High | Negative |
| G6-RES-INT-01 | Promote oldest pending reservation on return | Book is borrowed and two members are waiting in FIFO order | Return the active loan and inspect both reservations plus the book | Oldest reservation becomes `ready`, newer one stays `pending`, and `availableCopies` stays 0 | High | Positive |
| G6-RES-INT-02 | Count ready reservation toward max-3 limit | Member has 2 pending reservations and 1 reservation promoted to `ready` | Attempt to reserve another unavailable book | HTTP 409 and the active reservation count remains capped at 3 | High | Boundary |
| G6-RES-UI-01 | Create reservation via UI | Unavailable book and eligible member exist | Open Reservations tab, enter ids, click `Reserve`, open created row | Success message appears and detail page shows `pending` reservation | High | Positive |
| G6-RES-UI-02 | Show UI error for available book | Book is available and member is active | Open Reservations tab, enter ids, click `Reserve` | Error message is shown and no reservation is created | High | Negative |
| G6-RES-UI-03 | Cancel ready reservation via UI | A reservation has been promoted to `ready` | Open reservation detail page in browser and click `Cancel Reservation` | Success message appears, status changes to `cancelled`, and cancel action disappears | High | Positive |

## 4. Tool and Framework Selection

### 4.1 Selected tools

- Playwright Test as the main automation framework
- JavaScript as the implementation language
- GitHub Actions as the CI/CD platform
- `docx` for generating the Word version of the strategy document from Markdown

### 4.2 Why Playwright was chosen

Playwright is a good fit for this assignment because it supports API and browser automation in one toolchain. That reduces project complexity, keeps reporting unified, and makes it easy to share setup helpers across test levels. It also has built-in HTML and JUnit reporting, traces, screenshots, and videos, which directly support the CI/CD and presentation requirements.

### 4.3 Alternatives considered

- Postman and Newman would be sufficient for API-only testing but weaker for the required UI/E2E scope
- Cypress would provide strong browser testing but is less convenient for combined API and UI work in one suite
- Supertest would be attractive for in-process API testing, but the assignment also requires browser coverage and pipeline-ready reporting in a single repository

The final decision was therefore an API-first Playwright suite with selected integration and UI scenarios.

## 5. Test Architecture

### 5.1 Repository structure

```text
root
|- helpers
|  |- api.js
|  |- sut.js
|- scripts
|  |- setup-sut.js
|  |- generate-test-strategy-docx.js
|- tests
|  |- api/reservations.api.spec.js
|  |- integration/reservations.integration.spec.js
|  |- e2e/reservations.ui.spec.js
|- docs
|  |- Test-Strategy-Group-6-Reservations.md
|  |- Test-Strategy-Group-6-Reservations.docx
|- .github/workflows/ci.yml
|- package.json
|- playwright.config.js
```

### 5.2 Architecture diagram

```text
Playwright API tests -----------\
Playwright integration tests ----> shared helpers -> HTTP -> Library Management System -> SQLite file DB
Playwright UI/E2E tests --------/

GitHub Actions -> checkout -> install deps -> clone pinned SUT -> run suite -> publish HTML and JUnit reports
```

### 5.3 Test data management

The suite does not rely on fixed seed ids for business-rule scenarios. Instead, each test creates its own books, members, loans, and reservations through public APIs. Unique ISBNs and email addresses are generated automatically by helpers so that test cases remain independently runnable.

The seeded data is still useful for smoke checks such as the list endpoint, but not for most business-rule tests. The seed script inserts a large amount of data and even includes direct `ready` and `cancelled` reservation states. That makes seed-only assertions weaker than freshly created domain-specific fixtures.

### 5.4 Test isolation

The SUT stores its database in memory after startup and persists changes to a file. Because of this architecture, running `seed.js` alone is not enough to reset the already running server. The suite therefore resets the database and restarts the SUT before each spec file. Within each spec, every test still creates unique data so that no test depends on the order or outcome of another test.

### 5.5 Shared helpers and fixtures

The helper modules provide:

- deterministic SUT startup and shutdown on a dedicated port
- automatic SUT cloning and dependency installation
- API-level creation of books, members, loans, and reservations
- reusable scenario builders for `pending`, `ready`, and max-limit reservation states

## 6. CI/CD Integration

### 6.1 Selected platform

GitHub Actions was selected because it keeps the workflow definition inside the repository, is easy to review, and provides straightforward artifact upload for HTML and JUnit reports.

### 6.2 Trigger and runner strategy

The workflow runs on every push and pull request to `main` and `master`. Cloud-hosted Ubuntu runners were chosen because they are simple to provision and work well with Playwright's browser installation flow.

### 6.3 Pipeline flow

```text
git push
  -> checkout repository
  -> npm ci
  -> install Chromium for Playwright
  -> clone and pin official SUT commit
  -> install SUT dependencies
  -> generate Word strategy document
  -> run full automated suite
       -> seed and restart the SUT per spec file
  -> upload Playwright HTML report
  -> upload JUnit XML and failure artifacts
```

### 6.4 Reporting

The pipeline publishes:

- Playwright HTML report for human-readable execution details
- JUnit XML for machine-readable test reporting
- traces screenshots and videos for failed UI tests
- the generated Word strategy document as an artifact

Pipeline run URL for submission: add the first successful hosted GitHub Actions run URL here after pushing the repository.

### 6.5 How the application is started in CI

The workflow prepares the pinned SUT clone first. The individual test specs then call shared lifecycle helpers that seed the database and start the SUT on port 3100 before the spec runs. This keeps the CI definition simple while preserving deterministic test state.

## 7. Challenges and Lessons Learned

The largest practical challenge was that the initial workspace contained assignment material but no actual submission repository. The test project, automation structure, and CI pipeline therefore had to be created from scratch before the reservation logic itself could be automated.

The second challenge was that reservations are not isolated from the rest of the application. To test Group 6 properly, we had to create realistic preconditions through Books, Members, and Loans APIs. This increased setup effort but also improved the realism of the suite.

The third challenge was deterministic state management. Because the SUT loads the database into memory on startup, a plain reseed is not enough for reset. Restarting the SUT per spec file was the most reliable solution that still keeps execution time acceptable.

### 7.1 Known limitations and open issues

- The suite is intentionally single-browser and runs only on Chromium.
- The suite does not measure performance or concurrency under load.
- During exploratory analysis, one cross-domain limitation was observed: once a reservation is promoted to `ready`, the broader system still keeps `availableCopies` at 0 and the normal borrow endpoint continues to reject new borrowing. This behavior was documented as an observed system limitation, but it is outside the pass criteria of the dedicated Group 6 suite.

### 7.2 What we would improve with more time

- add additional UI coverage for member-detail and book-detail reservation cancellation paths
- add a second workflow job for scheduled nightly regression runs
- add a lightweight presentation dashboard or badges for quicker instructor review
- extend exploratory checks around the interaction between ready reservations and subsequent borrowing

## 8. Conclusion

The final submission emphasizes high-value business-rule automation for the Reservations domain while still meeting the assignment's broader delivery requirements. The suite covers API behavior, integration-sensitive reservation flows, negative and boundary cases, and representative browser tests. The repository also includes deterministic SUT setup, CI reporting, and a maintainable strategy document so that a new team member can understand, run, and extend the solution without additional undocumented steps.
