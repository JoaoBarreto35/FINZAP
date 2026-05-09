import { Card } from "../../components/ui/Card";
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
  return (
    <div className={styles.page}>
      <section>
        <h2>Dashboard</h2>
        <p>Resumo financeiro consolidado do workspace ativo.</p>
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