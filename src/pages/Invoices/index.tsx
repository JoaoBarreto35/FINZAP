import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspace } from "../../hooks/useWorkspace";
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
import type { Invoice, InvoiceStatus, Transaction, Wallet } from "../../types/finance";
import { formatCurrency } from "../../utils/formatCurrency";
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

function getMonthName(month: number) {
  return monthOptions.find((option) => option.value === month)?.label ?? String(month);
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

export default function Invoices() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [walletId, setWalletId] = useState("");
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());

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

  const totalOpenAmount = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === "open")
      .reduce((sum, invoice) => {
        return sum + (invoiceTotalsById.get(invoice.id) ?? 0);
      }, 0);
  }, [invoices, invoiceTotalsById]);

  const totalPaidAmount = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => {
        return sum + (invoiceTotalsById.get(invoice.id) ?? 0);
      }, 0);
  }, [invoices, invoiceTotalsById]);

  async function loadPageData() {
    if (!activeWorkspace) {
      setInvoices([]);
      setWallets([]);
      setTransactions([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [invoicesData, walletsData, transactionsData] = await Promise.all([
        listInvoices(activeWorkspace.id),
        listWallets(activeWorkspace.id),
        listTransactions(activeWorkspace.id),
      ]);

      setInvoices(invoicesData);
      setWallets(walletsData);
      setTransactions(transactionsData);

      const firstCreditCard = walletsData.find((wallet) => wallet.type === "credit_card");

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
    loadPageData();
  }, [activeWorkspace?.id]);

  async function handleCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de criar faturas.");
      return;
    }

    if (!walletId) {
      setErrorMessage("Selecione uma carteira de crédito.");
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

      setMonth(getCurrentMonth());
      setYear(getCurrentYear());

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
        <p>Crie ou selecione um workspace antes de cadastrar faturas.</p>
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
            Controle faturas de cartões de crédito. Em breve as transações serão
            vinculadas automaticamente pela data de compra e fechamento.
          </p>
        </div>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <div className={styles.summaryGrid}>
        <Card>
          <span className={styles.summaryLabel}>Faturas abertas</span>
          <strong className={styles.summaryValue}>
            {invoices.filter((invoice) => invoice.status === "open").length}
          </strong>
        </Card>

        <Card>
          <span className={styles.summaryLabel}>Total aberto</span>
          <strong className={styles.summaryValue}>{formatCurrency(totalOpenAmount)}</strong>
        </Card>

        <Card>
          <span className={styles.summaryLabel}>Total pago</span>
          <strong className={styles.summaryValue}>{formatCurrency(totalPaidAmount)}</strong>
        </Card>
      </div>

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Nova fatura</h3>
              <p>Crie uma fatura mensal para uma carteira de crédito.</p>
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
              Carteira
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

            <Button type="submit" disabled={submitting || creditCardWallets.length === 0}>
              {submitting ? "Criando..." : "Criar fatura"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Faturas cadastradas</h3>
              <p>Faturas abertas, fechadas, pagas e canceladas.</p>
            </div>

            <CreditCard size={20} />
          </div>

          {loading ? <p className={styles.empty}>Carregando faturas...</p> : null}

          {!loading && invoices.length === 0 ? (
            <p className={styles.empty}>Nenhuma fatura cadastrada ainda.</p>
          ) : null}

          <div className={styles.list}>
            {invoices.map((invoice) => {
              const wallet = walletsById.get(invoice.wallet_id);
              const total = invoiceTotalsById.get(invoice.id) ?? 0;
              const isActionLoading = actionLoadingId === invoice.id;
              const isCancelled = invoice.status === "cancelled";
              const isPaid = invoice.status === "paid";
              const isClosed = invoice.status === "closed";

              return (
                <div
                  key={invoice.id}
                  className={
                    isCancelled
                      ? `${styles.item} ${styles.cancelled}`
                      : styles.item
                  }
                >
                  <div className={styles.itemTop}>
                    <div>
                      <strong>
                        {wallet?.name ?? "Carteira removida"} —{" "}
                        {getMonthName(invoice.month)}/{invoice.year}
                      </strong>

                      <span>{getInvoiceStatusLabel(invoice.status)}</span>
                    </div>

                    <strong className={styles.amount}>
                      {formatCurrency(total)}
                    </strong>
                  </div>

                  <div className={styles.metaGrid}>
                    <span>
                      <CalendarDays size={14} />
                      {getMonthName(invoice.month)} de {invoice.year}
                    </span>

                    <span>
                      <CreditCard size={14} />
                      {wallet?.name ?? "Sem carteira"}
                    </span>
                  </div>

                  {!isCancelled ? (
                    <div className={styles.actions}>
                      {invoice.status === "open" ? (
                        <button
                          type="button"
                          onClick={() => handleCloseInvoice(invoice.id)}
                          disabled={isActionLoading}
                        >
                          <Lock size={16} />
                          Fechar
                        </button>
                      ) : null}

                      {isClosed ? (
                        <button
                          type="button"
                          onClick={() => handleReopenInvoice(invoice.id)}
                          disabled={isActionLoading}
                        >
                          <RotateCcw size={16} />
                          Reabrir
                        </button>
                      ) : null}

                      {!isPaid ? (
                        <button
                          type="button"
                          onClick={() => handleMarkAsPaid(invoice.id)}
                          disabled={isActionLoading}
                        >
                          <CheckCircle2 size={16} />
                          Marcar paga
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleCancelInvoice(invoice.id)}
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