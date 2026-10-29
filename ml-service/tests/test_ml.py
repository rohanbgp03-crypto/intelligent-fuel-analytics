import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
import pytest
from fastapi.testclient import TestClient
from preprocessing import synthetic_data,clean_data,FEATURES
from train import train
from app import app,load_artifacts

def test_data_and_invalid_cleanup():
    frame=synthetic_data(vehicles=10,trips=12)
    assert len(frame)==120
    frame.loc[0,'mileage']=-1
    frame.loc[1,'weight_kg']=-2
    assert len(clean_data(frame))==118
    with pytest.raises(ValueError):clean_data(frame.drop(columns='vehicle_id'))

def test_training_group_isolation_and_baseline(tmp_path):
    m=train(output_dir=tmp_path)
    assert m['group_overlap'] is False
    assert m['train_rows']+m['test_rows']==m['rows']
    assert m['metrics']['mae']<m['baseline_metrics']['mae']
    assert (tmp_path/'fuel_model.joblib').is_file()

def test_prediction_and_validation():
    client=TestClient(app)
    body=dict(vehicle_type='car',fuel_type='petrol',engine_l=1.5,weight_kg=1200,distance_km=100,avg_speed=60,idle_minutes=10,traffic='light',road='mixed')
    response=client.post('/predict',json=body)
    assert response.status_code==200
    assert response.json()['experimental'] is True
    assert np.isfinite(response.json()['mileage'])
    assert response.json()['fuelRequiredL']>0
    assert client.post('/predict',json={**body,'distance_km':0}).status_code==422
    assert client.post('/predict',json={**body,'unexpected':1}).status_code==422
    assert client.post('/predict',json={**body,'vehicle_type':'spacecraft'}).status_code==422
    assert client.get('/metadata').json()['group_overlap'] is False
