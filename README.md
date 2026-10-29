# Intelligent Fuel Consumption Analytics (IFCA)

A CSE full-stack project: React + TypeScript + Vite frontend, Express REST API, MongoDB persistence with Mongoose, and a Python FastAPI/scikit-learn prediction service. This version implements the attached project specification as a local multi-service application. It is separate from the earlier browser-only FuelScope demo.

## Abstract
Fuel records are often fragmented across trip notes, refill receipts and vehicle histories. IFCA brings these records into an authenticated workspace, calculates consumption and expenditure, and displays trends and conditional recommendations. A separately evaluated Random Forest model exposes experimental efficiency predictions. Measured and estimated trip fuel remain explicitly distinguished; refill purchases are never assumed to equal a single trip's consumption.

## Problem statement and objectives
Users need a consistent way to compare vehicle efficiency, understand fuel expenditure and inspect changes over time. The system aims to organise vehicle, trip and refuelling records; compute transparent fuel metrics; support evidence-based comparisons; estimate planned journey consumption; and export user-owned results. It does not collect live telemetry or establish the causes of efficiency changes.

## Implemented features
- Landing page; registration, login, logout and protected workspace.
- bcrypt password hashing, server-side hashed random-token sessions, HttpOnly cookies, seven-day expiry, logout revocation and all-session revocation on password changes.
- Owner-isolated vehicle CRUD, trip CRUD with details/search/sort/pagination, and refuelling CRUD.
- Optional odometers; calendar-date and numeric validation; duplicate trip/refill handling; chronological refill odometer consistency.
- Separate measured/estimated trip fuel labels, per-trip price history and automatic purchase totals.
- Full-tank-to-full-tank intervals that accumulate partial refills correctly.
- Dashboard and analytics: efficiency, L/100 km, cost trends, vehicle comparisons, weekly/monthly groupings, trip efficiency distribution and conditional driving-condition comparisons.
- Global date filters (all/7/30/90/custom) and vehicle filters. Filters use today's date, not the latest record date.
- Rule recommendations with evidence, action, priority and generation date; no unproven causal claims.
- Python Random Forest prediction; grouped vehicle holdout, preprocessing pipeline, mean baseline, MAE/RMSE/R² and saved model.
- Node-to-Python API connection, saved prediction history and optional measured actual-versus-predicted comparison.
- Independent fuel-cost calculator with formulas.
- Owner-filtered CSV trip export, monthly/vehicle/prediction reports and a print stylesheet for browser Print / Save as PDF.
- Profile, preferred efficiency units, INR currency display, in-app recommendation preference and password changes.
- Tests, example environment file, container configuration, seed workflow and documentation.

## Technology and structure
```text
intelligent-fuel-analytics/
  client/src/
    pages/             # Each application page
    App.tsx            # Routes and initial account state
    layout.tsx         # Sidebar, navigation and workspace shell
    state.tsx          # Typed shared account/filter state
    hooks.ts           # Data loading with stale-response protection
    components.tsx     # Charts, forms, filters, export and reusable UI
    workspace.tsx      # Shared workspace UI
    api.ts             # Credentialled API client
    utils.ts           # Calculator and presentation helpers
  server/src/
    app.js             # REST endpoints, ownership checks and middleware
    models.js          # Mongoose schemas and indexes
    validation.js      # Zod request validation
    analytics.js       # Calculations, grouping, tank intervals and rules
    index.js           # Database connection and server startup
    seed.js            # Opt-in synthetic development records
  server/tests/        # MongoDB integration, calculations and live ML tests
  ml-service/
    preprocessing.py   # Features, cleaning and synthetic generator
    train.py           # Grouped training/evaluation and serialization
    app.py             # Validated FastAPI prediction API
    models/            # Trained model and honest evaluation metadata
    tests/             # Pytest checks
  data/                # Documented synthetic training dataset
  docs/                # Architecture, API, database, user guide and test logs
  scripts/demo.mjs     # Optional disposable real-MongoDB demo launcher
```

## Prerequisites
- Node.js 24 LTS and npm (tested with Node 24.22.1).
- Python 3.12 (tested with Python 3.12.14).
- MongoDB 7 or later, running locally, or a compatible MongoDB Atlas URI.
- Alternatively, Docker with Compose for the included local container setup.
- Internet access for initial dependency installation. Tests/disposable demo may download an official MongoDB binary on first use.

## Quick start: persistent local setup
Open a terminal in the extracted project folder:
```bash
npm ci
python -m venv .venv
```
Activate the virtual environment:
```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate
```
Then:
```bash
python -m pip install -r ml-service/requirements.txt
python ml-service/train.py
```
Copy `.env.example` to `.env` using your file manager (or `cp .env.example .env` on macOS/Linux, `Copy-Item .env.example .env` in PowerShell). Configure:
```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/ifca
API_PORT=3001
CLIENT_ORIGIN=http://localhost:5173
ML_SERVICE_URL=http://127.0.0.1:8001
NODE_ENV=development
```
Start MongoDB according to your local installation. For Atlas, replace MONGODB_URI with your connection URI, keep credentials out of source control, configure access for your deployment and URL-encode credential characters. Use a database-scoped account in a real deployment.

Start the application:
```bash
npm run dev
```
Open **http://localhost:5173**. Create your own account. There are no hardcoded login credentials. `npm run dev` starts the Express API, Vite client and Python service together; it expects MongoDB to be running.

To start each service separately, use three terminals with the Python environment activated:
```bash
npm run dev -w server
npm run dev -w client
python -m uvicorn app:app --app-dir ml-service --host 127.0.0.1 --port 8001
```
`http://127.0.0.1:8001/docs` exposes the local FastAPI schema.

### Optional disposable demo (no separately installed MongoDB)
```bash
npm run demo
```
This launcher starts a **real temporary MongoDB process**, API, frontend and Python service. Register in the UI. It is for local development only; records are lost when the demo stops. It never substitutes a fake database. Stop it with Ctrl+C. It requires the Node and Python dependencies above and an available compatible MongoDB binary/download.

### Optional synthetic seed
Set your own `SEED_EMAIL` and `SEED_PASSWORD` (at least 10 characters) in `.env`. With persistent MongoDB available:
```bash
npm run seed
```
The seed creates a labelled synthetic account dataset: 3 vehicles, 90 **estimated synthetic** trips, 27 synthetic refills. It never overwrites an account that already has vehicles, never prints the password and refuses to run in production. `npm run demo` also runs the seed when both variables are supplied. Data collection examples are separate from the ML training dataset.

## Environment variables
| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection URI; default local `ifca` database |
| `API_PORT` | API port, default 3001; takes precedence over host `PORT` |
| `CLIENT_ORIGIN` | Exact allowed browser origin, default http://localhost:5173 |
| `ML_SERVICE_URL` | Internal Python-service base URL, default http://127.0.0.1:8001 |
| `NODE_ENV` | development or production; production enables Secure cookies and static client serving |
| `SERVE_CLIENT` | `true` serves built client from Express; used in local Compose |
| `SEED_EMAIL`, `SEED_PASSWORD` | Opt-in development seed account |
| `MONGO_USERNAME`, `MONGO_PASSWORD` | Local Docker MongoDB credentials; choose a long URL-safe password |
| `PYTHON_BIN` | Optional Python executable for disposable demo and live ML tests |

No API key, JWT secret or cloud account is needed. Session credentials are cryptographically random server-generated tokens stored hashed in MongoDB. No credential is embedded in the client.

## Local Docker Compose alternative
Set MONGO_USERNAME and MONGO_PASSWORD in `.env` first. Use URL-safe password characters for the included interpolated connection URI.
```bash
docker compose up --build
```
Open **http://localhost:3001**. This is a **local development** Compose setup: ports bind to loopback, a named volume stores MongoDB data and the browser origin is localhost:3001. Container builds train the synthetic development model. Stop using `docker compose down`; retain the volume to retain records. Compose was supplied but Docker was unavailable for execution in the build environment, so its startup has not been verified here.

For public deployment, use HTTPS, NODE_ENV=production, exact CLIENT_ORIGIN, private MongoDB/ML networking, scoped database credentials, backups and a reverse proxy configured for your environment. Do not expose MongoDB or the Python service publicly. Secure cookies require HTTPS. The earlier static Sites host cannot run this MongoDB/Python/Express stack; it continues to host only the earlier browser-based demo.

## Machine learning
A trained development model is included. Retraining regenerates model artifacts:
```bash
python ml-service/train.py
```
To use your own appropriately licensed, documented data:
```bash
python ml-service/train.py --csv data/my_measured_trips.csv --source "Describe the dataset provenance and collection method"
```
Required columns are documented in [data/README.md](data/README.md). Cleaned rows must include at least 100 observations across at least 5 vehicle identifiers. Numerical missing inputs in training use medians; categorical missing inputs use modes. A `GroupShuffleSplit` holds out 20% of vehicle groups, not 20% of arbitrary trip rows. Preprocessing is fitted in the training pipeline. The test vehicles never appear in training. Mean mileage is the baseline. The saved model remains the evaluated training model; the test partition is not silently refitted. Restart FastAPI after retraining because model artifacts are cached.

The included synthetic data intentionally has fuel relationships built into its generator. Its metrics demonstrate the workflow, not measured real-world accuracy. See [docs/model-training-results.json](docs/model-training-results.json) for actual scores and [docs/algorithms.md](docs/algorithms.md) for limitations.

## Tests and build
Install both Node and Python requirements and train first. Then:
```bash
npm test
python -m pytest ml-service/tests -q
npm run build
```
`npm test` covers real temporary MongoDB integration, calculations, a real Node→FastAPI→saved-model→MongoDB prediction flow, and frontend utility tests. One API test uses an explicitly labelled ML test double to isolate persistence/ownership; the separate live test exercises the real Python service. Tests must not target your personal database; each integration suite creates its own disposable MongoDB instance. The live test needs port 8129 free. MongoDB must be able to run child processes; compatible binary downloads may be required.

Additional commands:
```bash
npm run lint
npm run format
npm start -w server
```
Build output is `client/dist/`. The server can serve it with NODE_ENV=production (HTTPS cookies) or SERVE_CLIENT=true for a local-only HTTP development setup.

Actual test/build logs are included under `docs/`. See [docs/testing.md](docs/testing.md) for the exact checks and verification boundaries. No unexecuted test is represented as passed.

## Fuel logic and interpretation
- Mileage = distance / consumed fuel (km/L).
- Consumption = consumed fuel / distance × 100 (L/100 km).
- Trip-implied cost = consumed fuel × that trip's recorded price.
- Purchase expenditure = refill litres × that refill's recorded price.
- Cost/km = trip-implied cost / distance.
- A monthly projection uses 30 × selected purchase expenditure / observed calendar span (inclusive). It is a rough rate projection, not a time-series forecast; a short span can be misleading.
- Full-tank consumption adds all refills after a full anchor through the next full refill, excluding the opening anchor. Incomplete intervals produce no efficiency claim. Both anchors must be included in the active filter. Tank-level estimates assume accurate fill levels and odometers and comparable refuelling practices.

## API documentation and project material
- [Architecture and data flow](docs/architecture.md)
- [API endpoints and validation](docs/api-documentation.md)
- [Database design](docs/database-schema.md)
- [Algorithms and limitations](docs/algorithms.md)
- [User guide](docs/user-guide.md)
- [Testing results](docs/testing.md)
- [Project summary, future scope and conclusion](docs/project-summary.md)

## Screenshots
No screenshot is passed off as verification of this full-stack version. The managed browser-preview environment could not start the multi-service stack. The client production build, MongoDB API flows and real Python connection were checked separately. Run the application locally and capture Dashboard, Vehicles, Fuel Log and ML Predictor for your submission; use the labelled synthetic seed if you have no measured data.

## Troubleshooting
- **Database unavailable / startup exits:** start MongoDB, check MONGODB_URI and credentials. Use `npm run demo` for a disposable local database when supported.
- **ML service unavailable:** activate the Python environment, install requirements, train and start FastAPI on 8001. The app does not fabricate predictions when it is down.
- **Python is named python3:** activate a virtual environment exposing `python`, start services manually or set PYTHON_BIN for the demo/live test.
- **Login does not persist:** keep browser/client/API on the documented same host through the Vite proxy. Match CLIENT_ORIGIN exactly. Production Secure cookies need HTTPS.
- **Empty charts:** add records or widen date filters. Last 7/30/90 days use today's date. Estimated and measured records are counted explicitly.
- **Vehicle cannot be deleted:** remove dependent trips, fuel logs and prediction records first. The API deliberately rejects orphan-producing deletion.
- **Linked prediction rejected:** recorded trip conditions must match entered conditions. Selecting a trip prefills its available fields; complete missing conditions manually.
- **Editing a trip removes its prediction comparison:** intentional; old prediction snapshots are preserved, but the actual link is removed to prevent stale comparisons.
- **More than 10,000 matching records:** narrow filters; analytical/report queries reject rather than silently truncate.
- **Tests cannot download/start mongod:** run where a MongoDB binary and child processes are supported. No mock fallback is silently enabled.
- **Docker initial startup race:** the app retries through Compose restart-on-failure while MongoDB initialises; inspect `docker compose logs`. Docker itself was not available for verification here.

## Known limitations and future scope
No real-world training data, telemetry/OBD integration, emails/push delivery, email verification, password recovery, self-service account deletion, CSV import, cloud hosting of this stack or currency conversion is included. CSV **export** is included. Trip and refill lists are paginated; vehicles are intended for small fleets. Query filters and exports are owner-isolated; analytical queries cap at 10,000 matches. Recommendation rules are descriptive and not diagnoses. Odometer reference values on vehicle profiles are manually maintained. Future work includes licensed measured datasets, chronological validation, calibration/uncertainty studies, optional telemetry ingestion and deployment hardening.
