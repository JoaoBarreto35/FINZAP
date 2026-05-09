import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspace } from "../../hooks/useWorkspace";
import { listCategories } from "../../services/categories/categoryService";
import {
  cancelInvoice,
  closeInvoice,
  createInvoice,
  listInvoices,
  markInvoiceAsPaid,
  reopenInvoice,
} from "../../services/invoices/invoiceService";
import { listTransactions } from "../../services/transactions/transactionService";
import { listWallets } from "../../services/wallets/walletService";
import type {
  Category,
  Invoice,
  InvoiceStatus,
  Transaction,
  Wallet,
} from "../../types/finance";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import styles from "./styles.module.css";

const monthOptions = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

function getCurrentMonth() {
  return new Date().getMonth() + 1;
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getInvoiceStatusLabel(status: InvoiceStatus) {
  const labels: Record<InvoiceStatus, string> = {
    open: "Aberta",
    closed: "Fechada",
    paid: "Paga",
    cancelled: "Cancelada",
  };

  return labels[status];
}

function getTransactionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    paid: "Pago",
    cancelled: "Cancelado",
    refunded: "Estornado",
  };

  return labels[status] ?? status;
}

function getTransactionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    single: "Avulsa",
    installment: "Parcelada",
    recurring: "Fixa",
  };

  return labels[type] ?? type;
}

function sumTransactions(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.status !== "cancelled")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

export default function Invoices() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [walletId, setWalletId] = useState("");
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());

  const [expandedInvoiceId, setExpandedInvoiceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const creditCardWallets = useMemo(() => {
    return wallets.filter((wallet) => wallet.type === "credit_card");
  }, [wallets]);

  const walletsById = useMemo(() => {
    return new Map(wallets.map((wallet) => [wallet.id, wallet]));
  }, [wallets]);

  const categoriesById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const openInvoices = useMemo(() => {
    return invoices.filter((invoice) => invoice.status === "open");
  }, [invoices]);

  const paidInvoices = useMemo(() => {
    return invoices.filter((invoice) => invoice.status === "paid");
  }, [invoices]);

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

  const openInvoicesAmount = useMemo(() => {
    return openInvoices.reduce((sum, invoice) => {
      return sum + (invoiceTotalsById.get(invoice.id) ?? 0);
    }, 0);
  }, [openInvoices, invoiceTotalsById]);

  const paidInvoicesAmount = useMemo(() => {
    return paidInvoices.reduce((sum, invoice) => {
      return sum + (invoiceTotalsById.get(invoice.id) ?? 0);
    }, 0);
  }, [paidInvoices, invoiceTotalsById]);

  function getInvoiceTransactions(invoiceId: string) {
    return transactions.filter((transaction) => {
      return transaction.invoice_id === invoiceId;
    });
  }

  async function loadPageData() {
    if (!activeWorkspace) {
      setInvoices([]);
      setWallets([]);
      setTransactions([]);
      setCategories([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [invoicesData, walletsData, transactionsData, categoriesData] =
        await Promise.all([
          listInvoices(activeWorkspace.id),
          listWallets(activeWorkspace.id),
          listTransactions(activeWorkspace.id),
          listCategories(activeWorkspace.id),
        ]);

      setInvoices(invoicesData);
      setWallets(walletsData);
      setTransactions(transactionsData);
      setCategories(categoriesData);

      const firstCreditCard = walletsData.find(
        (wallet) => wallet.type === "credit_card",
      );

      if (!walletId && firstCreditCard) {
        setWalletId(firstCreditCard.id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar faturas.";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  async function handleCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de criar uma fatura.");
      return;
    }

    if (!walletId) {
      setErrorMessage("Selecione um cartão de crédito.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      await createInvoice({
        workspace_id: activeWorkspace.id,
        wallet_id: walletId,
        month,
        year,
      });

      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao criar fatura.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseInvoice(invoiceId: string) {
    setActionLoadingId(invoiceId);
    setErrorMessage("");

    try {
      await closeInvoice(invoiceId);
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao fechar fatura.";
      setErrorMessage(message);
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleReopenInvoice(invoiceId: string) {
    setActionLoadingId(invoiceId);
    setErrorMessage("");

    try {
      await reopenInvoice(invoiceId);
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao reabrir fatura.";
      setErrorMessage(message);
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleMarkAsPaid(invoiceId: string) {
    if (!user) {
      setErrorMessage("Usuário não autenticado.");
      return;
    }

    setActionLoadingId(invoiceId);
    setErrorMessage("");

    try {
      await markInvoiceAsPaid(invoiceId, user.id);
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao marcar fatura como paga.";
      setErrorMessage(message);
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleCancelInvoice(invoiceId: string) {
    const confirmed = window.confirm("Deseja realmente cancelar esta fatura?");

    if (!confirmed) return;

    setActionLoadingId(invoiceId);
    setErrorMessage("");

    try {
      await cancelInvoice(invoiceId);
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao cancelar fatura.";
      setErrorMessage(message);
    } finally {
      setActionLoadingId("");
    }
  }

  if (!activeWorkspace) {
    return (
      <Card>
        <h2>Nenhum workspace selecionado</h2>
        <p>Crie ou selecione um workspace antes de visualizar faturas.</p>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Faturas</span>
          <h2>Faturas do workspace</h2>
          <p>
            Gerencie faturas de cartões de crédito, visualize totais e confira
            as transações vinculadas.
          </p>
        </div>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <div className={styles.summaryGrid}>
        <Card>
          <span className={styles.summaryLabel}>Faturas abertas</span>
          <strong className={styles.summaryValue}>{openInvoices.length}</strong>
          <small>{formatCurrency(openInvoicesAmount)} em aberto</small>
        </Card>

        <Card>
          <span className={styles.summaryLabel}>Faturas pagas</span>
          <strong className={styles.summaryValue}>{paidInvoices.length}</strong>
          <small>{formatCurrency(paidInvoicesAmount)} já pago</small>
        </Card>
      </div>

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Nova fatura manual</h3>
              <p>
                Normalmente as faturas são criadas automaticamente ao lançar
                gastos no cartão.
              </p>
            </div>

            <Plus size={20} />
          </div>

          {creditCardWallets.length === 0 ? (
            <p className={styles.warning}>
              Cadastre uma carteira do tipo cartão de crédito antes de criar
              faturas.
            </p>
          ) : null}

          <form className={styles.form} onSubmit={handleCreateInvoice}>
            <label>
              Cartão
              <select
                value={walletId}
                onChange={(event) => setWalletId(event.target.value)}
                required
              >
                <option value="">Selecione</option>

                {creditCardWallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Mês
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ano
              <input
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                required
              />
            </label>

            <Button
              type="submit"
              disabled={submitting || creditCardWallets.length === 0}
            >
              {submitting ? "Criando..." : "Criar fatura"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Faturas cadastradas</h3>
              <p>Abra uma fatura para conferir os lançamentos vinculados.</p>
            </div>

            <CalendarDays size={20} />
          </div>

          {loading ? <p className={styles.empty}>Carregando faturas...</p> : null}

          {!loading && invoices.length === 0 ? (
            <p className={styles.empty}>Nenhuma fatura cadastrada ainda.</p>
          ) : null}

          <div className={styles.list}>
            {invoices.map((invoice) => {
              const wallet = walletsById.get(invoice.wallet_id);
              const invoiceTransactions = getInvoiceTransactions(invoice.id);
              const invoiceTotal = sumTransactions(invoiceTransactions);

              const isExpanded = expandedInvoiceId === invoice.id;
              const isOpen = invoice.status === "open";
              const isClosed = invoice.status === "closed";
              const isPaid = invoice.status === "paid";
              const isCancelled = invoice.status === "cancelled";
              const isActionLoading = actionLoadingId === invoice.id;

              return (
                <div
                  key={invoice.id}
                  className={
                    isCancelled
                      ? `${styles.invoiceItem} ${styles.cancelled}`
                      : styles.invoiceItem
                  }
                >
                  <div className={styles.invoiceTop}>
                    <div className={styles.invoiceTitle}>
                      <CreditCard size={18} />

                      <div>
                        <strong>
                          {wallet?.name ?? "Carteira removida"} ·{" "}
                          {String(invoice.month).padStart(2, "0")}/{invoice.year}
                        </strong>

                        <span>
                          {invoiceTransactions.length} transação(ões) · Status:{" "}
                          {getInvoiceStatusLabel(invoice.status)}
                        </span>
                      </div>
                    </div>

                    <strong className={styles.invoiceAmount}>
                      {formatCurrency(invoiceTotal)}
                    </strong>
                  </div>

                  <div className={styles.invoiceActions}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedInvoiceId(isExpanded ? "" : invoice.id)
                      }
                      disabled={isActionLoading}
                    >
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                      {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                    </button>

                    {isOpen ? (
                      <button
                        type="button"
                        onClick={() => handleCloseInvoice(invoice.id)}
                        disabled={isActionLoading}
                      >
                        <ReceiptText size={16} />
                        Fechar
                      </button>
                    ) : null}

                    {isClosed ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReopenInvoice(invoice.id)}
                          disabled={isActionLoading}
                        >
                          <RotateCcw size={16} />
                          Reabrir
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMarkAsPaid(invoice.id)}
                          disabled={isActionLoading}
                        >
                          <CheckCircle2 size={16} />
                          Marcar paga
                        </button>
                      </>
                    ) : null}

                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() => handleReopenInvoice(invoice.id)}
                        disabled={isActionLoading}
                      >
                        <RotateCcw size={16} />
                        Reabrir
                      </button>
                    ) : null}

                    {!isCancelled && !isPaid ? (
                      <button
                        type="button"
                        onClick={() => handleCancelInvoice(invoice.id)}
                        disabled={isActionLoading}
                      >
                        <Trash2 size={16} />
                        Cancelar
                      </button>
                    ) : null}
                  </div>

                  {isExpanded ? (
                    <div className={styles.invoiceDetails}>
                      <div className={styles.detailsHeader}>
                        <h4>Transações da fatura</h4>
                        <span>{invoiceTransactions.length} item(ns)</span>
                      </div>

                      {invoiceTransactions.length === 0 ? (
                        <p className={styles.empty}>
                          Nenhuma transação vinculada a esta fatura.
                        </p>
                      ) : null}

                      <div className={styles.transactionList}>
                        {invoiceTransactions.map((transaction) => {
                          const category = transaction.category_id
                            ? categoriesById.get(transaction.category_id)
                            : null;

                          return (
                            <div
                              key={transaction.id}
                              className={
                                transaction.status === "cancelled"
                                  ? `${styles.transactionItem} ${styles.cancelled}`
                                  : styles.transactionItem
                              }
                            >
                              <div>
                                <strong>{transaction.description}</strong>
                                <span>
                                  {formatDate(transaction.transaction_date)} ·{" "}
                                  {category?.name ?? "Sem categoria"} ·{" "}
                                  {getTransactionTypeLabel(
                                    transaction.transaction_type,
                                  )}
                                </span>
                              </div>

                              <div className={styles.transactionRight}>
                                <strong>
                                  {formatCurrency(Number(transaction.amount))}
                                </strong>
                                <span>
                                  {getTransactionStatusLabel(transaction.status)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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