import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Crown, Edit3, Plus, Shield, Trash2, UserRound } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspace } from "../../hooks/useWorkspace";
import {
  addWorkspaceMember,
  listWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "../../services/members/memberService";
import type {
  WorkspaceMemberRole,
  WorkspaceMemberWithProfile,
} from "../../types/workspace";
import styles from "./styles.module.css";

const roleOptions: Array<{
  value: Exclude<WorkspaceMemberRole, "owner">;
  label: string;
  description: string;
}> = [
    {
      value: "admin",
      label: "Admin",
      description: "Gerencia membros e dados financeiros.",
    },
    {
      value: "editor",
      label: "Editor",
      description: "Cria e edita dados financeiros.",
    },
    {
      value: "viewer",
      label: "Visualizador",
      description: "Apenas visualiza informações.",
    },
  ];

function getRoleLabel(role: WorkspaceMemberRole) {
  const labels: Record<WorkspaceMemberRole, string> = {
    owner: "Dono",
    admin: "Admin",
    editor: "Editor",
    viewer: "Visualizador",
  };

  return labels[role];
}

function getRoleIcon(role: WorkspaceMemberRole) {
  if (role === "owner") return <Crown size={18} />;
  if (role === "admin") return <Shield size={18} />;
  if (role === "editor") return <Edit3 size={18} />;

  return <UserRound size={18} />;
}

export default function Members() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<WorkspaceMemberRole, "owner">>("viewer");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currentMember = useMemo(() => {
    return members.find((member) => member.user_id === user?.id) ?? null;
  }, [members, user?.id]);

  const canManageMembers = useMemo(() => {
    return currentMember?.role === "owner" || currentMember?.role === "admin";
  }, [currentMember]);

  async function loadMembers() {
    if (!activeWorkspace) {
      setMembers([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const data = await listWorkspaceMembers(activeWorkspace.id);
      setMembers(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar membros.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace) {
      setErrorMessage("Selecione um workspace antes de adicionar membros.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await addWorkspaceMember({
        workspace_id: activeWorkspace.id,
        email,
        role,
      });

      setEmail("");
      setRole("viewer");
      await loadMembers();
      setSuccessMessage("Membro adicionado com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao adicionar membro.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRole(
    member: WorkspaceMemberWithProfile,
    nextRole: Exclude<WorkspaceMemberRole, "owner">,
  ) {
    if (member.role === "owner") {
      setErrorMessage("Não é possível alterar o papel do dono.");
      return;
    }

    setActionLoadingId(member.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateWorkspaceMemberRole(member.id, nextRole);
      await loadMembers();
      setSuccessMessage("Papel do membro atualizado.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao atualizar papel.";
      setErrorMessage(message);
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleRemoveMember(member: WorkspaceMemberWithProfile) {
    if (!activeWorkspace) return;

    if (member.role === "owner") {
      setErrorMessage("Não é possível remover o dono do workspace.");
      return;
    }

    const confirmed = window.confirm("Deseja realmente remover este membro?");

    if (!confirmed) return;

    setActionLoadingId(member.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await removeWorkspaceMember(activeWorkspace.id, member.id);
      await loadMembers();
      setSuccessMessage("Membro removido do workspace.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao remover membro.";
      setErrorMessage(message);
    } finally {
      setActionLoadingId("");
    }
  }

  if (!activeWorkspace) {
    return (
      <Card>
        <h2>Nenhum workspace selecionado</h2>
        <p>Crie ou selecione um workspace antes de gerenciar membros.</p>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Membros</span>
          <h2>Membros do workspace</h2>
          <p>
            Convide pessoas para colaborar no controle financeiro do workspace
            com permissões diferentes.
          </p>
        </div>

        <div className={styles.counter}>
          <strong>{members.length}</strong>
          <span>ativos</span>
        </div>
      </section>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

      <div className={styles.grid}>
        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Adicionar membro</h3>
              <p>O usuário precisa já ter conta criada no FinZap.</p>
            </div>

            <Plus size={20} />
          </div>

          {!canManageMembers ? (
            <p className={styles.warning}>
              Apenas dono ou admin podem adicionar membros.
            </p>
          ) : null}

          <form className={styles.form} onSubmit={handleAddMember}>
            <label>
              E-mail do usuário
              <input
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!canManageMembers}
                required
              />
            </label>

            <label>
              Papel
              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as Exclude<WorkspaceMemberRole, "owner">)
                }
                disabled={!canManageMembers}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.roleInfo}>
              {roleOptions.map((option) => (
                <div key={option.value}>
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={submitting || !canManageMembers}>
              {submitting ? "Adicionando..." : "Adicionar membro"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <div>
              <h3>Membros ativos</h3>
              <p>Gerencie os colaboradores deste workspace.</p>
            </div>

            <UserRound size={20} />
          </div>

          {loading ? <p className={styles.empty}>Carregando membros...</p> : null}

          {!loading && members.length === 0 ? (
            <p className={styles.empty}>Nenhum membro encontrado.</p>
          ) : null}

          <div className={styles.list}>
            {members.map((member) => {
              const isOwner = member.role === "owner";
              const isMe = member.user_id === user?.id;
              const isActionLoading = actionLoadingId === member.id;

              return (
                <div key={member.id} className={styles.memberItem}>
                  <div className={styles.memberIcon}>
                    {getRoleIcon(member.role)}
                  </div>

                  <div className={styles.memberContent}>
                    <strong>
                      {member.profile?.name ||
                        member.profile?.email ||
                        "Usuário sem profile"}
                      {isMe ? " (você)" : ""}
                    </strong>

                    <span>{member.profile?.email ?? "E-mail não encontrado"}</span>
                  </div>

                  <div className={styles.memberControls}>
                    {isOwner ? (
                      <span className={styles.ownerBadge}>
                        {getRoleLabel(member.role)}
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(event) =>
                          handleUpdateRole(
                            member,
                            event.target.value as Exclude<WorkspaceMemberRole, "owner">,
                          )
                        }
                        disabled={!canManageMembers || isActionLoading}
                      >
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {!isOwner ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        disabled={!canManageMembers || isActionLoading}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}