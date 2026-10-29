import { ArrowRight, Calculator as CalculatorIcon } from 'lucide-react';
import { useState } from 'react';
import { Card, Message } from '../components';
import { calculator, number as n } from '../utils';
import { Heading } from '../workspace';

export default function Calculator() {
  const [result, setResult] = useState<any>(null),
    [error, setError] = useState('');
  return (
    <>
      <Heading
        title="Put a price on your journey."
        sub="A simple calculator with explicit formulas. No ML model needed."
      />
      <div className="prediction-grid">
        <Card
          title="Trip cost calculator"
          sub="Use consistent units: kilometres, km/L and rupees per litre."
        >
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget));
              try {
                setResult(calculator(+d.distance, +d.mileage, +d.price));
                setError('');
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label className="span-two">
              Distance (km)
              <input
                type="number"
                name="distance"
                min=".01"
                max="1000000"
                step="any"
                defaultValue="120"
                required
              />
            </label>
            <label>
              Expected mileage (km/L)
              <input
                type="number"
                name="mileage"
                min=".01"
                max="150"
                step="any"
                defaultValue="15"
                required
              />
            </label>
            <label>
              Fuel price (₹/L)
              <input
                type="number"
                name="price"
                min=".01"
                max="2000"
                step="any"
                defaultValue="105"
                required
              />
            </label>
            <button className="btn primary full">
              Calculate cost
              <ArrowRight size={17} />
            </button>
          </form>
          <Message text={error} error />
          <div className="formula">
            <h3>How it’s calculated</h3>
            <p>Fuel required = Distance ÷ Mileage</p>
            <p>Trip cost = Fuel required × Price per litre</p>
            <p>Cost per km = Price per litre ÷ Mileage</p>
          </div>
        </Card>
        <div className="prediction-output">
          <CalculatorIcon size={36} />
          {result ? (
            <>
              <div className="eyebrow">ESTIMATED TRIP COST</div>
              <div className="big-result">₹{n(result.cost, 0)}</div>
              <div className="result-facts">
                <div>
                  <b>{n(result.litres, 2)} L</b>
                  <span>Fuel required</span>
                </div>
                <div>
                  <b>₹{n(result.costPerKm, 2)}</b>
                  <span>Cost per kilometre</span>
                </div>
              </div>
              <p>Actual consumption and prices can differ from the assumptions you entered.</p>
            </>
          ) : (
            <>
              <h2>
                Small inputs.
                <br />A clearer budget.
              </h2>
              <p>
                Enter your journey distance, expected efficiency and fuel price to see the estimated
                cost.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
