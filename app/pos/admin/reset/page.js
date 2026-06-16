'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '/pos';

function ResetInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [state, setState] = useState('checking'); // checking | valid | invalid | done
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    fetch(`${BASE}/api/password/reset?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) {
          setEmail(d.email);
          setState('valid');
        } else {
          setState('invalid');
        }
      })
      .catch(() => setState('invalid'));
  }, [token]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (password.length < 8) {
      setErr('Parolei jābūt vismaz 8 simbolus garai');
      return;
    }
    if (password !== password2) {
      setErr('Paroles nesakrīt');
      return;
    }
    setBusy(true);
    const res = await fetch(`${BASE}/api/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (res.ok) {
      setState('done');
    } else {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || 'Neizdevās. Mēģini vēlreiz.');
    }
  }

  if (state === 'checking') {
    return (
      <div className="login">
        <div className="login__box">
          <p className="hint">Pārbauda saiti…</p>
        </div>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="login">
        <div className="login__box">
          <h1>Saite nederīga</h1>
          <p className="hint">
            Paroles atjaunošanas saite ir nederīga vai novecojusi.
          </p>
          <a className="btn" style={{ width: '100%' }} href={`${BASE}/admin`}>
            Uz pieslēgšanos
          </a>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="login">
        <div className="login__box">
          <h1>Parole nomainīta</h1>
          <p className="hint">Tu esi pieslēdzies. Vari turpināt.</p>
          <a className="btn" style={{ width: '100%' }} href={`${BASE}/admin`}>
            Uz admin paneli
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <form className="login__box" onSubmit={submit}>
        <h1>Jauna parole</h1>
        <p className="hint">{email}</p>
        <div className="field">
          <input
            type="password"
            placeholder="Jaunā parole (vismaz 8 simboli)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
          />
        </div>
        <div className="field">
          <input
            type="password"
            placeholder="Atkārto paroli"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Saglabā…' : 'Saglabāt paroli'}
        </button>
        {err && <div className="msg msg--err">{err}</div>}
      </form>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="login" />}>
      <ResetInner />
    </Suspense>
  );
}
