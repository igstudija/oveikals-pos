'use client';

import { useEffect, useRef, useState } from 'react';
import { aspectOk, ASPECT_LABEL } from '../../../lib/aspect';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '/pos';

// Read an image file's pixel dimensions in the browser.
function readImageSize(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export default function Admin() {
  const [authed, setAuthed] = useState(null); // null = checking
  const [slides, setSlides] = useState([]);
  const [intervalSec, setIntervalSec] = useState(7);

  async function loadAdmin() {
    const res = await fetch(`${BASE}/api/admin/slides`, { cache: 'no-store' });
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setSlides(data.slides || []);
    setIntervalSec(data.intervalSec ?? 7);
    setAuthed(true);
  }

  useEffect(() => {
    loadAdmin();
  }, []);

  if (authed === null) {
    return <div className="login" />;
  }
  if (!authed) {
    return <Login onSuccess={loadAdmin} />;
  }
  return (
    <Dashboard
      slides={slides}
      intervalSec={intervalSec}
      reload={loadAdmin}
      setIntervalSec={setIntervalSec}
    />
  );
}

function Login({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitLogin(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (res.ok) {
      onSuccess();
    } else {
      setErr('Nepareizs e-pasts vai parole');
    }
  }

  async function submitForgot(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setInfo('');
    await fetch(`${BASE}/api/password/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    setInfo(
      'Ja šis e-pasts ir reģistrēts, nosūtījām saiti paroles atjaunošanai. Pārbaudi pastu.'
    );
  }

  if (mode === 'forgot') {
    return (
      <div className="login">
        <form className="login__box" onSubmit={submitForgot}>
          <h1>Atjaunot paroli</h1>
          <p className="hint">Ievadi savu e-pastu — nosūtīsim atjaunošanas saiti.</p>
          <div className="field">
            <input
              type="email"
              placeholder="E-pasts"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Sūta…' : 'Nosūtīt saiti'}
          </button>
          {info && <div className="msg msg--ok">{info}</div>}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode('login');
              setErr('');
              setInfo('');
            }}
          >
            ← Atpakaļ uz pieslēgšanos
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="login">
      <form className="login__box" onSubmit={submitLogin}>
        <h1>Oveikals POS — admin</h1>
        <div className="field">
          <input
            type="email"
            placeholder="E-pasts"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>
        <div className="field">
          <input
            type="password"
            placeholder="Parole"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Pārbauda…' : 'Ieiet'}
        </button>
        {err && <div className="msg msg--err">{err}</div>}
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode('forgot');
            setErr('');
            setInfo('');
          }}
        >
          Aizmirsi paroli?
        </button>
      </form>
    </div>
  );
}

function Dashboard({ slides, intervalSec, reload, setIntervalSec }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [savedInterval, setSavedInterval] = useState('');
  const fileRef = useRef(null);

  async function pickFile(e) {
    setMsg('');
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFile(null);
      return;
    }
    const size = await readImageSize(f);
    if (!size) {
      setMsg('Neizdevās nolasīt attēlu. Atļauti: PNG, JPG, WEBP, GIF.');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (!aspectOk(size.width, size.height)) {
      setMsg(
        `Nepareizas proporcijas (${size.width}×${size.height}). Vajadzīgs ${ASPECT_LABEL} formāts.`
      );
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setFile(f);
  }

  async function upload(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMsg('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name);
    const res = await fetch(`${BASE}/api/slides`, { method: 'POST', body: fd });
    setBusy(false);
    if (res.ok) {
      setName('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setMsg('Pievienots!');
      reload();
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error || 'Kļūda augšupielādējot');
    }
  }

  async function remove(id) {
    if (!confirm('Dzēst šo slaidu?')) return;
    await fetch(`${BASE}/api/slides/${id}`, { method: 'DELETE' });
    reload();
  }

  async function toggle(id, active) {
    await fetch(`${BASE}/api/slides/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    reload();
  }

  async function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const ids = slides.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await fetch(`${BASE}/api/slides/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    reload();
  }

  async function saveInterval() {
    const res = await fetch(`${BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervalSec }),
    });
    if (res.ok) {
      setSavedInterval('Saglabāts');
      setTimeout(() => setSavedInterval(''), 1500);
    }
  }

  async function logout() {
    await fetch(`${BASE}/api/logout`, { method: 'POST' });
    location.reload();
  }

  return (
    <div className="admin">
      <div className="admin__inner">
        <div className="admin__bar">
          <h1>Oveikals POS — slaidi</h1>
          <div className="row">
            <a className="btn btn--ghost" href={`${BASE}/`} target="_blank">
              Skatīt slaidrādi
            </a>
            <button className="btn btn--ghost" onClick={logout}>
              Iziet
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Pievienot slaidu</h2>
          <form onSubmit={upload}>
            <div className="field">
              <label>Attēls (no datora) — formāts {ASPECT_LABEL}</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={pickFile}
              />
              <p className="hint">
                Atļautas tikai {ASPECT_LABEL} proporcijas (piem. 1024×768, 1920×1440).
              </p>
            </div>
            <div className="field">
              <label>Nosaukums (nav obligāts)</label>
              <input
                type="text"
                value={name}
                placeholder="piem. Laima tāfelītes"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="row">
              <button className="btn" disabled={busy || !file}>
                {busy ? 'Augšupielādē…' : 'Pievienot'}
              </button>
              {msg && (
                <span
                  className={`msg ${msg === 'Pievienots!' ? 'msg--ok' : 'msg--err'}`}
                >
                  {msg}
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Iestatījumi</h2>
          <div className="row">
            <label style={{ fontSize: 14 }}>Slaida ilgums (sekundes):</label>
            <input
              type="number"
              min="2"
              max="120"
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              style={{ width: 90 }}
            />
            <button className="btn btn--sm" onClick={saveInterval}>
              Saglabāt
            </button>
            {savedInterval && <span className="msg msg--ok">{savedInterval}</span>}
          </div>
        </div>

        <div className="card">
          <h2>Slaidi ({slides.length})</h2>
          {slides.length === 0 && (
            <p className="hint">Vēl nav neviena slaida.</p>
          )}
          <div className="slides">
            {slides.map((s, i) => (
              <div
                key={s.id}
                className={`slide-item ${s.active ? '' : 'dim'}`}
              >
                {(s.imageUrl || s.imageId) && (
                  <img
                    className="slide-item__thumb"
                    src={s.imageUrl || `${BASE}/api/image/${s.imageId}`}
                    alt=""
                  />
                )}
                <div className="slide-item__meta">
                  <div className="slide-item__name">{s.name || 'Bez nosaukuma'}</div>
                  <div className="slide-item__sub">
                    {s.active ? 'Redzams' : 'Paslēpts'} · #{i + 1}
                  </div>
                </div>
                <div className="slide-item__actions">
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    title="Uz augšu"
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => move(i, 1)}
                    disabled={i === slides.length - 1}
                    title="Uz leju"
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => toggle(s.id, s.active)}
                  >
                    {s.active ? 'Paslēpt' : 'Rādīt'}
                  </button>
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => remove(s.id)}
                  >
                    Dzēst
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
