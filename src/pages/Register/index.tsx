import type { FormEvent } from "react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import styles from "../Login/styles.module.css";

export default function Register() {
  const navigate = useNavigate();
  const { signUp, user, loading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  if (!loading && user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setSubmitting(true);

    try {
      await signUp({
        name,
        email,
        password,
      });

      setSuccessMessage("Conta criada com sucesso. Agora faça login.");

      setTimeout(() => {
        navigate("/login");
      }, 900);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar conta.";
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
          <h1>Criar conta</h1>
          <p>Comece criando sua conta para gerenciar seus workspaces financeiros.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Nome
            <input
              type="text"
              placeholder="Seu nome"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

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
              placeholder="Crie uma senha"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
          {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Criando..." : "Criar conta"}
          </Button>
        </form>

        <p className={styles.footer}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}