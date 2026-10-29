# Executed verification

Executed on 29 October 2026 with Node 24.22.1 and Python 3.12.14. Raw logs are provided alongside this file.

| Check | Actual result | Scope |
|---|---|---|
| `npm test` server | 19 tests passed | Calculations (6), real MongoDB API integration (12), real Node→Python ML integration (1) |
| `npm test` client | 4 tests passed | Calculator, invalid denominators, empty formatting, optional form fields |
| `python -m pytest ml-service/tests -q` | 3 tests passed | Cleaning, grouped training/serialization, actual model prediction and input rejection |
| `npm run build` | Passed | TypeScript compilation and Vite production bundling |
| `npm run lint` | Passed | ESLint on frontend/backend source |

**26 automated tests passed** across these suites. These are not 26 browser tests. A Starlette/httpx deprecation warning was emitted by the Python test client; tests passed. The application uses the tested pinned dependency versions in requirements.txt and package-lock.json.

MongoDB originally failed to start when it attempted to use Unix sockets in this restricted environment. The disposable integration runner now starts real MongoDB over loopback TCP with `--nounixsocket` and disables optional diagnostic-data collection. It does not bypass authentication/ownership logic or substitute an in-memory JavaScript database. On normal developer machines, persistent MongoDB uses the configured connection URI.

API tests cover registration, password hashing/non-disclosure, session cookies, login/logout, all-session revocation after password change, invalid email/numeric/date/odometer input, rejected origins and injected query keys, vehicle CRUD, trip CRUD, refill editing/deletion, duplicate prevention, owner isolation for reads/writes/exports, sorted/paginated records, analytical formulas, partial-refill intervals, recommendations, reporting and unavailable ML service errors. A labelled service-double test isolates prediction persistence; a separate live test starts FastAPI and verifies the saved sklearn model response is stored in MongoDB.

## Model result (synthetic development data)
- 1,344 cleaned rows; 48 synthetic vehicles.
- Training: 1,064 rows from 38 vehicles.
- Test: 280 rows from 10 disjoint vehicles.
- Random Forest MAE: 1.156939 km/L; RMSE: 1.956718 km/L; R²: 0.970032.
- Mean baseline MAE: 8.832393 km/L; RMSE: 11.327028 km/L; R²: -0.004218.

These are executed synthetic holdout results, not real-world accuracy or a percentage-accuracy claim. Full metadata and representative held-out points are included in model-training-results.json.

## Verification boundaries
The managed browser preview could not start this MongoDB/Python/Node multi-service application. Consequently browser interaction, responsive rendering and print/PDF output of this version have not been end-to-end verified here. The React client compiled successfully, and server/ML workflows were executed through automated tests. The earlier browser-only FuelScope screenshot does not verify this version.

Docker was not available; Dockerfiles/Compose are provided but have not been built/run here. Production deployment, load testing, independent measured-data model validation, accessibility audits and disaster recovery are not claimed as completed. Run the user-guide demonstration locally before your final college submission.
