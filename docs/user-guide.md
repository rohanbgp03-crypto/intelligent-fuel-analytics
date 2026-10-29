# Demonstration and user guide

1. Start MongoDB, Python and Node services following the main README; open the client.
2. Register an account with your own email and password. Or explicitly configure and run the synthetic seed and sign in with your chosen seed credentials.
3. Add a vehicle with name, type, fuel type and odometer. Engine capacity and weight are needed for predictions.
4. Add a trip. Enter distance, consumed fuel and recorded price. Choose measured only if directly measured; otherwise choose estimated. Optional start/end odometers must agree with distance. Optional duration includes idling; idle minutes cannot exceed duration.
5. Add refills separately. Choose full tank only when completely filled. For a demonstration, create a full refill at odometer 1000, a partial 5 L at 1100 and a full 10 L at 1200. The completed interval uses 15 L over 200 km. Opening full-refill litres are excluded.
6. Use dashboard filters. Purchase expenditure comes from refills; trip cost comes from consumed fuel. Do not add them as though they were different spending categories.
7. Explore Analytics. Weekly labels are Monday dates. Conditions need three matching observations per category. Recommendations need the documented thresholds.
8. Open ML Predictor. Enter conditions, select an eligible vehicle, calculate and read the experimental warning. Optionally select a measured trip; recorded conditions prefill and must match. Inspect actual model metrics and grouped holdout details. Prediction history is stored under your account.
9. Use Cost Calculator independently of the ML service. For 120 km at 15 km/L and ₹105/L, results are 8 L, ₹840 and ₹7/km.
10. Open Reports, choose filters and export CSV. Print / Save PDF uses the browser's print dialog. The report states when only the latest 100 predictions are included; trip CSV covers every match up to the 10,000 analytical limit.
11. Settings changes dashboard/trip efficiency display, profile name and in-app recommendations. Currency remains INR; chart/report units are explicitly labelled. Password changes revoke all sessions.
12. Log out. Another account cannot access your records, including by inserting an ID in an API URL.

Editing a trip unlinks old actual-versus-predicted comparisons because the observation changed. Deleting vehicles with dependent history is blocked; delete related trips, refills and predictions first. Export important data before deletions. No undo, account recovery or live telemetry is provided.
