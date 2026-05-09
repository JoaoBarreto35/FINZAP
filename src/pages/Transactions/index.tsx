
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Plus,
  ReceiptText,
  Trash2,
  Wallet as WalletIcon,
  Edit3,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspace } from "../../hooks/useWorkspace";
import { listCategories } from "../../services/categories/categoryService";
import {
  cancelTransaction,
  createTransaction,
  listTransactions,
  markTransactionAsPaid,
  updateTransaction,
} from "../../services/transactions/transactionService";
import { listInvoices } from "../../services/invoices/invoiceService";
import { listWallets } from "../../services/wallets/walletService";
import type {
  Category,
  Invoice,
  Transaction,
  TransactionStatus,
  Wallet,
} from "../../types/finance";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { parseCurrencyToNumber } from "../../utils/parseCurrency";
import styles from "./styles.module.css";

const statusOptions: Array<{
  value: TransactionStatus;
  label: string;
}> = [
    {
      value: "pending",
      label: "Pendente",
    },
    {
      value: "confirmed",
      label: "Confirmado",
    },
    {
      value: "paid",
      label: "Pago",
    },
  ];

function getStatusLabel(status: TransactionStatus) {
  const labels: Record<TransactionStatus, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    paid: "Pago",
    cancelled: "Cancelado",
    refunded: "Estornado",
  };

  return labels[status];
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function Transactions() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(getTodayDate());
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<TransactionStatus>("pending");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(editingTransaction);



  const walletsById = useMemo(() => {
    return new Map(wallets.map((wallet) => [wallet.id, wallet]));
  }, [wallets]);

  const categoriesById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const invoicesById = useMemo(() => {
    return new Map(invoices.map((invoice) => [invoice.id, invoice]));
  }, [invoices]);

  const totalAmount = useMemo(() => {
    return transactions
      .filter((transaction) => transaction.status !== "cancelled")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  }, [transactions]);

  const pendingAmount = useMemo(() => {
    return transactions
      .filter((transaction) => transaction.status === "pending")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  }, [transactions]);

  const paidAmount = useMemo(() => {
    return transactions
      .filter((transaction) => transaction.status === "paid")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  }, [transactions]);

  async function loadPageData() {
    console.log("[Transactions] loadPageData chamado", {
      activeWorkspace,
      activeWorkspaceId: activeWorkspace?.id,
    });

    if (!activeWorkspace) {
      console.log("[Transactions] Sem workspace ativo");
      setTransactions([]);
      setWallets([]);
      setCategories([]);
      setInvoices([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      console.log("[Transactions] Buscando dados do workspace:", activeWorkspace.id);

      const [transactionsData, walletsData, categoriesData, invoicesData] =
        await Promise.all([
          listTransactions(activeWorkspace.id),
          listWallets(activeWorkspace.id),
          listCategories(activeWorkspace.id),
          listInvoices(activeWorkspace.id),
        ]);

      console.log("[Transactions] Dados retornados", {
        transactionsData,
        walletsData,
        categoriesData,
        invoicesData,
      });

      setTransactions(transactionsData);
      setWallets(walletsData);
      setCategories(categoriesData);
      setInvoices(invoicesData);

      if (!walletId && walletsData[0]) {
        console.log("[Transactions] Setando primeira carteira", walletsData[0]);
        setWalletId(walletsData[0].id);
      }

      if (!categoryId && categoriesData[0]) {
        console.log("[Transactions] Setando primeira categoria", categoriesData[0]);
        setCategoryId(categoriesData[0].id);
      }
    } catch (error) {
      console.error("[Transactions] Erro no loadPageData", error);

      const message =
        error instanceof Error ? error.message : "Erro ao carregar transações.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeWorkspace?.id]);
  function resetForm() {
    setEditingTransaction(null);
    setDescription("");
    setAmount("");
    setTransactionDate(getTodayDate());
    setWalletId(wallets[0]?.id ?? "");
    setCategoryId(categories[0]?.id ?? "");
    setStatus("pending");
  }

  function handleStartEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
    setDescription(transaction.description);
    setAmount(Number(transaction.amount).toFixed(2).replace(".", ","));
    setTransactionDate(transaction.transaction_date);
    setWalletId(transaction.wallet_id ?? "");
    setCategoryId(transaction.category_id ?? "");
    setStatus(transaction.status);
    setErrorMessage("");
  }
  async function handleSubmitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de salvar transações.");
      return;
    }

    if (!user) {
      setErrorMessage("Usuário não autenticado.");
      return;
    }

    const parsedAmount = parseCurrencyToNumber(amount);

    if (parsedAmount <= 0) {
      setErrorMessage("Informe um valor válido para a transação.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          wallet_id: walletId || null,
          category_id: categoryId || null,
          amount: parsedAmount,
          description,
          transaction_date: transactionDate,
          status,
        });
      } else {
        await createTransaction(
          {
            workspace_id: activeWorkspace.id,
            wallet_id: walletId || null,
            category_id: categoryId || null,
            amount: parsedAmount,
            description,
            transaction_date: transactionDate,
            transaction_type: "single",
            status,
          },
          user.id,
        );
      }

      resetForm();
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar transação.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkAsPaid(transactionId: string) {
    setActionLoadingId(transactionId);
    setErrorMessage("");

    try {
      await markTransactionAsPaid(transactionId);
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao marcar como pago.";
      setErrorMessage(message);
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleCancelTransaction(transactionId: string) {
    const confirmed = window.confirm("Deseja realmente cancelar esta transação?");

    if (!confirmed) return;

    setActionLoadingId(transactionId);
    setErrorMessage("");

    try {
      await cancelTransaction(transactionId);
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao cancelar transação.";
      setErrorMessage(message);
    } finally {
      setActionLoadingId("");
    }
  }

  if (!activeWorkspace) {
    return (
      <Card>
        <h2>Nenhum workspace selecionado</h2>
        <p>Crie ou selecione um workspace antes de cadastrar transações.</p>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Transações</span>
          <h2>Gastos do workspace</h2>
          <p>
            Lance gastos avulsos, acompanhe pendências e marque despesas como
            pagas.
          </p>
        </div>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <div className={styles.summaryGrid}>
        <Card>
          <span className={styles.summaryLabel}>Total lançado</span>
          <strong className={styles.summaryValue}>{formatCurrency(totalAmount)}</strong>
        </Card>

        <Card>
          <span className={styles.summaryLabel}>Pendente</span>
          <strong className={styles.summaryValue}>{formatCurrency(pendingAmount)}</strong>
        </Card>

        <Card>
          <span className={styles.summaryLabel}>Pago</span>
          <strong className={styles.summaryValue}>{formatCurrency(paidAmount)}</strong>
        </Card>
      </div>

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>{isEditing ? "Editar transação" : "Nova transação"}</h3>
              <p>
                {isEditing
                  ? "Altere os dados da transação selecionada."
                  : "Crie um gasto avulso para o workspace atual."}
              </p>
            </div>

            {isEditing ? <Edit3 size={20} /> : <Plus size={20} />}
          </div>

          {wallets.length === 0 || categories.length === 0 ? (
            <p className={styles.warning}>
              Cadastre pelo menos uma carteira e uma categoria antes de lançar
              transações.
            </p>
          ) : null}

          <form className={styles.form} onSubmit={handleSubmitTransaction}>
            <label>
              Descrição
              <input
                type="text"
                placeholder="Ex: Mercado"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </label>

            <label>
              Valor
              <input
                type="text"
                placeholder="Ex: 42,90"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>

            <label>
              Data
              <input
                type="date"
                value={transactionDate}
                onChange={(event) => setTransactionDate(event.target.value)}
                required
              />
            </label>

            <label>
              Carteira
              <select
                value={walletId}
                onChange={(event) => setWalletId(event.target.value)}
                required
              >
                <option value="">Selecione</option>

                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Categoria
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
              >
                <option value="">Selecione</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as TransactionStatus)
                }
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.formActions}>
              <Button
                type="submit"
                disabled={submitting || wallets.length === 0 || categories.length === 0}
              >
                {submitting
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar alterações"
                    : "Criar transação"}
              </Button>

              {isEditing ? (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Últimas transações</h3>
              <p>Gastos lançados no workspace ativo.</p>
            </div>

            <ReceiptText size={20} />
          </div>

          {loading ? <p className={styles.empty}>Carregando transações...</p> : null}

          {!loading && transactions.length === 0 ? (
            <p className={styles.empty}>Nenhuma transação cadastrada ainda.</p>
          ) : null}

          <div className={styles.list}>
            {transactions.map((transaction) => {
              const wallet = transaction.wallet_id
                ? walletsById.get(transaction.wallet_id)
                : null;

              const category = transaction.category_id
                ? categoriesById.get(transaction.category_id)
                : null;
              const invoice = transaction.invoice_id
                ? invoicesById.get(transaction.invoice_id)
                : null;

              const isActionLoading = actionLoadingId === transaction.id;
              const isCancelled = transaction.status === "cancelled";
              const isPaid = transaction.status === "paid";

              return (
                <div
                  key={transaction.id}
                  className={
                    isCancelled
                      ? `${styles.item} ${styles.cancelled}`
                      : styles.item
                  }
                >
                  <div className={styles.itemTop}>
                    <div>
                      <strong>{transaction.description}</strong>
                      <span>{formatDate(transaction.transaction_date)}</span>
                    </div>

                    <strong className={styles.amount}>
                      {formatCurrency(Number(transaction.amount))}
                    </strong>
                  </div>

                  <div className={styles.metaGrid}>
                    <span>
                      <WalletIcon size={14} />
                      {wallet?.name ?? "Sem carteira"}
                    </span>

                    <span>
                      <ReceiptText size={14} />
                      {category?.name ?? "Sem categoria"}
                    </span>

                    <span>
                      <Calendar size={14} />
                      {getStatusLabel(transaction.status)}
                    </span>
                    <span>
                      <CreditCard size={14} />
                      {invoice ? `${invoice.month}/${invoice.year}` : "Sem fatura"}
                    </span>
                  </div>

                  {!isCancelled ? (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(transaction)}
                        disabled={isActionLoading}
                      >
                        <Edit3 size={16} />
                        Editar
                      </button>

                      {!isPaid ? (
                        <button
                          type="button"
                          onClick={() => handleMarkAsPaid(transaction.id)}
                          disabled={isActionLoading}
                        >
                          <CheckCircle2 size={16} />
                          Marcar pago
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleCancelTransaction(transaction.id)}
                        disabled={isActionLoading}
                      >
                        <Trash2 size={16} />
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}