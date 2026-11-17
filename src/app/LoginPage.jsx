import { useId, useState } from "react";
import { authErrorMessage, resetPassword, signIn } from "../services/authService.js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const emailId = useId();
  const pwdId = useId();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setError("");
    if (!email.trim()) {
      setError("Inserisci la tua email, poi tocca di nuovo «Password dimenticata?».");
      return;
    }
    try {
      await resetPassword(email);
      setInfo("Se l'indirizzo è registrato, riceverai un'email per reimpostare la password.");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={submit}>
        <img src="/icon.svg" alt="" className="login__logo" width="64" height="64" />
        <h1 className="login__title">HomeStock</h1>
        <p className="login__subtitle">Le scorte di casa a colpo d'occhio.</p>
        <div className="group">
          <div className="field">
            <label htmlFor={emailId}>Email</label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor={pwdId}>Password</label>
            <input
              id={pwdId}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="login__info" role="status">
            {info}
          </p>
        )}
        <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? "Accesso in corso…" : "Accedi"}
        </button>
        <button type="button" className="btn btn--plain btn--block" onClick={forgot}>
          Password dimenticata?
        </button>
      </form>
    </main>
  );
}
