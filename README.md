# Group 6 Reservations Test Automation

Automated submission repository for the **FHB MCCE Test Automation** group assignment.

Team members: Josefine Malek-Matous, Phillip Fuhrmann, Manuel Nussbaumer

This repository covers **Group 6: Reservations** for the Library Management System SUT and includes:

- a Playwright-based automated test suite
- API, integration, and UI/E2E coverage
- a GitHub Actions pipeline with HTML and JUnit reporting
- a test strategy document in Markdown and Word format

## Scope

Covered endpoints:

- `GET /api/reservations`
- `GET /api/reservations/:id`
- `POST /api/reservations`
- `POST /api/reservations/:id/cancel`

Covered business rules:

- reservations are allowed only when `availableCopies === 0`
- members cannot reserve a book they already have on active loan
- members cannot hold more than one active reservation for the same book
- members may hold at most **3 active reservations** across `pending` and `ready`
- inactive members cannot create reservations
- `pending` and `ready` reservations can be cancelled
- cancelling an already cancelled reservation returns `409`

## Prerequisites

- Node.js 18 or newer
- npm
- Git

## Repository layout

```text
.
├── .github/workflows/ci.yml
├── docs/
│   ├── Presentation-Outline.md
│   ├── Test-Strategy-Group-6-Reservations.docx
│   └── Test-Strategy-Group-6-Reservations.md
├── helpers/
│   ├── api.js
│   └── sut.js
├── scripts/
│   ├── generate-test-strategy-docx.js
│   └── setup-sut.js
├── tests/
│   ├── api/reservations.api.spec.js
│   ├── e2e/reservations.ui.spec.js
│   └── integration/reservations.integration.spec.js
├── package.json
└── playwright.config.js
```

## Setup

Install the test-suite dependencies:

```bash
npm install
```

Clone and pin the SUT locally:

```bash
npm run setup:sut
```

The setup script clones the official SUT into `.sut/library-management-system` and pins it to commit `1f431df5e48dcfc936729851a80a65d1f6c6db50` for deterministic execution.

## How to start the SUT

The tests start and stop the SUT automatically.

If you want to inspect the application manually, use:

PowerShell:

```bash
$env:PORT=3100
npm --prefix .sut/library-management-system run seed
npm --prefix .sut/library-management-system start
```

Bash:

```bash
PORT=3100 npm --prefix .sut/library-management-system run seed
PORT=3100 npm --prefix .sut/library-management-system start
```

Manual URLs:

- App UI: `http://127.0.0.1:3100` after starting with `PORT=3100`
- Swagger UI: `http://127.0.0.1:3100/api-docs`

## How to run the full test suite

```bash
npm test
```

## How to run a single test or test group

Run only the API and integration layers:

```bash
npm run test:api
```

Run only the UI/E2E layer:

```bash
npm run test:ui
```

Run a single spec file:

```bash
npx playwright test tests/integration/reservations.integration.spec.js
```

Run a single test by title:

```bash
npx playwright test -g "G6-RES-API-13"
```

## How to read the test report

After a run, open the Playwright HTML report:

```bash
npm run test:report
```

Generated artifacts:

- `playwright-report/` for the HTML report
- `test-results/results.xml` for JUnit output
- `test-results/artifacts/` for traces, screenshots, and videos on failure

## Strategy document

The editable source lives in:

- `docs/Test-Strategy-Group-6-Reservations.md`

Generate the Word version with:

```bash
npm run build:docs
```

## CI/CD

The GitHub Actions workflow in `.github/workflows/ci.yml` runs on every push or pull request to `main` and `master`.

The pipeline:

- installs the test-suite dependencies
- installs Chromium for Playwright
- prepares the pinned SUT clone
- generates the Word strategy document
- executes the full automated suite, which seeds and starts the SUT automatically per spec file
- uploads HTML and JUnit results as build artifacts
