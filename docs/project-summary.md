# Academic project summary

## Proposed system
IFCA is a full-stack application that stores user-owned vehicle, trip and refuelling records and produces descriptive fuel analytics. A separate Python service supplies experimental machine learning estimates, with transparent model evaluation and limitations. The frontend presents calculations, comparisons and reports with explicit units and data provenance.

## Modules
Account/session management; vehicle registry; trip management; refuelling; analytics aggregation; full-tank intervals; regression prediction; rule recommendations; calculator; reports/export; settings. Implementation is separated across frontend pages/reusable UI, API/models/validation/analytics and Python training/inference.

## Testing
See testing.md and captured logs. Results are based on executed commands. Real temporary MongoDB instances exercise ownership and persistence. A separate live integration test connects Express to FastAPI and a saved sklearn model. Browser testing of the multi-service version remains limited by the managed preview environment and is not claimed as passed.

## Future scope
Acquire documented measured data with permission; evaluate future dates and unseen fleets; investigate subgroup fairness across vehicle categories; calibrate uncertainty; add route/gradient/weather data; add optional OBD telemetry, account recovery and email verification; harden deployment and transactional writes; conduct usability and load testing.

## Conclusion
The implementation demonstrates a coherent path from validated fuel records to reproducible calculations, conditional recommendations and honestly labelled ML predictions. Its present predictive evidence is synthetic and developmental. The project is suitable for demonstrating software architecture and analytical methodology; operational vehicle decisions require measured validation and deployment work.
