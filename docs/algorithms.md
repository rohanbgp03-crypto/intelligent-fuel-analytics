# Algorithms and interpretation

## Calculations
Mileage = distance/fuel; L/100 km = fuel/distance×100; trip-implied cost = fuel×recorded price; cost/km = cost/distance. Aggregated mileage uses total distance / total fuel, never the unweighted average of individual mileage values. Zero/negative denominators are rejected. Empty summaries return null for undefined efficiency, not fabricated zero efficiency.

Trip fuelSource is required: measured or estimated. Both may be analysed, with the counts visible. Refuelling purchases are separately aggregated and never added to trip consumption totals. Price is historical per record, not a current live fuel price feed.

## Full-tank intervals
Group logs by vehicle and order by date/odometer. Ignore logs until the first full tank. After that anchor, accumulate every partial and full refill. On a closing full tank, calculate distance from odometer difference and fuel from accumulated litres, excluding the opening fill. Reset the anchor. Incomplete/zero-distance intervals produce no efficiency result. An interval is only shown when both anchors are in the selected date range. Fill consistency, spillage and odometer errors remain limitations.

## Recommendation rules
- At least 3 trips with reliable idle values and mean idling >=10 minutes: review idling.
- At least 6 measured trips: compare latest 3 weighted mileage with all earlier measured trips. A drop below 80% triggers review.
- At least 4 measured trips: latest trip below 75% of the earlier weighted mileage triggers an unusual-consumption alert.
- Otherwise show an insufficient-evidence / build-baseline message.

Rules are per vehicle and selected records, include evidence/action/severity/date, and do not infer theft or fault. Conditions are compared only when a category has at least 3 trips. Different vehicles/routes may confound these comparisons.

## Machine learning
Target is km/L. Features are engine capacity, weight, distance, average speed, idle time, vehicle type, fuel type, traffic and road. Vehicle_id is a grouping variable only. There is no target-derived historical mileage feature. Cleaning and range checks are in preprocessing.py; medians/modes and one-hot encodings are fitted inside the training pipeline.

GroupShuffleSplit with seed 42 holds out 20% of distinct vehicles. RandomForestRegressor uses 150 trees and min_samples_leaf=3. Mean-prediction DummyRegressor is the baseline. MAE = mean absolute error; RMSE = square root of mean squared error; R² can be negative and is undefined for a constant target. Saved metadata records actual executed results. The saved model is the training-partition model and is not refitted on held-out vehicles. Restart Python after retraining.

API inputs are validated with Pydantic and bounded to supported physical input ranges. Inputs beyond observed training ranges generate warnings; hard schema violations are rejected. Returned fuel requirement = trip distance / predicted km/L; the Node/API client derives cost from the user-entered price. Test error is not a confidence interval.

Synthetic results are experimental. Future measured-data work should add chronological validation, subgroup errors, independent calibration and realistic route/weather/load features. Grouped splitting avoids same-vehicle leakage but does not establish real-world generalisation from synthetic data.
