import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Swords, Users, Play } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState({
    tournaments: 0,
    activeMatches: 0,
    teams: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [tournamentsRes, matchesRes, teamsRes] = await Promise.all([
          supabase.from('tournaments').select('*', { count: 'exact', head: true }),
          supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS'),
          supabase.from('teams').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          tournaments: tournamentsRes.count || 0,
          activeMatches: matchesRes.count || 0,
          teams: teamsRes.count || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-slate-500 mt-1">Visão geral do sistema Smart Giro</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Torneios</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.tournaments}</p>
          </div>
          <div className="w-12 h-12 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-full flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Partidas Ao Vivo</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.activeMatches}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full flex items-center justify-center">
            <Play className="w-6 h-6" />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Equipes Cadastradas</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.teams}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="glass p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <Swords className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Pronto para a ação?</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Crie um novo torneio ou gerencie os existentes para iniciar as fases de grupos do Smart Giro.
          </p>
          <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-primary-500/30 inline-flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Criar Torneio
          </button>
        </div>
      </div>
    </div>
  );
}
