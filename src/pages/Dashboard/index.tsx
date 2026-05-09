import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { useWorkspace } from "../../hooks/useWorkspace";
import styles from "./styles.module.css";

const cards = [
  {
    label: "Gasto do mês",
    value: "R$ 0,00",
  },
  {
    label: "Pendente",
    value: "R$ 0,00",
  },
  {
    label: "Pago",
    value: "R$ 0,00",
  },
  {
    label: "Próxima fatura",
    value: "R$ 0,00",
  },
];

export default function Dashboard() {
  const { activeWorkspace, loading } = useWorkspace();

  if (loading) {
    return (
      <Card>
        <p>Carregando workspace...</p>
      </Card>
    );
  }

  if (!activeWorkspace) {
    return (
      <Card>
        <h2>Nenhum workspace selecionado</h2>
        <p>
          Crie seu primeiro workspace para começar a controlar carteiras,
          faturas e transações.
        </p>

        <Link className={styles.linkButton} to="/app/workspaces">
          Criar workspace
        </Link>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section>
        <h2>Dashboard</h2>
        <p>Resumo financeiro consolidado do workspace {activeWorkspace.name}.</p>
      </section>

      <div className={styles.grid}>
        {cards.map((card) => (
          <Card key={card.label}>
            <span className={styles.cardLabel}>{card.label}</span>
            <strong className={styles.cardValue}>{card.value}</strong>
          </Card>
        ))}
      </div>
    </div>
  );
}