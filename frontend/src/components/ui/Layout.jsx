import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  ArrowUpDown,
  Tags,
  Wallet,
  PieChart,
  CreditCard,
  HeartPulse,
  LogOut,
  User,
} from 'lucide-react';

// --------------------------------------------------
// Layout.jsx - estrutura fixa das páginas logadas
// --------------------------------------------------
// 1. renderiza menu lateral com links das rotas, barra superior com dados do usuário e botão de logout;
// 2. usa <Outlet /> para encaixar o componente da rota ativa;

const LINKS_MENU = [
  { to: '/', label: 'Dashboard', Icone: LayoutDashboard, end: true },
  { to: '/lancamentos', label: 'Lançamentos', Icone: ArrowUpDown },
  { to: '/categorias', label: 'Categorias', Icone: Tags },
  { to: '/fontes-destinos', label: 'Fontes e Destinos', Icone: Wallet },
  { to: '/relatorios', label: 'Relatórios', Icone: PieChart },
  { to: '/faturas', label: 'Faturas de Cartão', Icone: CreditCard },
  { to: '/saude-financeira', label: 'Saúde Financeira', Icone: HeartPulse },
];

export function Layout() {
  const { usuario, logout } = useAuth();

  return (
    <div className="layout-wrapper">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Wallet size={22} color="#3b82f6" />
          <span>Finanças Pessoais</span>
        </div>

        <nav className="sidebar-nav">
          {LINKS_MENU.map(({ to, label, Icone, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icone size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="flex-center" style={{ marginBottom: '0.75rem', color: '#94a3b8' }}>
            <User size={16} />
            <span>{usuario?.nome}</span>
          </div>
          <button onClick={logout} className="btn btn-secondary btn-sm btn-full">
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <span className="text-muted">
            Olá, <strong>{usuario?.nome}</strong> ({usuario?.email})
          </span>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
