import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  ReceiptText,
  Search,
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

function getTransactionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    single: "Avulsa",
    installment: "Parcelada",
    recurring: "Fixa",
  };

  return labels[type] ?? type;
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

function sumTransactions(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.status !== "cancelled")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

export default function Forecast() {
  const { activeWorkspace } = useWorkspace();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const walletsById = useMemo(() => {
    return new Map(wallets.map((wallet) => [wallet.id, wallet]));
  }, [wallets]);

  const categoriesById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const invoicesById = useMemo(() => {
    return new Map(invoices.map((invoice) => [invoice.id, invoice]));
  }, [invoices]);

  const selectedMonthTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        if (transaction.status === "cancelled") return false;

        const date = new Date(`${transaction.transaction_date}T00:00:00`);

        return (
          date.getMonth() + 1 === selectedMonth &&
          date.getFullYear() === selectedYear
        );
      })
      .sort((a, b) => {
        return (
          new Date(`${a.transaction_date}T00:00:00`).getTime() -
          new Date(`${b.transaction_date}T00:00:00`).getTime()
        );
      });
  }, [transactions, selectedMonth, selectedYear]);

  const selectedMonthInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      return (
        invoice.month === selectedMonth &&
        invoice.year === selectedYear &&
        invoice.status !== "cancelled"
      );
    });
  }, [invoices, selectedMonth, selectedYear]);

  const singleTransactions = useMemo(() => {
    return selectedMonthTransactions.filter(
      (transaction) => transaction.transaction_type === "single",
    );
  }, [selectedMonthTransactions]);

  const installmentTransactions = useMemo(() => {
    return selectedMonthTransactions.filter(
      (transaction) => transaction.transaction_type === "installment",
    );
  }, [selectedMonthTransactions]);

  const recurringTransactions = useMemo(() => {
    return selectedMonthTransactions.filter(
      (transaction) => transaction.transaction_type === "recurring",
    );
  }, [selectedMonthTransactions]);

  const paidTransactions = useMemo(() => {
    return selectedMonthTransactions.filter(
      (transaction) => transaction.status === "paid",
    );
  }, [selectedMonthTransactions]);

  const pendingTransactions = useMemo(() => {
    return selectedMonthTransactions.filter((transaction) => {
      return transaction.status === "pending" || transaction.status === "confirmed";
    });
  }, [selectedMonthTransactions]);

  const invoiceTransactions = useMemo(() => {
    const invoiceIds = new Set(selectedMonthInvoices.map((invoice) => invoice.id));

    return transactions.filter((transaction) => {
      if (!transaction.invoice_id) return false;
      if (transaction.status === "cancelled") return false;

      return invoiceIds.has(transaction.invoice_id);
    });
  }, [transactions, selectedMonthInvoices]);

  const totalForecast = useMemo(() => {
    return sumTransactions(selectedMonthTransactions);
  }, [selectedMonthTransactions]);

  const singleAmount = useMemo(() => {
    return sumTransactions(singleTransactions);
  }, [singleTransactions]);

  const installmentAmount = useMemo(() => {
    return sumTransactions(installmentTransactions);
  }, [installmentTransactions]);

  const recurringAmount = useMemo(() => {
    return sumTransactions(recurringTransactions);
  }, [recurringTransactions]);

  const paidAmount = useMemo(() => {
    return sumTransactions(paidTransactions);
  }, [paidTransactions]);

  const pendingAmount = useMemo(() => {
    return sumTransactions(pendingTransactions);
  }, [pendingTransactions]);

  const invoiceAmount = useMemo(() => {
    return sumTransactions(invoiceTransactions);
  }, [invoiceTransactions]);

  async function loadPageData() {
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
        error instanceof Error ? error.message : "Erro ao carregar previsão.";
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

  if (!activeWorkspace) {
    return (
      <Card>
        <h2>Nenhum workspace selecionado</h2>
        <p>Crie ou selecione um workspace antes de visualizar a previsão.</p>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Previsão</span>
          <h2>Previsão financeira mensal</h2>
          <p>
            Visualize os gastos previstos do mês com base em transações avulsas,
            parceladas, fixas e faturas.
          </p>
        </div>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <Card>
        <div className={styles.filterHeader}>
          <div>
            <h3>Período</h3>
            <p>Selecione o mês e o ano que deseja analisar.</p>
          </div>

          <Search size={20} />
        </div>

        <div className={styles.filtersGrid}>
          <label>
            Mês
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
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
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            />
          </label>
        </div>
      </Card>

      {loading ? (
        <Card>
          <p className={styles.empty}>Carregando previsão...</p>
        </Card>
      ) : null}

      {!loading ? (
        <>
          <div className={styles.summaryGrid}>
            <Card>
              <div className={styles.summaryHeader}>
                <span>Total previsto</span>
                <TrendingUp size={18} />
              </div>
              <strong>{formatCurrency(totalForecast)}</strong>
              <small>
                {selectedMonthTransactions.length} transação(ões) em{" "}
                {getMonthName(selectedMonth)}/{selectedYear}
              </small>
            </Card>

            <Card>
              <div className={styles.summaryHeader}>
                <span>Avulsas</span>
                <ReceiptText size={18} />
              </div>
              <strong>{formatCurrency(singleAmount)}</strong>
              <small>{singleTransactions.length} lançamento(s)</small>
            </Card>

            <Card>
              <div className={styles.summaryHeader}>
                <span>Parceladas</span>
                <CreditCard size={18} />
              </div>
              <strong>{formatCurrency(installmentAmount)}</strong>
              <small>{installmentTransactions.length} parcela(s)</small>
            </Card>

            <Card>
              <div className={styles.summaryHeader}>
                <span>Fixas</span>
                <CalendarDays size={18} />
              </div>
              <strong>{formatCurrency(recurringAmount)}</strong>
              <small>{recurringTransactions.length} lançamento(s) fixo(s)</small>
            </Card>
          </div>

          <div className={styles.summaryGrid}>
            <Card>
              <div className={styles.summaryHeader}>
                <span>Pago</span>
                <WalletIcon size={18} />
              </div>
              <strong>{formatCurrency(paidAmount)}</strong>
              <small>{paidTransactions.length} transação(ões) pagas</small>
            </Card>

            <Card>
              <div className={styles.summaryHeader}>
                <span>Pendente/confirmado</span>
                <ReceiptText size={18} />
              </div>
              <strong>{formatCurrency(pendingAmount)}</strong>
              <small>{pendingTransactions.length} transação(ões)</small>
            </Card>

            <Card>
              <div className={styles.summaryHeader}>
                <span>Em faturas</span>
                <CreditCard size={18} />
              </div>
              <strong>{formatCurrency(invoiceAmount)}</strong>
              <small>{selectedMonthInvoices.length} fatura(s) no mês</small>
            </Card>

            <Card>
              <div className={styles.summaryHeader}>
                <span>Faturas encontradas</span>
                <CalendarDays size={18} />
              </div>
              <strong>{selectedMonthInvoices.length}</strong>
              <small>Faturas abertas, fechadas ou pagas</small>
            </Card>
          </div>

          <div className={styles.grid}>
            <Card>
              <div className={styles.cardHeader}>
                <div>
                  <h3>Faturas do mês</h3>
                  <p>Faturas vinculadas ao período selecionado.</p>
                </div>
              </div>

              {selectedMonthInvoices.length === 0 ? (
                <p className={styles.empty}>Nenhuma fatura encontrada neste mês.</p>
              ) : null}

              <div className={styles.list}>
                {selectedMonthInvoices.map((invoice) => {
                  const wallet = walletsById.get(invoice.wallet_id);

                  const total = invoiceTransactions
                    .filter((transaction) => transaction.invoice_id === invoice.id)
                    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

                  return (
                    <div key={invoice.id} className={styles.item}>
                      <div>
                        <strong>
                          {wallet?.name ?? "Carteira removida"} ·{" "}
                          {String(invoice.month).padStart(2, "0")}/{invoice.year}
                        </strong>
                        <span>Status: {invoice.status}</span>
                      </div>

                      <strong>{formatCurrency(total)}</strong>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <div className={styles.cardHeader}>
                <div>
                  <h3>Transações do mês</h3>
                  <p>Todos os lançamentos que compõem a previsão mensal.</p>
                </div>
              </div>

              {selectedMonthTransactions.length === 0 ? (
                <p className={styles.empty}>
                  Nenhuma transação encontrada neste mês.
                </p>
              ) : null}

              <div className={styles.transactionList}>
                {selectedMonthTransactions.map((transaction) => {
                  const wallet = transaction.wallet_id
                    ? walletsById.get(transaction.wallet_id)
                    : null;

                  const category = transaction.category_id
                    ? categoriesById.get(transaction.category_id)
                    : null;

                  const invoice = transaction.invoice_id
                    ? invoicesById.get(transaction.invoice_id)
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

                        <small>
                          {getTransactionTypeLabel(transaction.transaction_type)} ·{" "}
                          {getTransactionStatusLabel(transaction.status)}
                          {invoice
                            ? ` · Fatura ${String(invoice.month).padStart(2, "0")}/${invoice.year}`
                            : " · Sem fatura"}
                        </small>
                      </div>

                      <strong>{formatCurrency(Number(transaction.amount))}</strong>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}