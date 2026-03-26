import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Trophy, 
  Users, 
  Swords, 
  LogOut,
  Settings
} from 'lucide-react';

export function AdminLayout() {
  const { signOut } = useAuth();

  const links = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/torneios', icon: Trophy, label: 'Torneios' },
    { to: '/admin/equipes', icon: Users, label: 'Equipes' },
    { to: '/admin/partidas', icon: Swords, label: 'Partidas' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">
              Smart Giro
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-wider uppercase mt-1">Admin Panel</p>
          </div>
          <nav className="px-4 space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
                    isActive 
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-50'
                  }`
                }
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
          <NavLink 
            to="/admin/configuracoes"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
                isActive 
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-50'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            Configurações
          </NavLink>
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">Smart Giro</h1>
          <button onClick={signOut} className="p-2 text-slate-500">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around p-2 z-20 pb-safe">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isActive 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-50'
              }`
            }
          >
            <link.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
