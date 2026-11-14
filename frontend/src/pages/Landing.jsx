import { Link } from 'react-router-dom'
import './Landing.css'

const PRODUCT = 'GymDesk'
const CONTACT_PHONE = ''

const FEATURES = [
  {
    title: 'Due dates worked out for you',
    text: 'Pick a package for a member and the next fee date is set. No notebook, no counting days.',
  },
  {
    title: 'Late and due soon, at a glance',
    text: 'The dashboard shows who is late, who is due in 2 days, and who is fine.',
  },
  {
    title: 'WhatsApp reminders in one tap',
    text: 'A ready message opens in WhatsApp with the name, amount and date already written.',
  },
  {
    title: 'Part payments and receipts',
    text: 'A member pays half today? The balance is saved. Print a receipt with your gym stamp.',
  },
  {
    title: 'Expenses and monthly profit',
    text: 'Write down rent, electricity and salaries. See what you earned, spent and kept.',
  },
  {
    title: 'Works on your phone',
    text: 'Open it in any browser. Take a member photo with the phone camera.',
  },
]

const STEPS = [
  {
    title: 'Sign up your gym',
    text: 'Choose a gym name, a username and a password. It takes one minute.',
  },
  {
    title: 'Add packages and members',
    text: 'Set your fees and days, then add each member with a phone number and a photo.',
  },
  {
    title: 'Collect fees, send reminders',
    text: 'Mark a payment as paid and the next due date moves by itself.',
  },
]

const FAQ = [
  {
    q: 'Do I need a fingerprint machine?',
    a: 'No. GymDesk is made for small gyms that track fees by name and due date.',
  },
  {
    q: 'Can I see other gyms\u2019 members?',
    a: 'No. Each gym sees only its own members, packages, payments and expenses.',
  },
  {
    q: 'Do my members need to install anything?',
    a: 'No. Only you log in. Members get reminders on WhatsApp.',
  },
  {
    q: 'Does it work on a phone?',
    a: 'Yes. It works in the browser on a phone, a tablet and a computer.',
  },
  {
    q: 'Is it free?',
    a: 'Signing up is free in these early days.',
  },
]

const SAMPLE_ROWS = [
  { name: 'Ali Raza', label: 'Late by 3 days', color: 'red' },
  { name: 'Sara Khan', label: 'Due in 1 day', color: 'orange' },
  { name: 'Usman Tariq', label: 'OK (18 days)', color: 'green' },
]

function Landing() {
  return (
    <div className="lp">
      <header className="lp-bar">
        <Link to="/" className="lp-brand">
          {PRODUCT}
        </Link>
        <nav className="lp-nav">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
          <Link to="/login" className="lp-login">
            Login
          </Link>
          <Link to="/signup" className="lp-cta lp-cta-small">
            Sign up
          </Link>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-text">
          <h1>Know who has paid and who has not, before the month ends.</h1>
          <p>
            {PRODUCT} keeps your gym members, fees and due dates in one place.
            Send a WhatsApp reminder in one tap and print a receipt in one more.
          </p>
          <div className="lp-hero-actions">
            <Link to="/signup" className="lp-cta">
              Sign up your gym
            </Link>
            <Link to="/login" className="lp-link">
              I already have an account
            </Link>
          </div>
        </div>

        <div className="lp-board" aria-label="Example of the due list">
          <div className="lp-board-title">Due list</div>
          {SAMPLE_ROWS.map((row) => (
            <div className="lp-board-row" key={row.name}>
              <span className="lp-board-name">{row.name}</span>
              <span className={'badge ' + row.color}>{row.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section" id="features">
        <h2>Everything a small gym needs for fees</h2>
        <div className="lp-features">
          {FEATURES.map((f) => (
            <div className="lp-feature" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-tint" id="how">
        <h2>How it works</h2>
        <ol className="lp-steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-section" id="screens">
        <h2>See the dashboard</h2>
        <div className="lp-screen">
          <span>Dashboard screenshot goes here</span>
        </div>
      </section>

      <section className="lp-section lp-tint" id="faq">
        <h2>Questions gym owners ask</h2>
        <div className="lp-faq">
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2>Ready to stop chasing fees by memory?</h2>
        <Link to="/signup" className="lp-cta">
          Sign up your gym
        </Link>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-name">{PRODUCT}</div>
        <div>Fee tracking for small gyms.</div>
        {CONTACT_PHONE && <div>Contact: {CONTACT_PHONE}</div>}
        <div>
          <Link to="/login">Login</Link> | <Link to="/signup">Sign up</Link>
        </div>
      </footer>
    </div>
  )
}

export default Landing