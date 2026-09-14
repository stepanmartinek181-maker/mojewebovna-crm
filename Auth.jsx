import React, { useEffect, useState } from 'react';
import { supabase } from './cloud.js';
import App from './App.jsx';

export default function Auth() {
  const [session, setSession] = useState(undefined);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) setSession(next);
    });
    supabase.auth.getSession().then(({ data, error: err }) => {
      if (!alive) return;
      if (err) setError(err.message);
      setSession(data.session);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  if (session === undefined) return <div className="auth-page"><p role="status">Ověřuji přihlášení…</p></div>;
  if (session) return <App key={session.user.id} user={session.user} />;
  return <Login initialError={error} />;
}

function Login({ initialError }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  return <div className="auth-page"><section className="auth-card">
    <div className="brand">mojewebovna <span>/ CRM</span></div>
    <h1>Kontakty všude s tebou.</h1>
    <p>Přihlas se stejným e-mailem na počítači i mobilu. Kontakty, hovory a termíny se ukládají do tvé soukromé evidence.</p>
    <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try {
        const { error: err } = await supabase.auth.signInWithOtp({
          email: email.trim(), options: { emailRedirectTo: 'https://stepanmartinek181-maker.github.io/mojewebovna-crm/' },
        });
        if (err) throw err;
        setSent(true);
      } catch (err) { setError(`Odkaz se nepodařilo poslat: ${err.message}`); }
      finally { setBusy(false); }
    }}>
      <label>E-mail<input name="email" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setSent(false); }} required maxLength={254}/></label>
      <button className="button primary full" disabled={busy || sent}>{busy ? 'Odesílám…' : sent ? 'Odkaz odeslán' : 'Poslat přihlašovací odkaz'}</button>
    </form>
    {sent && <p className="notice" role="status">Zkontroluj e-mail i spam. Odkaz otevři na zařízení, kde chceš CRM používat. Platnost odkazu je omezená a lze ho použít jednou.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {sent && <button className="button" onClick={() => setSent(false)}>Poslat nový odkaz</button>}
    <p className="help muted">Původní kontakty v tomto prohlížeči zůstaly zachované. Po prvním přihlášení je můžeš převést do synchronizované evidence.</p>
  </section></div>;
}
