import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  FolderKanban,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useWorkspace } from "../../../hooks/useWorkspace";
import styles from "./styles.module.css";

const navItems = [
  {
    label: "Dashboard",
    path: "/app/dashboard",
    icon: Home,
  },
  {
    label: "Transações",
    path: "/app/transactions",
    icon: BarChart3,
  },
  {
    label: "Faturas",
    path: "/app/invoices",
    icon: CreditCard,
  },
  {
    label: "Carteiras",
    path: "/app/wallets",
    icon: Wallet,
  },
  {
    label: "Categorias",
    path: "/app/categories",
    icon: Tags,
  },
  {
    label: "Membros",
    path: "/app/members",
    icon: Users,
  },
  {
    label: "WhatsApp",
    path: "/app/whatsapp-simulator",
    icon: MessageCircle,
  },
  {
    label: "Configurações",
    path: "/app/settings",
    icon: Settings,
  },
];

export function AppShell() {
  const { signOut, profile, user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const displayName = profile?.name || user?.email || "Usuário";
  const workspaceName = activeWorkspace?.name ?? "Selecione um workspace";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.logo}>FZ</div>

          <div>
            <strong>FinZap</strong>
            <span>Workspaces</span>
          </div>
        </div>

        <div className={styles.userBox}>
          <span>Logado como</span>
          <strong>{displayName}</strong>
        </div>

        <NavLink to="/app/workspaces" className={styles.workspaceBox}>
          <span>Workspace ativo</span>
          <strong>{workspaceName}</strong>
        </NavLink>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <button className={styles.logoutButton} type="button" onClick={signOut}>
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </aside>

      <div className={styles.mainArea}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>Controle financeiro colaborativo</span>
            <h1>{workspaceName}</h1>
          </div>

          <NavLink to="/app/workspaces" className={styles.workspaceButton}>
            <FolderKanban size={18} />
            Trocar workspace
          </NavLink>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}