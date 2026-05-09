import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Trash2, Wallet as WalletIcon } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useWorkspace } from "../../hooks/useWorkspace";
import {
  createWallet,
  deactivateWallet,
  listWallets,
} from "../../services/wallets/walletService";
import type { Wallet, WalletType } from "../../types/finance";
import styles from "./styles.module.css";

const walletTypeOptions: Array<{
  value: WalletType;
  label: string;
}> = [
    {
      value: "credit_card",
      label: "Cartão de crédito",
    },
    {
      value: "debit_card",
      label: "Cartão de débito",
    },
    {
      value: "pix",
      label: "Pix",
    },
    {
      value: "cash",
      label: "Dinheiro",
    },
    {
      value: "bank_account",
      label: "Conta bancária",
    },
    {
      value: "other",
      label: "Outro",
    },
  ];

function getWalletTypeLabel(type: WalletType) {
  return walletTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export default function Wallets() {
  const { activeWorkspace } = useWorkspace();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("credit_card");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isCreditCard = type === "credit_card";

  const activeWalletsCount = useMemo(() => wallets.length, [wallets]);

  async function loadWallets() {
    if (!activeWorkspace) {
      setWallets([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const data = await listWallets(activeWorkspace.id);
      setWallets(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar carteiras.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallets();
  }, [activeWorkspace?.id]);

  async function handleCreateWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de criar uma carteira.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      await createWallet({
        workspace_id: activeWorkspace.id,
        name,
        type,
        closing_day: isCreditCard && closingDay ? Number(closingDay) : null,
        due_day: isCreditCard && dueDay ? Number(dueDay) : null,
      });

      setName("");
      setType("credit_card");
      setClosingDay("");
      setDueDay("");

      await loadWallets();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao criar carteira.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivateWallet(walletId: string) {
    const confirmed = window.confirm("Deseja realmente inativar esta carteira?");

    if (!confirmed) return;

    try {
      await deactivateWallet(walletId);
      await loadWallets();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao inativar carteira.";
      setErrorMessage(message);
    }
  }

  if (!activeWorkspace) {
    return (
      <Card>
        <h2>Nenhum workspace selecionado</h2>
        <p>Crie ou selecione um workspace antes de cadastrar carteiras.</p>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Carteiras</span>
          <h2>Carteiras do workspace</h2>
          <p>
            Cadastre cartões, Pix, dinheiro, contas bancárias e outras formas de
            pagamento do workspace.
          </p>
        </div>

        <div className={styles.counter}>
          <strong>{activeWalletsCount}</strong>
          <span>ativas</span>
        </div>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Nova carteira</h3>
              <p>Crie uma carteira para lançar despesas.</p>
            </div>

            <Plus size={20} />
          </div>

          <form className={styles.form} onSubmit={handleCreateWallet}>
            <label>
              Nome
              <input
                type="text"
                placeholder="Ex: Cartão Pai"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

            <label>
              Tipo
              <select
                value={type}
                onChange={(event) => setType(event.target.value as WalletType)}
              >
                {walletTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {isCreditCard ? (
              <div className={styles.twoColumns}>
                <label>
                  Fechamento
                  <input
                    type="number"
                    placeholder="Ex: 25"
                    min={1}
                    max={31}
                    value={closingDay}
                    onChange={(event) => setClosingDay(event.target.value)}
                  />
                </label>

                <label>
                  Vencimento
                  <input
                    type="number"
                    placeholder="Ex: 5"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(event) => setDueDay(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Criando..." : "Criar carteira"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Carteiras cadastradas</h3>
              <p>Use essas carteiras nos lançamentos financeiros.</p>
            </div>

            <WalletIcon size={20} />
          </div>

          {loading ? <p className={styles.empty}>Carregando carteiras...</p> : null}

          {!loading && wallets.length === 0 ? (
            <p className={styles.empty}>Nenhuma carteira cadastrada ainda.</p>
          ) : null}

          <div className={styles.list}>
            {wallets.map((wallet) => (
              <div key={wallet.id} className={styles.item}>
                <div className={styles.itemIcon}>
                  <CreditCard size={18} />
                </div>

                <div className={styles.itemContent}>
                  <strong>{wallet.name}</strong>
                  <span>{getWalletTypeLabel(wallet.type)}</span>

                  {wallet.type === "credit_card" ? (
                    <small>
                      Fecha dia {wallet.closing_day ?? "-"} · vence dia{" "}
                      {wallet.due_day ?? "-"}
                    </small>
                  ) : null}
                </div>

                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={() => handleDeactivateWallet(wallet.id)}
                  aria-label="Inativar carteira"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}