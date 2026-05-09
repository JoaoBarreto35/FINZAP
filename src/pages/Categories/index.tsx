import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Tag, Trash2, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useWorkspace } from "../../hooks/useWorkspace";
import {
  createCategory,
  deactivateCategory,
  listCategories,
  updateCategory,
} from "../../services/categories/categoryService";
import type { Category } from "../../types/finance";
import styles from "./styles.module.css";

const defaultColors = [
  "#16a34a",
  "#2563eb",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

const suggestedCategories = [
  "Mercado",
  "Alimentação",
  "Transporte",
  "Casa",
  "Lazer",
  "Assinaturas",
  "Saúde",
  "Educação",
  "Outros",
];

export default function Categories() {
  const { activeWorkspace } = useWorkspace();

  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColors[0]);
  const [icon, setIcon] = useState("tag");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingSuggestion, setCreatingSuggestion] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(editingCategory);
  const categoryCount = useMemo(() => categories.length, [categories]);

  async function loadCategories() {
    if (!activeWorkspace) {
      setCategories([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const data = await listCategories(activeWorkspace.id);
      setCategories(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar categorias.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, [activeWorkspace?.id]);

  function resetForm() {
    setEditingCategory(null);
    setName("");
    setColor(defaultColors[0]);
    setIcon("tag");
  }

  function handleStartEdit(category: Category) {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color ?? defaultColors[0]);
    setIcon(category.icon ?? "tag");
    setErrorMessage("");
  }

  async function handleSubmitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de salvar uma categoria.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name,
          color,
          icon,
        });
      } else {
        await createCategory({
          workspace_id: activeWorkspace.id,
          name,
          color,
          icon,
        });
      }

      resetForm();
      await loadCategories();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar categoria.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSuggestion(categoryName: string) {
    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de criar categorias.");
      return;
    }

    setCreatingSuggestion(categoryName);
    setErrorMessage("");

    try {
      await createCategory({
        workspace_id: activeWorkspace.id,
        name: categoryName,
        color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
        icon: "tag",
      });

      await loadCategories();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao criar categoria sugerida.";
      setErrorMessage(message);
    } finally {
      setCreatingSuggestion("");
    }
  }

  async function handleDeactivateCategory(categoryId: string) {
    const confirmed = window.confirm("Deseja realmente inativar esta categoria?");

    if (!confirmed) return;

    try {
      await deactivateCategory(categoryId);

      if (editingCategory?.id === categoryId) {
        resetForm();
      }

      await loadCategories();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao inativar categoria.";
      setErrorMessage(message);
    }
  }

  const missingSuggestedCategories = suggestedCategories.filter(
    (suggestedName) =>
      !categories.some(
        (category) => category.name.toLowerCase() === suggestedName.toLowerCase(),
      ),
  );

  if (!activeWorkspace) {
    return (
      <Card>
        <h2>Nenhum workspace selecionado</h2>
        <p>Crie ou selecione um workspace antes de cadastrar categorias.</p>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Categorias</span>
          <h2>Categorias do workspace</h2>
          <p>
            Organize seus gastos por categorias próprias do workspace, como
            mercado, transporte, casa e assinaturas.
          </p>
        </div>

        <div className={styles.counter}>
          <strong>{categoryCount}</strong>
          <span>ativas</span>
        </div>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <div className={styles.grid}>
        <div className={styles.leftColumn}>
          <Card>
            <div className={styles.cardHeader}>
              <div>
                <h3>{isEditing ? "Editar categoria" : "Nova categoria"}</h3>
                <p>
                  {isEditing
                    ? "Altere os dados da categoria selecionada."
                    : "Crie uma categoria para classificar transações."}
                </p>
              </div>

              {isEditing ? <Edit3 size={20} /> : <Plus size={20} />}
            </div>

            <form className={styles.form} onSubmit={handleSubmitCategory}>
              <label>
                Nome
                <input
                  type="text"
                  placeholder="Ex: Mercado"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>

              <label>
                Ícone
                <input
                  type="text"
                  placeholder="Ex: tag, food, car"
                  value={icon}
                  onChange={(event) => setIcon(event.target.value)}
                />
              </label>

              <label>
                Cor
                <div className={styles.colorOptions}>
                  {defaultColors.map((optionColor) => (
                    <button
                      key={optionColor}
                      type="button"
                      className={
                        color === optionColor
                          ? `${styles.colorButton} ${styles.colorActive}`
                          : styles.colorButton
                      }
                      style={{ backgroundColor: optionColor }}
                      onClick={() => setColor(optionColor)}
                      aria-label={`Selecionar cor ${optionColor}`}
                    />
                  ))}
                </div>
              </label>

              <div className={styles.formActions}>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? "Salvando..."
                    : isEditing
                      ? "Salvar alterações"
                      : "Criar categoria"}
                </Button>

                {isEditing ? (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancelar edição
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>

          {!isEditing ? (
            <Card>
              <div className={styles.cardHeader}>
                <div>
                  <h3>Sugestões rápidas</h3>
                  <p>Crie categorias comuns com um clique.</p>
                </div>
              </div>

              <div className={styles.suggestions}>
                {missingSuggestedCategories.map((suggestedName) => (
                  <button
                    key={suggestedName}
                    type="button"
                    onClick={() => handleCreateSuggestion(suggestedName)}
                    disabled={creatingSuggestion === suggestedName}
                  >
                    {creatingSuggestion === suggestedName
                      ? "Criando..."
                      : suggestedName}
                  </button>
                ))}

                {missingSuggestedCategories.length === 0 ? (
                  <p className={styles.empty}>Todas as sugestões já foram criadas.</p>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>

        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Categorias cadastradas</h3>
              <p>Essas categorias aparecem na criação de transações.</p>
            </div>

            <Tag size={20} />
          </div>

          {loading ? <p className={styles.empty}>Carregando categorias...</p> : null}

          {!loading && categories.length === 0 ? (
            <p className={styles.empty}>Nenhuma categoria cadastrada ainda.</p>
          ) : null}

          <div className={styles.list}>
            {categories.map((category) => (
              <div key={category.id} className={styles.item}>
                <div
                  className={styles.itemColor}
                  style={{
                    backgroundColor: category.color ?? "#16a34a",
                  }}
                />

                <div className={styles.itemContent}>
                  <strong>{category.name}</strong>
                  <span>Ícone: {category.icon || "tag"}</span>
                </div>

                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={() => handleStartEdit(category)}
                  aria-label="Editar categoria"
                >
                  <Edit3 size={17} />
                </button>

                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={() => handleDeactivateCategory(category.id)}
                  aria-label="Inativar categoria"
                >
                  {editingCategory?.id === category.id ? <X size={17} /> : <Trash2 size={17} />}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}