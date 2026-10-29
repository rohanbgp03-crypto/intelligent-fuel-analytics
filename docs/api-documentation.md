# REST API

Base: `/api`. JSON request/response except CSV export. Authentication uses the `ifca_session` HttpOnly cookie; use credentials: include in a browser. Development client proxies /api to port 3001. Error shape: `{"error":{"message":"Readable error"}}`.

| Method | Route | Behaviour |
|---|---|---|
| GET | /health | Database readiness, 200 or 503; public |
| POST | /auth/register | name, email, password (10–128 characters); creates session, 201 |
| POST | /auth/login | email, password; sets session cookie |
| POST | /auth/logout | Revokes current session and clears cookie |
| GET | /auth/me | Public account fields and settings |
| PUT | /auth/password | currentPassword, newPassword; revokes every session |
| PUT | /settings | name, currency=INR, efficiencyUnit=km/L or L/100km, notifications boolean |
| GET / POST | /vehicles | List owned vehicles / create one |
| GET / PUT / DELETE | /vehicles/:id | Read / replace / delete owned vehicle; delete rejects history |
| GET / POST | /trips | Filtered, sorted, paginated list / create |
| GET / PUT / DELETE | /trips/:id | Read / replace / delete; changes unlink prediction actual comparisons |
| GET / POST | /fuel-logs | Filtered, paginated list / create |
| PUT / DELETE | /fuel-logs/:id | Replace / delete owned refill |
| GET | /analytics/summary | Totals, estimates count, monthly rate projection, recent trips and rules |
| GET | /analytics/fuel-efficiency | Daily/weekly/monthly aggregates, completed tank intervals, condition comparisons and distribution |
| GET | /analytics/fuel-costs | Daily purchase and trip-implied cost aggregates |
| GET | /analytics/vehicle-comparison | Per-vehicle aggregates for the selected period |
| GET | /recommendations | Computed evidence-based rules |
| GET | /predictions/model | Proxied Python model metadata and measured test metrics |
| POST | /predictions/fuel-efficiency | Validated inputs → Python → persisted prediction; 201 |
| GET | /predictions/history | Owner-filtered, paginated history |
| DELETE | /predictions/:id | Delete owned prediction snapshot |
| GET | /reports/monthly | Selected monthly expenditure and efficiency |
| GET | /reports/export | Owner-filtered CSV of trips, formula-safe quoted cells |

## Filters and pagination
Supported keys: vehicle (24-character ObjectId), from/to (YYYY-MM-DD inclusive), page (>=1), limit (1–100; default 15). Trips additionally use q (vehicle/date/notes), sort=date|distance|cost|efficiency and order=asc|desc (default desc). Unknown query keys are rejected. Reversed/invalid dates are rejected. Lists return items, total, page and limit. Prediction dates filter createdAt; trip/refill dates filter their calendar dates. Trip lists, analytics and CSV reject more than 10,000 matching records rather than silently truncating. Vehicle lists are for small fleets and are not paginated.

## Example request bodies
```json
{"name":"My hatchback","type":"car","fuelType":"petrol","engineL":1.2,"weightKg":1050,"odometer":10000}
```
```json
{"vehicle":"<owned ObjectId>","date":"2026-10-29","distanceKm":120,"fuelL":8,"fuelSource":"measured","pricePerL":105,"avgSpeed":60,"idleMinutes":10,"traffic":"light","road":"mixed"}
```
```json
{"vehicle":"<owned ObjectId>","date":"2026-10-29","litres":25,"pricePerL":105,"odometer":10120,"fullTank":true,"station":"Optional station"}
```
```json
{"vehicle":"<owned ObjectId>","distanceKm":120,"avgSpeed":60,"idleMinutes":10,"traffic":"light","road":"mixed"}
```
An optional tripId links an owned trip from the same vehicle; recorded conditions must match submitted conditions. Only measured trip fuel creates an actualMileage comparison. Python input uses server-owned vehicle type, engine, weight and fuel type, so clients cannot forge another vehicle's attributes.

Numeric ranges and field enums are authoritative in server/src/validation.js. Missing optional conditions are omitted, not silently fabricated. Refills do not auto-create trips. PUT expects the complete form resource, not a partial patch; omitted optional trip/refill fields are cleared.

## Status codes
200 success; 201 created; 400 validation/inconsistent data; 401 missing or expired session; 403 disallowed browser origin; 404 missing or foreign record; 409 duplicate/dependency conflict; 413 body limit; 415 non-JSON nonempty body; 422 prediction input limits / too many analytical records; 429 auth limit; 502 invalid upstream prediction; 503 unavailable database/model service. Unexpected failures return a generic 500 message without stack traces or secrets.

FastAPI internal endpoints: GET /health, GET /metadata, POST /predict. Its generated schema is at http://127.0.0.1:8001/docs. It loads only trusted local model files. It should be reachable only by the API in production; authentication is enforced at the Node boundary.
