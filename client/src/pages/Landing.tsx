import {
  ArrowRight,
  BarChart3,
  Car,
  ChevronRight,
  Fuel,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../state';
import { Logo } from '../workspace';

export default function Landing() {
  const { user } = useApp();
  return (
    <div className="landing">
      <div className="landing-nav">
        <Logo />
        <div>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <Link className="btn primary" to={user ? '/app' : '/auth'}>
            {user ? 'Open dashboard' : 'Get started'}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      <section className="hero">
        <div className="eyebrow">
          <span /> INTELLIGENT FUEL CONSUMPTION ANALYTICS
        </div>
        <h1>
          Understand every litre.
          <br />
          <em>Make every journey count.</em>
        </h1>
        <p>
          Your vehicles, trips and fuel costs in one clear workspace. Turn everyday records into
          useful insights and experimental ML estimates.
        </p>
        <div className="hero-actions">
          <Link className="btn primary" to={user ? '/app' : '/auth'}>
            Start your workspace
            <ArrowRight size={17} />
          </Link>
          <a className="btn" href="#how">
            See how it works
            <ChevronRight size={16} />
          </a>
        </div>
        <div className="hero-note">
          <ShieldCheck size={15} /> Private accounts · Transparent analytics · No paid API needed
        </div>
        <div className="dashboard-preview">
          <div className="preview-sidebar">
            <Fuel size={25} />
            <LayoutDashboard size={19} />
            <Car size={19} />
            <TrendingUp size={19} />
            <Sparkles size={19} />
          </div>
          <div className="preview-main">
            <div className="preview-header">
              <span>YOUR WORKSPACE / OVERVIEW</span>
              <span className="pill">ILLUSTRATIVE PREVIEW</span>
            </div>
            <h2>Your fuel, in focus.</h2>
            <p>Measured data. Meaningful decisions.</p>
            <div className="preview-stats">
              <div>
                <span>Distance travelled</span>
                <b>
                  1,240 <small>km</small>
                </b>
              </div>
              <div>
                <span>Fuel efficiency</span>
                <b>
                  15.6 <small>km/L</small>
                </b>
              </div>
              <div>
                <span>Fuel expenditure</span>
                <b>₹8,925</b>
              </div>
            </div>
            <div className="preview-chart">
              <div>
                <b>Efficiency over time</b>
                <small>Illustrative sample, not your data</small>
              </div>
              <svg viewBox="0 0 700 120" role="img" aria-label="Illustrative efficiency trend">
                <path d="M0 100 H700 M0 60 H700 M0 20 H700" stroke="#e9eeed" fill="none" />
                <path
                  d="M0 95 L35 78 L70 87 L105 48 L140 60 L175 35 L210 55 L245 40 L280 67 L315 38 L350 40 L385 55 L420 22 L455 38 L490 30 L525 52 L560 15 L595 35 L630 12 L665 23 L700 7"
                  stroke="#188779"
                  strokeWidth="3"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="landing-section">
        <div className="eyebrow">A CLEARER VIEW OF THE ROAD</div>
        <h2>Useful insights start with good records.</h2>
        <div className="feature-grid">
          {[
            [
              Car,
              'One home for your vehicles',
              'Keep vehicle details, trip history and fuel purchases organised.',
            ],
            [
              BarChart3,
              'Analytics with context',
              'Explore efficiency, expenditure and patterns across your vehicles.',
            ],
            [
              Sparkles,
              'Transparent machine learning',
              'Inspect held-out model performance and see clearly labelled experimental predictions.',
            ],
          ].map(([Icon, title, text]: any) => (
            <article key={title}>
              <Icon size={24} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="how" className="landing-section how">
        <div>
          <div className="eyebrow">FROM RECORDS TO RECOMMENDATIONS</div>
          <h2>A straightforward workflow.</h2>
          <p>Built with React, Express, MongoDB and a Python prediction service.</p>
        </div>
        <ol>
          <li>
            <b>01</b>
            <div>
              <h3>Add your vehicles</h3>
              <p>Set up the details that matter to your analysis.</p>
            </div>
          </li>
          <li>
            <b>02</b>
            <div>
              <h3>Record trips and refills</h3>
              <p>Keep measured and estimated consumption distinct.</p>
            </div>
          </li>
          <li>
            <b>03</b>
            <div>
              <h3>Analyse, predict and improve</h3>
              <p>Use evidence, compare similar trips and export your results.</p>
            </div>
          </li>
        </ol>
      </section>
      <footer>
        <Logo />
        <span>CSE software project · IFCA v2.0</span>
        <Link to="/auth">Open workspace →</Link>
      </footer>
    </div>
  );
}
