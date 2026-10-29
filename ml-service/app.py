import json
from functools import lru_cache
from typing import Literal
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from preprocessing import ROOT, FEATURES

app=FastAPI(title='IFCA prediction service',version='2.0.0')
class PredictionInput(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    vehicle_type:Literal['car','suv','motorbike','van','truck']
    fuel_type:Literal['petrol','diesel','hybrid']
    engine_l:float=Field(ge=.05,le=20)
    weight_kg:float=Field(ge=50,le=50000)
    distance_km:float=Field(ge=.1,le=10000)
    avg_speed:float=Field(ge=1,le=160)
    idle_minutes:float=Field(ge=0,le=240)
    traffic:Literal['light','moderate','heavy']
    road:Literal['city','highway','mixed']

@lru_cache(maxsize=1)
def load_artifacts():
    try:
        return joblib.load(ROOT/'models/fuel_model.joblib'),json.loads((ROOT/'models/metadata.json').read_text())
    except (FileNotFoundError, OSError, ValueError):
        raise HTTPException(503,'Model unavailable. Run python ml-service/train.py.')

@app.get('/health')
def health():
    load_artifacts()
    return {'status':'ok'}

@app.get('/metadata')
def metadata():
    return load_artifacts()[1]

@app.post('/predict')
def predict(body:PredictionInput):
    model,meta=load_artifacts();data=body.model_dump()
    mileage=max(.1,float(model.predict(pd.DataFrame([data])[FEATURES])[0]))
    extrapolated=[k for k,(lo,hi) in meta['ranges'].items() if data[k]<lo or data[k]>hi]
    return {'mileage':mileage,'litresPer100Km':100/mileage,'fuelRequiredL':body.distance_km/mileage,
            'experimental':meta['experimental'],'dataset_source':meta['dataset_source'],
            'warnings':(['Outside training range: '+', '.join(extrapolated)] if extrapolated else [])+
            (['Experimental prediction from synthetic development data.'] if meta['experimental'] else []),
            'testMetrics':meta['metrics']}
