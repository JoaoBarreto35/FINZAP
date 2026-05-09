import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  ReceiptText,
  Tag,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { useWorkspace } from "../../hooks/useWorkspace";
import { listCategories } from "../../services/categories/categoryService";
import { listInvoices } from "../../services/invoices/invoiceService";
import { listTransactions } from "../../services/transactions/transactionService";
import { listWallets } from "../../services/wallets/walletService";
import type { Category, Invoice, Transaction, Wallet } from "../../types/finance";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import styles from "./styles.module.css";

type RankingItem = {
  id: string;
  name: string;
  amount: number;
};

type InvoiceWithTotal = Invoice & {
  total: number;
  walletName: string;
};

const monthNames = [
  "",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function sumTransactions(transactions: Transaction[]) {
  return transactions.reduce((sum, transaction) => {
    return sum + Number(transaction.amount);
  }, 0);
}

function getCurrentMonth() {
  return new Date().getMonth() + 1;
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getNextMonthAndYear() {
  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();

  if (currentMonth === 12) {
    return {
      month: 1,
      year: currentYear + 1,
    };
  }

  return {
    month: currentMonth + 1,
    year: currentYear,
  };
}

function getInvoiceStatusLabel(status: Invoice["status"]) {
  const labels: Record<Invoice["status"], string> = {
    open: "Aberta",
    closed: "Fechada",
    paid: "Paga",
    cancelled: "Cancelada",
  };

  return labels[status];
}

function buildCategoryRanking(
  transactions: Transaction[],
  categories: Category[],
): RankingItem[] {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, RankingItem>();

  transactions.forEach((transaction) => {
    if (transaction.status === "cancelled") return;

    const categoryId = transaction.category_id ?? "uncategorized";
    const category = transaction.category_id
      ? categoriesById.get(transaction.category_id)
      : null;

    const current = totals.get(categoryId);

    totals.set(categoryId, {
      id: categoryId,
      name: category?.name ?? "Sem categoria",
      amount: (current?.amount ?? 0) + Number(transaction.amount),
    });
  });

  return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
}

function buildWalletRanking(
  transactions: Transaction[],
  wallets: Wallet[],
): RankingItem[] {
  const walletsById = new Map(wallets.map((wallet) => [wallet.id, wallet]));
  const totals = new Map<string, RankingItem>();

  transactions.forEach((transaction) => {
    if (transaction.status === "cancelled") return;

    const walletId = transaction.wallet_id ?? "no-wallet";
    const wallet = transaction.wallet_id ? walletsById.get(transaction.wallet_id) : null;

    const current = totals.get(walletId);

    totals.set(walletId, {
      id: walletId,
      name: wallet?.name ?? "Sem carteira",
      amount: (current?.amount ?? 0) + Number(transaction.amount),
    });
  });

  return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
}

export default function Dashboard() {
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.status !== "cancelled");
  }, [transactions]);

  const pendingTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.status === "pending");
  }, [transactions]);

  const paidTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.status === "paid");
  }, [transactions]);

  const confirmedTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.status === "confirmed");
  }, [transactions]);

  const totalAmount = useMemo(() => {
    return sumTransactions(activeTransactions);
  }, [activeTransactions]);

  const pendingAmount = useMemo(() => {
    return sumTransactions(pendingTransactions);
  }, [pendingTransactions]);

  const paidAmount = useMemo(() => {
    return sumTransactions(paidTransactions);
  }, [paidTransactions]);

  const confirmedAmount = useMemo(() => {
    return sumTransactions(confirmedTransactions);
  }, [confirmedTransactions]);

  const walletsById = useMemo(() => {
    return new Map(wallets.map((wallet) => [wallet.id, wallet]));
  }, [wallets]);

  const categoriesById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const invoiceTotalsById = useMemo(() => {
    const totals = new Map<string, number>();

    transactions.forEach((transaction) => {
      if (!transaction.invoice_id) return;
      if (transaction.status === "cancelled") return;

      const current = totals.get(transaction.invoice_id) ?? 0;
      totals.set(transaction.invoice_id, current + Number(transaction.amount));
    });

    return totals;
  }, [transactions]);

  const invoicesWithTotals = useMemo<InvoiceWithTotal[]>(() => {
    return invoices.map((invoice) => {
      const wallet = walletsById.get(invoice.wallet_id);

      return {
        ...invoice,
        total: invoiceTotalsById.get(invoice.id) ?? 0,
        walletName: wallet?.name ?? "Carteira removida",
      };
    });
  }, [invoices, walletsById, invoiceTotalsById]);

  const currentInvoice = useMemo(() => {
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();

    return (
      invoicesWithTotals.find((invoice) => {
        return (
          invoice.month === currentMonth &&
          invoice.year === currentYear &&
          invoice.status !== "cancelled"
        );
      }) ?? null
    );
  }, [invoicesWithTotals]);

  const nextInvoice = useMemo(() => {
    const next = getNextMonthAndYear();

    return (
      invoicesWithTotals.find((invoice) => {
        return (
          invoice.month === next.month &&
          invoice.year === next.year &&
          invoice.status !== "cancelled"
        );
      }) ?? null
    );
  }, [invoicesWithTotals]);

  const openInvoicesAmount = useMemo(() => {
    return invoicesWithTotals
      .filter((invoice) => invoice.status === "open" || invoice.status === "closed")
      .reduce((sum, invoice) => sum + invoice.total, 0);
  }, [invoicesWithTotals]);

  const paidInvoicesAmount = useMemo(() => {
    return invoicesWithTotals
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + invoice.total, 0);
  }, [invoicesWithTotals]);

  const categoryRanking = useMemo(() => {
    return buildCategoryRanking(transactions, categories).slice(0, 5);
  }, [transactions, categories]);

  const walletRanking = useMemo(() => {
    return buildWalletRanking(transactions, wallets).slice(0, 5);
  }, [transactions, wallets]);

  const lastTransactions = useMemo(() => {
    return transactions.slice(0, 6);
  }, [transactions]);

  async function loadDashboard() {
    if (!activeWorkspace) {
      setTransactions([]);
      setWallets([]);
      setCategories([]);
      setInvoices([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [transactionsData, walletsData, categoriesData, invoicesData] =
        await Promise.all([
          listTransactions(activeWorkspace.id),
          listWallets(activeWorkspace.id),
          listCategories(activeWorkspace.id),
          listInvoices(activeWorkspace.id),
        ]);

      setTransactions(transactionsData);
      setWallets(walletsData);
      setCategories(categoriesData);
      setInvoices(invoicesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar dashboard.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [activeWorkspace?.id]);

  if (workspaceLoading) {
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
          categorias, faturas e transações.
        </p>

        <Link className={styles.linkButton} to="/app/workspaces">
          Criar workspace
        </Link>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Dashboard</span>
          <h2>{activeWorkspace.name}</h2>
          <p>Resumo financeiro consolidado do workspace ativo.</p>
        </div>

        <Link className={styles.primaryLink} to="/app/transactions">
          Nova transação
          <ArrowRight size={17} />
        </Link>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      {loading ? (
        <Card>
          <p className={styles.empty}>Carregando dashboard...</p>
        </Card>
      ) : null}

      {!loading ? (
        <>
          <div className={styles.summaryGrid}>
            <Card>
              <div className={styles.summaryHeader}>
                <span>Total lançado</span>
                <TrendingUp size={18} />
              </div>
              <strong>{formatCurrency(totalAmount)}</strong>
              <small>Desconsiderando cancelados</small>
            </Card>

            <Card>
              <div className={styles.summaryHeader}>
                <span>Pendente</span>
                <ReceiptText size={18} />
              </div>
              <strong>{formatCurrency(pendingAmount)}</strong>
              <small>{pendingTransactions.length} transações pendentes</small>
            </Card>

            <Card>
              <div className={styles.summaryHeader}>
                <span>Confirmado</span>
                <CreditCard size={18} />
              </div>
              <strong>{formatCurrency(confirmedAmount)}</strong>
              <small>{confirmedTransactions.length} transações confirmadas</small>
            </Card>

            <Card>
              <div className={styles.summaryHeader}>
                <span>Pago</span>
                <WalletIcon size={18} />
              </div>
              <strong>{formatCurrency(paidAmount)}</strong>
              <small>{paidTransactions.length} transações pagas</small>
            </Card>
          </div>

          <div className={styles.invoiceGrid}>
            <Card>
              <div className={styles.cardHeader}>
                <div>
                  <h3>Fatura atual</h3>
                  <p>{monthNames[getCurrentMonth()]} de {getCurrentYear()}</p>
                </div>

                <CalendarDays size={20} />
              </div>

              {currentInvoice ? (
                <div className={styles.invoiceHighlight}>
                  <span>{currentInvoice.walletName}</span>
                  <strong>{formatCurrency(currentInvoice.total)}</strong>
                  <small>{getInvoiceStatusLabel(currentInvoice.status)}</small>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>Nenhuma fatura atual encontrada.</p>
                  <Link className={styles.linkButton} to="/app/invoices">
                    Criar fatura
                  </Link>
                </div>
              )}
            </Card>

            <Card>
              <div className={styles.cardHeader}>
                <div>
                  <h3>Próxima fatura</h3>
                  <p>
                    {monthNames[getNextMonthAndYear().month]} de{" "}
                    {getNextMonthAndYear().year}
                  </p>
                </div>

                <CreditCard size={20} />
              </div>

              {nextInvoice ? (
                <div className={styles.invoiceHighlight}>
                  <span>{nextInvoice.walletName}</span>
                  <strong>{formatCurrency(nextInvoice.total)}</strong>
                  <small>{getInvoiceStatusLabel(nextInvoice.status)}</small>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>Nenhuma próxima fatura encontrada.</p>
                  <Link className={styles.linkButton} to="/app/invoices">
                    Ver faturas
                  </Link>
                </div>
              )}
            </Card>

            <Card>
              <div className={styles.cardHeader}>
                <div>
                  <h3>Faturas abertas</h3>
                  <p>Abertas ou fechadas, ainda não pagas.</p>
                </div>

                <ReceiptText size={20} />
              </div>

              <div className={styles.invoiceHighlight}>
                <span>Total em aberto</span>
                <strong>{formatCurrency(openInvoicesAmount)}</strong>
                <small>Faturas não pagas</small>
              </div>
            </Card>

            <Card>
              <div className={styles.cardHeader}>
                <div>
                  <h3>Faturas pagas</h3>
                  <p>Total já marcado como pago.</p>
                </div>

                <WalletIcon size={20} />
              </div>

              <div className={styles.invoiceHighlight}>
                <span>Total pago</span>
                <strong>{formatCurrency(paidInvoicesAmount)}</strong>
                <small>Faturas finalizadas</small>
              </div>
            </Card>
          </div>

          <div className={styles.secondaryGrid}>
            <Card>
              <div className={styles.cardHeader}>
                <div>
                  <h3>Gastos por categoria</h3>
                  <p>Top categorias do workspace.</p>
                </div>
                <Tag size={20} />
              </div>

              {categoryRanking.length === 0 ? (
                <p className={styles.empty}>Nenhum gasto por categoria ainda.</p>
              ) : null}

              <div className={styles.rankingList}>
                {categoryRanking.map((item) => (
                  <div key={item.id} className={styles.rankingItem}>
                    <span>{item.name}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className={styles.cardHeader}>
                <div>
                  <h3>Gastos por carteira</h3>
                  <p>Top carteiras usadas nas transações.</p>
                </div>
                <WalletIcon size={20} />
              </div>

              {walletRanking.length === 0 ? (
                <p className={styles.empty}>Nenhum gasto por carteira ainda.</p>
              ) : null}

              <div className={styles.rankingList}>
                {walletRanking.map((item) => (
                  <div key={item.id} className={styles.rankingItem}>
                    <span>{item.name}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <div className={styles.cardHeader}>
              <div>
                <h3>Últimas transações</h3>
                <p>Movimentações mais recentes do workspace.</p>
              </div>

              <Link className={styles.smallLink} to="/app/transactions">
                Ver todas
              </Link>
            </div>

            {lastTransactions.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Nenhuma transação cadastrada ainda.</p>
                <Link className={styles.linkButton} to="/app/transactions">
                  Criar primeira transação
                </Link>
              </div>
            ) : null}

            <div className={styles.transactionList}>
              {lastTransactions.map((transaction) => {
                const wallet = transaction.wallet_id
                  ? walletsById.get(transaction.wallet_id)
                  : null;

                const category = transaction.category_id
                  ? categoriesById.get(transaction.category_id)
                  : null;

                return (
                  <div key={transaction.id} className={styles.transactionItem}>
                    <div>
                      <strong>{transaction.description}</strong>
                      <span>
                        {formatDate(transaction.transaction_date)} ·{" "}
                        {wallet?.name ?? "Sem carteira"} ·{" "}
                        {category?.name ?? "Sem categoria"}
                      </span>
                    </div>

                    <div className={styles.transactionRight}>
                      <strong>{formatCurrency(Number(transaction.amount))}</strong>
                      <span>{transaction.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}