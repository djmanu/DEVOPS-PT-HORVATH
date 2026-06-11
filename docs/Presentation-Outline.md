# Group 6 Reservations Presentation Deck

Use the FH template and `Tahoma` for the final slide deck.

Team members: Josefine Malek-Matous, Phillip Fuhrmann, Manuel Nussbaumer

Successful workflow run for the live demo:
`https://github.com/djmanu/DEVOPS-PT-HORVATH/actions/runs/27313694575`

## Slide 1 - Title and Objective

Time: 0:30

- FHB MCCE Test Automation
- Group 6 - Reservations
- Topic: test strategy, automation, and CI/CD for the reservation domain
- Objective: show how the suite verifies the highest-risk reservation rules end to end

Speaker notes:
- Start with the assignment scope and the goal of the presentation.
- Keep this slide short and move quickly into the domain.

## Slide 2 - Domain and Risks

Time: 1:30

- The reservation domain manages the waiting list for books that are currently unavailable
- Scope: list, lookup, create, and cancel reservations
- Core business rules: book must be unavailable, member must be active, no active loan for the same book, no duplicate active reservation, maximum 3 active reservations
- Main risk: reservation behavior depends on books, members, and loans at the same time

Speaker notes:
- Explain that the endpoint set looks small, but the rule complexity is high.
- Emphasize why cross-domain setup matters for reliable testing.

## Slide 3 - Test Strategy and Tool Choice

Time: 2:30

- API-first approach with three levels: API, integration, and UI/E2E
- Test design techniques: equivalence partitioning, boundary value analysis, and state-transition testing
- Priority: reservation creation rules, cancellation conflicts, and critical UI smoke paths
- Playwright was chosen because it supports API and browser automation in one toolchain with shared reporting

Speaker notes:
- Map each technique to a concrete reservation rule.
- Mention that unit tests were not the focus because the assignment targets black-box behavior of the provided SUT.

## Slide 4 - Coverage and Evidence

Time: 2:30

- Total suite size: 21 tests
- Distribution: 16 API tests, 2 integration tests, 3 UI/E2E tests
- Covered categories: positive, negative, boundary, and cross-domain scenarios
- CI artifacts: Playwright HTML report, JUnit XML, raw failure artifacts, generated strategy document

Speaker notes:
- Use this slide as proof that the strategy was implemented, not only planned.
- Transition from coverage into the live demo.

## Slide 5 - Live Demo

Time: 8:00

- Show the successful GitHub Actions run and uploaded artifacts
- Open `tests/api/reservations.api.spec.js` and `tests/e2e/reservations.ui.spec.js`
- Walk through one positive case: `G6-RES-API-05`
- Walk through one negative case: `G6-RES-API-06`
- Walk through one boundary case: `G6-RES-API-13`
- Briefly explain the UI proof point `G6-RES-UI-03` and where the application startup is triggered during the pipeline run

Speaker notes:
- Start with the green pipeline run.
- Then open the code and explain the intent behind each assertion, not just the HTTP status.
- If a live rerun is too risky, use the existing workflow run and Playwright report as fallback evidence.

## Slide 6 - Architecture and CI/CD

Time: 3:00

- Repository structure separates tests, helpers, scripts, docs, and workflow definition
- Shared helpers create books, members, loans, and reservations through public APIs with unique data
- The workflow prepares a pinned SUT clone and runs the full suite on every push to `main` and `master`
- The pipeline starts the application through `npm test`: shared lifecycle helpers reseed the database, start the SUT on port 3100, and stop it again after the spec
- Stability choices: single worker, Chromium only, retained traces, screenshots, and videos on failure

Speaker notes:
- Explicitly show `.github/workflows/ci.yml`, `helpers/sut.js`, and one spec file.
- Call out that app startup is handled in the test lifecycle, not as a separate explicit shell step in the workflow.

## Slide 7 - Reflection and Next Steps

Time: 2:00

- Main challenge: the submission repository, automation structure, and CI pipeline had to be built from scratch
- Reservation testing required realistic setup across books, members, loans, and reservations
- Deterministic isolation required reseeding and restarting the SUT per spec file
- Known limitations: Chromium only, no performance or concurrency tests, smoke-level UI coverage
- With more time: extend UI paths, add broader nightly regression coverage, and deepen exploratory checks around `ready` reservations

Speaker notes:
- Close with what was learned and what would be improved next.
- Keep the limitations honest and short.
