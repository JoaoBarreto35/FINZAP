import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CreditCard,
  ReceiptText,
  Tag,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { useWorkspace } from "../../hooks/useWorkspace";
import { listCategories } from "../../services/categories/categoryService";
import { listTransactions } from "../../services/transactions/transactionService";
import { listWallets } from "../../services/wallets/walletService";
import type { Category, Transaction, Wallet } from "../../types/finance";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import styles from "./styles.module.css";

type RankingItem = {
  id: string;
  name: string;
  amount: number;
};

function sumTransactions(transactions: Transaction[]) {
  return transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );
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

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.status !== "cancelled");
  }, [transactions]);

  const cancelledTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.status === "cancelled");
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

  const cancelledAmount = useMemo(() => {
    return sumTransactions(cancelledTransactions);
  }, [cancelledTransactions]);

  const categoryRanking = useMemo(() => {
    return buildCategoryRanking(transactions, categories).slice(0, 5);
  }, [transactions, categories]);

  const walletRanking = useMemo(() => {
    return buildWalletRanking(transactions, wallets).slice(0, 5);
  }, [transactions, wallets]);

  const lastTransactions = useMemo(() => {
    return transactions.slice(0, 6);
  }, [transactions]);

  const walletsById = useMemo(() => {
    return new Map(wallets.map((wallet) => [wallet.id, wallet]));
  }, [wallets]);

  const categoriesById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  async function loadDashboard() {
    if (!activeWorkspace) {
      setTransactions([]);
      setWallets([]);
      setCategories([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [transactionsData, walletsData, categoriesData] = await Promise.all([
        listTransactions(activeWorkspace.id),
        listWallets(activeWorkspace.id),
        listCategories(activeWorkspace.id),
      ]);

      setTransactions(transactionsData);
      setWallets(walletsData);
      setCategories(categoriesData);
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
          categorias e transações.
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

          {cancelledAmount > 0 ? (
            <p className={styles.mutedInfo}>
              Transações canceladas no histórico: {formatCurrency(cancelledAmount)}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}