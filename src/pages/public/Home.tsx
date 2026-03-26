import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Users, PlayCircle, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Database } from '../../types/supabase';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export function Home() {
  const [tournaments, setTournaments] = useState<(Tournament & { categories: Category[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTournaments();
  }, []);

  const fetchActiveTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, categories(*)')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary-500/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20 pb-16 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary-600/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-bold tracking-wider uppercase">
            <Trophy className="w-4 h-4" />
            Live Tournament System
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
            Acompanhe o <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">Smart Giro</span> Em Tempo Real
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Resultados set-a-set, rankings dinâmicos e chaveamento automático para os melhores torneios de tênis de mesa.
          </p>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        {tournaments.length === 0 ? (
          <div className="glass p-12 rounded-3xl border border-slate-800 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
              <PlayCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">Nenhum torneio ativo no momento</h3>
            <p className="text-slate-500">Fique atento para as próximas competições!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="glass p-8 rounded-3xl border border-slate-800 hover:border-primary-500/50 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold group-hover:text-primary-400 transition-colors uppercase">{tournament.name}</h2>
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black rounded-lg">AO VIVO</div>
                </div>
                
                <p className="text-slate-400 mb-8 line-clamp-2">{tournament.description || 'Nenhuma descrição disponível.'}</p>

                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Escolha uma Categoria</p>
                  {tournament.categories.map((category) => (
                    <Link 
                      key={category.id} 
                      to={`/torneio/${category.id}`}
                      className="flex items-center justify-between p-4 bg-slate-900/50 hover:bg-primary-500/10 border border-slate-800 hover:border-primary-500/30 rounded-2xl transition-all group/item"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800 group-hover/item:bg-primary-500/20 rounded-xl flex items-center justify-center transition-colors">
                          <Users className="w-5 h-5 group-hover/item:text-primary-400" />
                        </div>
                        <span className="font-bold text-lg">{category.gender === 'MASCULINE' ? 'Masculino' : 'Feminino'}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover/item:text-primary-400 transform group-hover/item:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:row items-center justify-between gap-6 opacity-30 grayscale contrast-125">
           <img src="/logo-placeholder.png" alt="Sponsor" className="h-8 w-auto hidden" />
           <p className="text-sm font-bold">Powered by Smart Giro Tournament Engine</p>
        </div>
      </footer>
    </div>
  );
}
