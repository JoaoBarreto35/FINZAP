import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, ListOrdered, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useWorkspace } from "../../hooks/useWorkspace";
import { listCategories } from "../../services/categories/categoryService";
import {
  cancelInstallmentGroup,
  createInstallmentPurchase,
  listInstallmentGroups,
} from "../../services/installments/installmentService";
import { listWallets } from "../../services/wallets/walletService";
import type {
  Category,
  InstallmentGroup,
  TransactionStatus,
  Wallet,
} from "../../types/finance";
import { formatCurrency } from "../../utils/formatCurrency";
import { parseCurrencyToNumber } from "../../utils/parseCurrency";
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

const statusOptions: Array<{
  value: TransactionStatus;
  label: string;
}> = [
    { value: "pending", label: "Pendente" },
    { value: "confirmed", label: "Confirmado" },
    { value: "paid", label: "Pago" },
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

export default function Installments() {
  const { activeWorkspace } = useWorkspace();

  const [groups, setGroups] = useState<InstallmentGroup[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("2");
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [firstMonth, setFirstMonth] = useState(getCurrentMonth());
  const [firstYear, setFirstYear] = useState(getCurrentYear());
  const [status, setStatus] = useState<TransactionStatus>("pending");

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

  const totalActiveAmount = useMemo(() => {
    return groups
      .filter((group) => group.status === "active")
      .reduce((sum, group) => sum + Number(group.total_amount), 0);
  }, [groups]);

  async function loadPageData() {
    if (!activeWorkspace) {
      setGroups([]);
      setWallets([]);
      setCategories([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [groupsData, walletsData, categoriesData] = await Promise.all([
        listInstallmentGroups(activeWorkspace.id),
        listWallets(activeWorkspace.id),
        listCategories(activeWorkspace.id),
      ]);

      setGroups(groupsData);
      setWallets(walletsData);
      setCategories(categoriesData);

      const firstCreditCard = walletsData.find((wallet) => wallet.type === "credit_card");

      if (!walletId && firstCreditCard) {
        setWalletId(firstCreditCard.id);
      }

      if (!categoryId && categoriesData[0]) {
        setCategoryId(categoriesData[0].id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar parceladas.";
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

  function resetForm() {
    setDescription("");
    setTotalAmount("");
    setInstallmentsCount("2");
    setFirstMonth(getCurrentMonth());
    setFirstYear(getCurrentYear());
    setStatus("pending");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de criar uma compra parcelada.");
      return;
    }

    const parsedAmount = parseCurrencyToNumber(totalAmount);
    const parsedInstallmentsCount = Number(installmentsCount);

    if (parsedAmount <= 0) {
      setErrorMessage("Informe um valor total válido.");
      return;
    }

    if (parsedInstallmentsCount <= 1) {
      setErrorMessage("A quantidade de parcelas deve ser maior que 1.");
      return;
    }

    if (!walletId) {
      setErrorMessage("Selecione um cartão de crédito.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      await createInstallmentPurchase({
        workspace_id: activeWorkspace.id,
        wallet_id: walletId,
        category_id: categoryId || null,
        description,
        total_amount: parsedAmount,
        installments_count: parsedInstallmentsCount,
        first_month: firstMonth,
        first_year: firstYear,
        status,
      });

      resetForm();
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao criar compra parcelada.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelGroup(groupId: string) {
    const confirmed = window.confirm(
      "Deseja cancelar este parcelamento? Parcelas ainda não pagas serão canceladas.",
    );

    if (!confirmed) return;

    setActionLoadingId(groupId);
    setErrorMessage("");

    try {
      await cancelInstallmentGroup(groupId);
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao cancelar parcelamento.";
      setErrorMessage(message);
    } finally {
      setActionLoadingId("");
    }
  }

  if (!activeWorkspace) {
    return (
      <Card>
        <h2>Nenhum workspace selecionado</h2>
        <p>Crie ou selecione um workspace antes de cadastrar compras parceladas.</p>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Parceladas</span>
          <h2>Compras parceladas</h2>
          <p>
            Crie uma compra parcelada e o FinZap gera todas as parcelas futuras
            automaticamente nas faturas corretas.
          </p>
        </div>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <div className={styles.summaryGrid}>
        <Card>
          <span className={styles.summaryLabel}>Parcelamentos ativos</span>
          <strong className={styles.summaryValue}>
            {groups.filter((group) => group.status === "active").length}
          </strong>
        </Card>

        <Card>
          <span className={styles.summaryLabel}>Total parcelado ativo</span>
          <strong className={styles.summaryValue}>
            {formatCurrency(totalActiveAmount)}
          </strong>
        </Card>
      </div>

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Nova compra parcelada</h3>
              <p>Informe valor total e quantidade de parcelas.</p>
            </div>

            <Plus size={20} />
          </div>

          {creditCardWallets.length === 0 ? (
            <p className={styles.warning}>
              Cadastre uma carteira do tipo cartão de crédito antes de criar
              parcelamentos.
            </p>
          ) : null}

          <form className={styles.form} onSubmit={handleSubmit}>
            <label>
              Descrição
              <input
                type="text"
                placeholder="Ex: Notebook"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </label>

            <label>
              Valor total
              <input
                type="text"
                placeholder="Ex: 2400,00"
                value={totalAmount}
                onChange={(event) => setTotalAmount(event.target.value)}
                required
              />
            </label>

            <label>
              Parcelas
              <input
                type="number"
                min={2}
                max={120}
                value={installmentsCount}
                onChange={(event) => setInstallmentsCount(event.target.value)}
                required
              />
            </label>

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
              Categoria
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Sem categoria</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Primeira fatura
              <select
                value={firstMonth}
                onChange={(event) => setFirstMonth(Number(event.target.value))}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ano inicial
              <input
                type="number"
                min={2000}
                max={2100}
                value={firstYear}
                onChange={(event) => setFirstYear(Number(event.target.value))}
                required
              />
            </label>

            <label>
              Status das parcelas
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as TransactionStatus)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <Button
              type="submit"
              disabled={submitting || creditCardWallets.length === 0}
            >
              {submitting ? "Criando..." : "Criar parcelamento"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Parcelamentos cadastrados</h3>
              <p>Compras parceladas e suas parcelas geradas.</p>
            </div>

            <ListOrdered size={20} />
          </div>

          {loading ? <p className={styles.empty}>Carregando parceladas...</p> : null}

          {!loading && groups.length === 0 ? (
            <p className={styles.empty}>Nenhum parcelamento cadastrado ainda.</p>
          ) : null}

          <div className={styles.list}>
            {groups.map((group) => {
              const wallet = walletsById.get(group.wallet_id);
              const category = group.category_id
                ? categoriesById.get(group.category_id)
                : null;

              return (
                <div
                  key={group.id}
                  className={
                    group.status === "cancelled"
                      ? `${styles.item} ${styles.cancelled}`
                      : styles.item
                  }
                >
                  <div className={styles.itemTop}>
                    <div>
                      <strong>{group.description}</strong>
                      <span>
                        {group.installments_count}x de{" "}
                        {formatCurrency(Number(group.installment_amount))}
                      </span>
                    </div>

                    <strong className={styles.amount}>
                      {formatCurrency(Number(group.total_amount))}
                    </strong>
                  </div>

                  <div className={styles.metaGrid}>
                    <span>
                      <CreditCard size={14} />
                      {wallet?.name ?? "Carteira removida"}
                    </span>

                    <span>
                      <ListOrdered size={14} />
                      Início: {getMonthName(group.first_month)}/{group.first_year}
                    </span>

                    <span>
                      {category?.name ?? "Sem categoria"}
                    </span>

                    <span>
                      Status: {group.status}
                    </span>
                  </div>

                  {group.status === "active" ? (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        onClick={() => handleCancelGroup(group.id)}
                        disabled={actionLoadingId === group.id}
                      >
                        <Trash2 size={16} />
                        Cancelar futuras
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