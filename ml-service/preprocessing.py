from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent
NUMERIC = ['engine_l', 'weight_kg', 'distance_km', 'avg_speed', 'idle_minutes']
CATEGORICAL = ['vehicle_type', 'fuel_type', 'traffic', 'road']
FEATURES = NUMERIC + CATEGORICAL

def preprocessing():
    return ColumnTransformer([
        ('numbers', SimpleImputer(strategy='median'), NUMERIC),
        ('categories', Pipeline([('imputer', SimpleImputer(strategy='most_frequent')), ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))]), CATEGORICAL),
    ])

def synthetic_data(seed=42, vehicles=48, trips=28):
    rng = np.random.default_rng(seed)
    rows = []
    types = ['car', 'suv', 'motorbike', 'van', 'truck']
    for i in range(vehicles):
        kind = types[i % len(types)]
        engine, weight = {'car': (1.4, 1100), 'suv': (2, 1700), 'motorbike': (.2, 160), 'van': (2.4, 2100), 'truck': (5, 6500)}[kind]
        engine *= rng.uniform(.88, 1.14)
        weight *= rng.uniform(.88, 1.14)
        fuel = 'petrol' if kind == 'motorbike' else ['petrol', 'diesel', 'hybrid'][i % 3]
        for _ in range(trips):
            distance, speed, idle = rng.uniform(10, 350), rng.uniform(15, 115), rng.uniform(0, 40)
            traffic, road = rng.choice(['light', 'moderate', 'heavy']), rng.choice(['city', 'highway', 'mixed'])
            rate = 1.2 + engine * 1.6 + weight * .0012 + ((speed - 65) / 35) ** 2 * .65
            rate += {'light': 0, 'moderate': .6, 'heavy': 1.5}[traffic] + {'city': .7, 'highway': 0, 'mixed': .3}[road]
            rate *= {'petrol': 1, 'diesel': .89, 'hybrid': .79}[fuel]
            fuel_used = distance * rate / 100 + idle * .008 + rng.normal(0, .12)
            fuel_used = max(distance * .01, fuel_used)
            rows.append(dict(vehicle_id=f'synthetic-{i:03}', vehicle_type=kind, fuel_type=fuel, engine_l=engine,
                             weight_kg=weight, distance_km=distance, avg_speed=speed, idle_minutes=idle,
                             traffic=str(traffic), road=str(road), mileage=distance / fuel_used))
    return pd.DataFrame(rows)

def clean_data(frame):
    required = FEATURES + ['vehicle_id', 'mileage']
    missing = set(required) - set(frame.columns)
    if missing:
        raise ValueError(f'Missing dataset columns: {sorted(missing)}')
    frame = frame[required].drop_duplicates().copy()
    for col in NUMERIC + ['mileage']:
        frame[col] = pd.to_numeric(frame[col], errors='coerce')
    frame = frame.replace([np.inf, -np.inf], np.nan).dropna(subset=['vehicle_id', 'mileage'])
    frame = frame[(frame.mileage > 0) & (frame.mileage < 150)]
    for col in ['engine_l', 'weight_kg', 'distance_km', 'avg_speed']:
        frame = frame[frame[col].isna() | (frame[col] > 0)]
    frame = frame[frame.idle_minutes.isna() | (frame.idle_minutes >= 0)]
    allowed = {'vehicle_type': ['car','suv','motorbike','van','truck'], 'fuel_type': ['petrol','diesel','hybrid'], 'traffic': ['light','moderate','heavy'], 'road': ['city','highway','mixed']}
    for col, categories in allowed.items():
        frame = frame[frame[col].isna() | frame[col].isin(categories)]
    if frame[NUMERIC + CATEGORICAL].isna().all().any():
        raise ValueError('Every feature needs at least one observed value')
    return frame
