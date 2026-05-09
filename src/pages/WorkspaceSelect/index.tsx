import type { FormEvent } from "react";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useWorkspace } from "../../hooks/useWorkspace";
import styles from "./styles.module.css";

export default function WorkspaceSelect() {
  const {
    workspaces,
    activeWorkspace,
    loading,
    createWorkspace,
    selectWorkspace,
  } = useWorkspace();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSubmitting(true);

    try {
      await createWorkspace({
        name,
        description,
      });

      setName("");
      setDescription("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao criar workspace.";

      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Workspaces</span>
          <h2>Selecione ou crie um workspace</h2>
          <p>
            Cada workspace tem suas próprias carteiras, categorias, faturas,
            transações e membros.
          </p>
        </div>
      </section>

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Meus workspaces</h3>
              <p>Escolha o espaço financeiro que deseja controlar agora.</p>
            </div>
          </div>

          {loading ? (
            <p className={styles.empty}>Carregando workspaces...</p>
          ) : null}

          {!loading && workspaces.length === 0 ? (
            <p className={styles.empty}>
              Você ainda não tem nenhum workspace. Crie o primeiro ao lado.
            </p>
          ) : null}

          <div className={styles.workspaceList}>
            {workspaces.map((workspace) => {
              const isActive = activeWorkspace?.id === workspace.id;

              return (
                <button
                  key={workspace.id}
                  type="button"
                  className={
                    isActive
                      ? `${styles.workspaceItem} ${styles.active}`
                      : styles.workspaceItem
                  }
                  onClick={() => selectWorkspace(workspace.id)}
                >
                  <div>
                    <strong>{workspace.name}</strong>
                    <span>{workspace.description || "Sem descrição"}</span>
                  </div>

                  {isActive ? <Check size={18} /> : null}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Criar workspace</h3>
              <p>Comece um novo controle financeiro colaborativo.</p>
            </div>

            <Plus size={20} />
          </div>

          <form className={styles.form} onSubmit={handleCreateWorkspace}>
            <label>
              Nome
              <input
                type="text"
                placeholder="Ex: João e Pai"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                required
              />
            </label>

            <label>
              Descrição
              <textarea
                placeholder="Ex: Controle dos gastos compartilhados do cartão"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </label>

            {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Criando..." : "Criar workspace"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}