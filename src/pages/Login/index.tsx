import type { FormEvent } from "react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import styles from "./styles.module.css";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!loading && user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSubmitting(true);

    try {
      await signIn({
        email,
        password,
      });

      navigate("/app/dashboard", {
        replace: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao entrar.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>FZ</div>
          <h1>Entrar no FinZap</h1>
          <p>Controle seus gastos por workspace, com colaboração e faturas organizadas.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            E-mail
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              placeholder="Sua senha"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className={styles.footer}>
          Ainda não tem conta? <Link to="/register">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}