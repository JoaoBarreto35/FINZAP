import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, MessageCircle, Send } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspace } from "../../hooks/useWorkspace";
import { listCategories } from "../../services/categories/categoryService";
import { createInstallmentPurchase } from "../../services/installments/installmentService";
import { createRecurringRule } from "../../services/recurring/recurringService";
import { createTransaction } from "../../services/transactions/transactionService";
import { listWallets } from "../../services/wallets/walletService";
import type { Category, TransactionType, Wallet } from "../../types/finance";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  parseWhatsappMessage,
  type ParsedWhatsappMessage,
} from "../../utils/whatsappParser/parseWhatsappMessage";
import styles from "./styles.module.css";

type ChatMessage = {
  id: string;
  role: "user" | "system";
  text: string;
  parsed?: ParsedWhatsappMessage;
};

function createMessageId() {
  return crypto.randomUUID();
}

function getTransactionTypeLabel(type: TransactionType) {
  const labels: Record<TransactionType, string> = {
    single: "Avulsa",
    installment: "Parcelada",
    recurring: "Fixa mensal",
  };

  return labels[type];
}

function getChargeDayFromDate(dateValue: string) {
  if (!dateValue) return 1;

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return 1;
  }

  return date.getDate();
}

export default function WhatsAppSimulator() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createMessageId(),
      role: "system",
      text:
        "Olá! Simule uma mensagem. Ex: mercado 35 pix ontem, notebook 2400 cartão em 12x, netflix 39,90 cartão todo mês dia 10",
    },
  ]);

  const [parsedMessage, setParsedMessage] =
    useState<ParsedWhatsappMessage | null>(null);

  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedType, setSelectedType] = useState<TransactionType>("single");
  const [installmentsCount, setInstallmentsCount] = useState("2");
  const [chargeDay, setChargeDay] = useState("1");

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const walletsById = useMemo(() => {
    return new Map(wallets.map((wallet) => [wallet.id, wallet]));
  }, [wallets]);

  const categoriesById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  async function loadPageData() {
    if (!activeWorkspace) {
      setWallets([]);
      setCategories([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [walletsData, categoriesData] = await Promise.all([
        listWallets(activeWorkspace.id),
        listCategories(activeWorkspace.id),
      ]);

      setWallets(walletsData);
      setCategories(categoriesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar simulador.";
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

  function handleSimulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) return;

    const parsed = parseWhatsappMessage(message, wallets, categories);

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createMessageId(),
        role: "user",
        text: message,
      },
      {
        id: createMessageId(),
        role: "system",
        text:
          parsed.confidence === "high"
            ? "Entendi esse lançamento. Confira antes de salvar."
            : "Entendi parcialmente. Confira e ajuste antes de salvar.",
        parsed,
      },
    ]);

    setParsedMessage(parsed);
    setSelectedWalletId(parsed.wallet_id ?? wallets[0]?.id ?? "");
    setSelectedCategoryId(parsed.category_id ?? categories[0]?.id ?? "");
    setSelectedDate(parsed.transaction_date);
    setSelectedType(parsed.transaction_type);
    setInstallmentsCount(String(parsed.installments_count ?? 2));
    setChargeDay(
      String(parsed.charge_day ?? getChargeDayFromDate(parsed.transaction_date)),
    );

    setMessage("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleCreateSingleTransaction() {
    if (!activeWorkspace || !user || !parsedMessage) return;

    await createTransaction(
      {
        workspace_id: activeWorkspace.id,
        wallet_id: selectedWalletId,
        category_id: selectedCategoryId || null,
        amount: parsedMessage.amount,
        description: parsedMessage.description,
        transaction_date: selectedDate,
        transaction_type: "single",
        status: "pending",
      },
      user.id,
    );
  }

  async function handleCreateInstallmentPurchase() {
    if (!activeWorkspace || !parsedMessage) return;

    const date = new Date(`${selectedDate}T00:00:00`);
    const parsedInstallmentsCount = Number(installmentsCount);

    await createInstallmentPurchase({
      workspace_id: activeWorkspace.id,
      wallet_id: selectedWalletId,
      category_id: selectedCategoryId || null,
      description: parsedMessage.description,
      total_amount: parsedMessage.amount,
      installments_count: parsedInstallmentsCount,
      first_month: date.getMonth() + 1,
      first_year: date.getFullYear(),
      status: "pending",
    });
  }

  async function handleCreateRecurringRule() {
    if (!activeWorkspace || !parsedMessage) return;

    const date = new Date(`${selectedDate}T00:00:00`);
    const parsedChargeDay = Number(chargeDay);

    await createRecurringRule({
      workspace_id: activeWorkspace.id,
      wallet_id: selectedWalletId,
      category_id: selectedCategoryId || null,
      description: parsedMessage.description,
      amount: parsedMessage.amount,
      charge_day: parsedChargeDay,
      start_month: date.getMonth() + 1,
      start_year: date.getFullYear(),
    });
  }

  async function handleCreateTransaction() {
    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de criar lançamentos.");
      return;
    }

    if (!user) {
      setErrorMessage("Usuário não autenticado.");
      return;
    }

    if (!parsedMessage) {
      setErrorMessage("Simule uma mensagem antes de salvar.");
      return;
    }

    if (parsedMessage.amount <= 0) {
      setErrorMessage("Informe uma mensagem com valor válido.");
      return;
    }

    if (!selectedWalletId) {
      setErrorMessage("Selecione uma carteira.");
      return;
    }

    if (!selectedDate) {
      setErrorMessage("Selecione uma data.");
      return;
    }

    if (selectedType === "installment" && Number(installmentsCount) <= 1) {
      setErrorMessage("A quantidade de parcelas deve ser maior que 1.");
      return;
    }

    if (
      selectedType === "recurring" &&
      (Number(chargeDay) < 1 || Number(chargeDay) > 31)
    ) {
      setErrorMessage("O dia de cobrança deve estar entre 1 e 31.");
      return;
    }

    setCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (selectedType === "single") {
        await handleCreateSingleTransaction();
      }

      if (selectedType === "installment") {
        await handleCreateInstallmentPurchase();
      }

      if (selectedType === "recurring") {
        await handleCreateRecurringRule();
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "system",
          text: `${getTransactionTypeLabel(selectedType)} criada com sucesso no workspace.`,
        },
      ]);

      setParsedMessage(null);
      setSelectedWalletId("");
      setSelectedCategoryId("");
      setSelectedDate("");
      setSelectedType("single");
      setInstallmentsCount("2");
      setChargeDay("1");

      setSuccessMessage(`${getTransactionTypeLabel(selectedType)} criada com sucesso.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao criar lançamento.";
      setErrorMessage(message);
    } finally {
      setCreating(false);
    }
  }

  if (!activeWorkspace) {
    return (
      <Card>
        <h2>Nenhum workspace selecionado</h2>
        <p>Crie ou selecione um workspace antes de usar o simulador.</p>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>WhatsApp</span>
          <h2>Simulador de mensagens</h2>
          <p>
            Teste como o FinZap poderia receber mensagens simples e transformar
            em lançamentos avulsos, parcelados ou fixos.
          </p>
        </div>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Conversa simulada</h3>
              <p>Digite uma mensagem como se estivesse no WhatsApp.</p>
            </div>

            <MessageCircle size={20} />
          </div>

          {loading ? <p className={styles.empty}>Carregando dados...</p> : null}

          <div className={styles.chatBox}>
            {messages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                className={
                  chatMessage.role === "user"
                    ? `${styles.chatMessage} ${styles.userMessage}`
                    : `${styles.chatMessage} ${styles.systemMessage}`
                }
              >
                <span>{chatMessage.role === "user" ? "Você" : "FinZap"}</span>
                <p>{chatMessage.text}</p>

                {chatMessage.parsed ? (
                  <div className={styles.parsedBox}>
                    <strong>Prévia identificada</strong>

                    <small>
                      Tipo: {getTransactionTypeLabel(chatMessage.parsed.transaction_type)}
                    </small>

                    <small>
                      Valor: {formatCurrency(chatMessage.parsed.amount)}
                    </small>

                    <small>Data: {chatMessage.parsed.transaction_date}</small>

                    {chatMessage.parsed.installments_count ? (
                      <small>
                        Parcelas: {chatMessage.parsed.installments_count}x
                      </small>
                    ) : null}

                    {chatMessage.parsed.charge_day ? (
                      <small>Dia de cobrança: {chatMessage.parsed.charge_day}</small>
                    ) : null}

                    <small>
                      Carteira:{" "}
                      {chatMessage.parsed.wallet_id
                        ? walletsById.get(chatMessage.parsed.wallet_id)?.name
                        : "Não identificada"}
                    </small>

                    <small>
                      Categoria:{" "}
                      {chatMessage.parsed.category_id
                        ? categoriesById.get(chatMessage.parsed.category_id)?.name
                        : "Não identificada"}
                    </small>

                    <small>Confiança: {chatMessage.parsed.confidence}</small>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <form className={styles.messageForm} onSubmit={handleSimulate}>
            <input
              type="text"
              placeholder="Ex: notebook 2400 cartão em 12x"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />

            <Button type="submit">
              <Send size={17} />
              Enviar
            </Button>
          </form>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Conferência do lançamento</h3>
              <p>Ajuste tipo, data, carteira e categoria antes de salvar.</p>
            </div>

            <Bot size={20} />
          </div>

          {!parsedMessage ? (
            <p className={styles.empty}>
              Envie uma mensagem no simulador para gerar uma prévia.
            </p>
          ) : null}

          {parsedMessage ? (
            <div className={styles.reviewBox}>
              <div className={styles.reviewItem}>
                <span>Descrição</span>
                <strong>{parsedMessage.description}</strong>
              </div>

              <div className={styles.reviewItem}>
                <span>Valor</span>
                <strong>{formatCurrency(parsedMessage.amount)}</strong>
              </div>

              <label>
                Tipo
                <select
                  value={selectedType}
                  onChange={(event) =>
                    setSelectedType(event.target.value as TransactionType)
                  }
                >
                  <option value="single">Avulsa</option>
                  <option value="installment">Parcelada</option>
                  <option value="recurring">Fixa mensal</option>
                </select>
              </label>

              <label>
                Data
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);

                    if (selectedType === "recurring") {
                      setChargeDay(String(getChargeDayFromDate(event.target.value)));
                    }
                  }}
                  required
                />
              </label>

              {selectedType === "installment" ? (
                <label>
                  Parcelas
                  <input
                    type="number"
                    min={2}
                    max={120}
                    value={installmentsCount}
                    onChange={(event) => setInstallmentsCount(event.target.value)}
                  />
                </label>
              ) : null}

              {selectedType === "recurring" ? (
                <label>
                  Dia de cobrança
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={chargeDay}
                    onChange={(event) => setChargeDay(event.target.value)}
                  />
                </label>
              ) : null}

              <label>
                Carteira
                <select
                  value={selectedWalletId}
                  onChange={(event) => setSelectedWalletId(event.target.value)}
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
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                >
                  <option value="">Sem categoria</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              {parsedMessage.warnings.length > 0 ? (
                <div className={styles.warningBox}>
                  <strong>Atenção</strong>

                  {parsedMessage.warnings.map((warning) => (
                    <span key={warning}>{warning}</span>
                  ))}
                </div>
              ) : null}

              <Button
                type="button"
                onClick={handleCreateTransaction}
                disabled={creating}
              >
                <CheckCircle2 size={17} />
                {creating
                  ? "Salvando..."
                  : `Salvar ${getTransactionTypeLabel(selectedType)}`}
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}