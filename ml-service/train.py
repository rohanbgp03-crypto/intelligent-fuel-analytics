"""Train from documented synthetic development data or a user-provided CSV."""
import argparse
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from preprocessing import ROOT, FEATURES, NUMERIC, preprocessing, synthetic_data, clean_data

def scores(actual, predicted):
    return {'mae': float(mean_absolute_error(actual, predicted)), 'rmse': float(np.sqrt(mean_squared_error(actual, predicted))), 'r2': float(r2_score(actual, predicted)) if np.var(actual) > 0 else None}

def train(csv_path=None, source='synthetic development data', output_dir=None):
    if csv_path and source == 'synthetic development data':
        raise ValueError('Supply --source describing the provenance of your CSV')
    raw = pd.read_csv(csv_path) if csv_path else synthetic_data()
    df = clean_data(raw)
    if len(df) < 100 or df.vehicle_id.nunique() < 5:
        raise ValueError('Need at least 100 valid rows across 5 distinct vehicles')
    tr, te = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=42).split(df, groups=df.vehicle_id))
    train_df, test_df = df.iloc[tr], df.iloc[te]
    assert set(train_df.vehicle_id).isdisjoint(set(test_df.vehicle_id))
    model = Pipeline([('preprocess', preprocessing()), ('regressor', RandomForestRegressor(n_estimators=150, min_samples_leaf=3, random_state=42, n_jobs=-1))])
    model.fit(train_df[FEATURES], train_df.mileage)
    predicted = model.predict(test_df[FEATURES])
    baseline = DummyRegressor(strategy='mean').fit(train_df[FEATURES], train_df.mileage)
    metadata = {'model': 'RandomForestRegressor', 'target': 'fuel efficiency (km/L)', 'dataset_source': source,
        'experimental': csv_path is None, 'seed': 42, 'split': 'GroupShuffleSplit by vehicle_id; 80/20 vehicle holdout',
        'rows_before_cleaning': len(raw), 'rows': len(df), 'train_rows': len(tr), 'test_rows': len(te),
        'train_vehicles': train_df.vehicle_id.nunique(), 'test_vehicles': test_df.vehicle_id.nunique(),
        'group_overlap': False, 'metrics': scores(test_df.mileage, predicted),
        'baseline_metrics': scores(test_df.mileage, baseline.predict(test_df[FEATURES])),
        'ranges': {c: [float(train_df[c].min()), float(train_df[c].max())] for c in NUMERIC},
        'test_examples': [{'actual': float(a), 'predicted': float(p)} for a,p in zip(test_df.mileage.iloc[:60], predicted[:60])],
        'limitations': ['Synthetic development metrics are not empirical real-world accuracy.', 'No traffic causation, live telemetry or confidence interval is established.', 'Grouped holdout prevents shared vehicle IDs; future-time validation is still needed.', 'Predictions depend on dataset coverage and measurement quality.']}
    # Keep the evaluated training-only model; do not silently refit on the test partition.
    out = output_dir or ROOT / 'models'
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, out / 'fuel_model.joblib')
    (out / 'metadata.json').write_text(json.dumps(metadata, indent=2))
    if not csv_path:
        raw.to_csv(ROOT.parent / 'data' / 'synthetic_training.csv', index=False)
    return metadata

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--csv');p.add_argument('--source',default='synthetic development data');args=p.parse_args()
    print(json.dumps(train(args.csv,args.source),indent=2))
