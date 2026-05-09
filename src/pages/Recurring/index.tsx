import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Edit3, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useWorkspace } from "../../hooks/useWorkspace";
import { listCategories } from "../../services/categories/categoryService";
import {
  createRecurringRule,
  deactivateRecurringRule,
  generateRecurringTransactionsForMonth,
  listRecurringRules,
  updateRecurringRule,
} from "../../services/recurring/recurringService";
import { listWallets } from "../../services/wallets/walletService";
import type { Category, RecurringRule, Wallet } from "../../types/finance";
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

function getCurrentMonth() {
  return new Date().getMonth() + 1;
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getMonthName(month: number) {
  return monthOptions.find((option) => option.value === month)?.label ?? String(month);
}

export default function Recurring() {
  const { activeWorkspace } = useWorkspace();

  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [chargeDay, setChargeDay] = useState("1");
  const [startMonth, setStartMonth] = useState(getCurrentMonth());
  const [startYear, setStartYear] = useState(getCurrentYear());
  const [endMonth, setEndMonth] = useState("");
  const [endYear, setEndYear] = useState("");
  const [generateMonth, setGenerateMonth] = useState(getCurrentMonth());
  const [generateYear, setGenerateYear] = useState(getCurrentYear());

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = Boolean(editingRule);

  const activeRules = useMemo(() => {
    return rules.filter((rule) => rule.active);
  }, [rules]);

  const totalMonthlyAmount = useMemo(() => {
    return activeRules.reduce((sum, rule) => sum + Number(rule.amount), 0);
  }, [activeRules]);

  const walletsById = useMemo(() => {
    return new Map(wallets.map((wallet) => [wallet.id, wallet]));
  }, [wallets]);

  const categoriesById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  async function loadPageData() {
    if (!activeWorkspace) {
      setRules([]);
      setWallets([]);
      setCategories([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [rulesData, walletsData, categoriesData] = await Promise.all([
        listRecurringRules(activeWorkspace.id),
        listWallets(activeWorkspace.id),
        listCategories(activeWorkspace.id),
      ]);

      setRules(rulesData);
      setWallets(walletsData);
      setCategories(categoriesData);

      if (!walletId && walletsData[0]) {
        setWalletId(walletsData[0].id);
      }

      if (!categoryId && categoriesData[0]) {
        setCategoryId(categoriesData[0].id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar gastos fixos.";
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
    setEditingRule(null);
    setDescription("");
    setAmount("");
    setWalletId(wallets[0]?.id ?? "");
    setCategoryId(categories[0]?.id ?? "");
    setChargeDay("1");
    setStartMonth(getCurrentMonth());
    setStartYear(getCurrentYear());
    setEndMonth("");
    setEndYear("");
  }

  function handleStartEdit(rule: RecurringRule) {
    setEditingRule(rule);
    setDescription(rule.description);
    setAmount(Number(rule.amount).toFixed(2).replace(".", ","));
    setWalletId(rule.wallet_id);
    setCategoryId(rule.category_id ?? "");
    setChargeDay(String(rule.charge_day));
    setStartMonth(rule.start_month);
    setStartYear(rule.start_year);
    setEndMonth(rule.end_month ? String(rule.end_month) : "");
    setEndYear(rule.end_year ? String(rule.end_year) : "");
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de salvar um gasto fixo.");
      return;
    }

    const parsedAmount = parseCurrencyToNumber(amount);
    const parsedChargeDay = Number(chargeDay);
    const parsedEndMonth = endMonth ? Number(endMonth) : null;
    const parsedEndYear = endYear ? Number(endYear) : null;

    if (parsedAmount <= 0) {
      setErrorMessage("Informe um valor válido.");
      return;
    }

    if (parsedChargeDay < 1 || parsedChargeDay > 31) {
      setErrorMessage("O dia de cobrança deve estar entre 1 e 31.");
      return;
    }

    if (!walletId) {
      setErrorMessage("Selecione uma carteira.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (editingRule) {
        await updateRecurringRule(editingRule.id, {
          wallet_id: walletId,
          category_id: categoryId || null,
          description,
          amount: parsedAmount,
          charge_day: parsedChargeDay,
          start_month: startMonth,
          start_year: startYear,
          end_month: parsedEndMonth,
          end_year: parsedEndYear,
          active: true,
        });
      } else {
        await createRecurringRule({
          workspace_id: activeWorkspace.id,
          wallet_id: walletId,
          category_id: categoryId || null,
          description,
          amount: parsedAmount,
          charge_day: parsedChargeDay,
          start_month: startMonth,
          start_year: startYear,
          end_month: parsedEndMonth,
          end_year: parsedEndYear,
        });
      }

      resetForm();
      await loadPageData();
      setSuccessMessage("Gasto fixo salvo com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar gasto fixo.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(ruleId: string) {
    const confirmed = window.confirm("Deseja pausar/inativar este gasto fixo?");

    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deactivateRecurringRule(ruleId);

      if (editingRule?.id === ruleId) {
        resetForm();
      }

      await loadPageData();
      setSuccessMessage("Gasto fixo inativado.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao inativar gasto fixo.";
      setErrorMessage(message);
    }
  }

  async function handleGenerateMonth() {
    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de gerar lançamentos.");
      return;
    }

    setGenerating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const createdCount = await generateRecurringTransactionsForMonth(
        activeWorkspace.id,
        generateMonth,
        generateYear,
      );

      await loadPageData();

      setSuccessMessage(
        createdCount === 0
          ? "Nenhum lançamento novo foi gerado. Eles podem já existir para este mês."
          : `${createdCount} lançamento(s) fixo(s) gerado(s) com sucesso.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao gerar lançamentos.";
      setErrorMessage(message);
    } finally {
      setGenerating(false);
    }
  }

  if (!activeWorkspace) {
    return (
      <Card>
        <h2>Nenhum workspace selecionado</h2>
        <p>Crie ou selecione um workspace antes de cadastrar gastos fixos.</p>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Fixos</span>
          <h2>Gastos fixos</h2>
          <p>
            Cadastre despesas mensais recorrentes e gere os lançamentos do mês
            quando precisar.
          </p>
        </div>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

      <div className={styles.summaryGrid}>
        <Card>
          <span className={styles.summaryLabel}>Fixos ativos</span>
          <strong className={styles.summaryValue}>{activeRules.length}</strong>
        </Card>

        <Card>
          <span className={styles.summaryLabel}>Previsão mensal</span>
          <strong className={styles.summaryValue}>
            {formatCurrency(totalMonthlyAmount)}
          </strong>
        </Card>
      </div>

      <Card>
        <div className={styles.generateHeader}>
          <div>
            <h3>Gerar lançamentos do mês</h3>
            <p>
              Cria as transações recorrentes do mês selecionado, evitando duplicar
              lançamentos já existentes.
            </p>
          </div>

          <RefreshCcw size={20} />
        </div>

        <div className={styles.generateGrid}>
          <label>
            Mês
            <select
              value={generateMonth}
              onChange={(event) => setGenerateMonth(Number(event.target.value))}
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
              value={generateYear}
              onChange={(event) => setGenerateYear(Number(event.target.value))}
            />
          </label>

          <Button type="button" onClick={handleGenerateMonth} disabled={generating}>
            {generating ? "Gerando..." : "Gerar lançamentos"}
          </Button>
        </div>
      </Card>

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>{isEditing ? "Editar gasto fixo" : "Novo gasto fixo"}</h3>
              <p>
                {isEditing
                  ? "Altere a regra recorrente selecionada."
                  : "Cadastre uma despesa mensal recorrente."}
              </p>
            </div>

            {isEditing ? <Edit3 size={20} /> : <Plus size={20} />}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label>
              Descrição
              <input
                type="text"
                placeholder="Ex: Netflix"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </label>

            <label>
              Valor mensal
              <input
                type="text"
                placeholder="Ex: 39,90"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
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
              Dia de cobrança
              <input
                type="number"
                min={1}
                max={31}
                value={chargeDay}
                onChange={(event) => setChargeDay(event.target.value)}
                required
              />
            </label>

            <label>
              Início
              <select
                value={startMonth}
                onChange={(event) => setStartMonth(Number(event.target.value))}
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
                value={startYear}
                onChange={(event) => setStartYear(Number(event.target.value))}
                required
              />
            </label>

            <label>
              Mês final opcional
              <select
                value={endMonth}
                onChange={(event) => setEndMonth(event.target.value)}
              >
                <option value="">Sem fim</option>

                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ano final opcional
              <input
                type="number"
                min={2000}
                max={2100}
                placeholder="Ex: 2026"
                value={endYear}
                onChange={(event) => setEndYear(event.target.value)}
              />
            </label>

            <div className={styles.formActions}>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar alterações"
                    : "Criar gasto fixo"}
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
              <h3>Fixos cadastrados</h3>
              <p>Regras recorrentes mensais do workspace.</p>
            </div>

            <CalendarClock size={20} />
          </div>

          {loading ? <p className={styles.empty}>Carregando gastos fixos...</p> : null}

          {!loading && rules.length === 0 ? (
            <p className={styles.empty}>Nenhum gasto fixo cadastrado ainda.</p>
          ) : null}

          <div className={styles.list}>
            {rules.map((rule) => {
              const wallet = walletsById.get(rule.wallet_id);
              const category = rule.category_id
                ? categoriesById.get(rule.category_id)
                : null;

              return (
                <div
                  key={rule.id}
                  className={!rule.active ? `${styles.item} ${styles.inactive}` : styles.item}
                >
                  <div className={styles.itemTop}>
                    <div>
                      <strong>{rule.description}</strong>
                      <span>
                        Todo dia {rule.charge_day} · início em{" "}
                        {getMonthName(rule.start_month)}/{rule.start_year}
                      </span>
                    </div>

                    <strong className={styles.amount}>
                      {formatCurrency(Number(rule.amount))}
                    </strong>
                  </div>

                  <div className={styles.metaGrid}>
                    <span>{wallet?.name ?? "Carteira removida"}</span>
                    <span>{category?.name ?? "Sem categoria"}</span>
                    <span>{rule.active ? "Ativo" : "Inativo"}</span>
                  </div>

                  {rule.active ? (
                    <div className={styles.actions}>
                      <button type="button" onClick={() => handleStartEdit(rule)}>
                        <Edit3 size={16} />
                        Editar
                      </button>

                      <button type="button" onClick={() => handleDeactivate(rule.id)}>
                        <Trash2 size={16} />
                        Inativar
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