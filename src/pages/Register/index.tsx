import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import styles from "../Login/styles.module.css";

export default function Register() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>FZ</div>
          <h1>Criar conta</h1>
          <p>Comece criando sua conta para gerenciar seus workspaces financeiros.</p>
        </div>

        <form className={styles.form}>
          <label>
            Nome
            <input type="text" placeholder="Seu nome" />
          </label>

          <label>
            E-mail
            <input type="email" placeholder="seuemail@exemplo.com" />
          </label>

          <label>
            Senha
            <input type="password" placeholder="Crie uma senha" />
          </label>

          <Button type="submit">Criar conta</Button>
        </form>

        <p className={styles.footer}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}