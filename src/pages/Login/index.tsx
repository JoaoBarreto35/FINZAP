import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import styles from "./styles.module.css";

export default function Login() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>FZ</div>
          <h1>Entrar no FinZap</h1>
          <p>Controle seus gastos por workspace, com colaboração e faturas organizadas.</p>
        </div>

        <form className={styles.form}>
          <label>
            E-mail
            <input type="email" placeholder="seuemail@exemplo.com" />
          </label>

          <label>
            Senha
            <input type="password" placeholder="Sua senha" />
          </label>

          <Button type="submit">Entrar</Button>
        </form>

        <p className={styles.footer}>
          Ainda não tem conta? <Link to="/register">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}