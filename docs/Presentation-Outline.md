# Presentation Outline

## 20-minute flow

1. Domain intro
- explain that Group 6 covers reservation creation, lookup, list, and cancellation
- highlight the key risks: unavailable books, inactive members, duplicate reservations, and the max-3 active reservation limit

2. Test strategy
- explain the API-first approach
- mention equivalence partitioning, boundary value analysis, and state-transition testing
- explain why Playwright was chosen for both API and UI/E2E coverage

3. Live demo
- show the GitHub Actions workflow run and the uploaded Playwright report
- open `tests/api/reservations.api.spec.js` and `tests/e2e/reservations.ui.spec.js`
- demo one positive case: `G6-RES-API-05`
- demo one negative case: `G6-RES-API-06`
- demo one boundary case: `G6-RES-API-13`

4. Architecture
- show the repository structure
- explain helper-based test data creation
- explain why the suite reseeds and restarts the SUT per spec file

5. Reflection
- mention the empty initial workspace and the resulting need to build the submission repo from scratch
- mention cross-domain dependencies between reservations, loans, books, and members
- mention the observed ready-reservation limitation as a known system issue outside core Group 6 pass criteria
