import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Trophy, Table, GitBranch, Loader2, ChevronLeft, X, LayoutGrid, Users } from 'lucide-react';
import type { Database } from '../../types/supabase';
import { computeRanking } from '../../lib/rankingEngine';
import type { TeamStats } from '../../lib/rankingEngine';

type Category = Database['public']['Tables']['categories']['Row'] & {
  tournaments: { name: string } | null;
};
type Match = Database['public']['Tables']['matches']['Row'] & {
  team_a: { name: string } | null;
  team_b: { name: string } | null;
  group_name?: string | null;
};
type SetRecord = Database['public']['Tables']['sets']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

export function Bracket() {
  const { catId } = useParams<{ catId: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sets, setSets] = useState<SetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bracket' | 'ranking'>('bracket');
  const [selectedTeam, setSelectedTeam] = useState<TeamStats | null>(null);

  useEffect(() => {
    if (catId) {
      fetchData();
      const subscription = supabase
        .channel('public-view')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `category_id=eq.${catId}` }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sets' }, fetchData)
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catId]);

  const fetchData = async () => {
    if (!catId) return;
    try {
      const { data: catData } = await supabase
        .from('categories')
        .select('*, tournaments(name)')
        .eq('id', catId)
        .single();
      
      setCategory(catData as any);

      const { data: mData } = await supabase
        .from('matches')
        .select('*, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name)')
        .eq('category_id', catId)
        .order('match_number', { ascending: true });

      setMatches(mData || []);

      const { data: tData } = await supabase.from('teams').select('*').eq('category_id', catId);
      setTeams(tData || []);

      const { data: sData } = await supabase.from('sets').select('*').in('match_id', (mData || []).map(m => m.id));
      setSets(sData || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>;
  if (!category) return null;

  const currentPhase = category.current_phase || 1;
  const phases = Array.from(new Set(matches.map(m => m.phase))).sort((a, b) => a - b);
  
  const getPhaseName = (p: number) => {
    if (category.tournament_format === 'GROUPS' && p === 1) return 'Fase de Grupos';
    if (p === Math.max(...phases) && matches.length > 1) return 'Final';
    return `Fase ${p}`;
  };

  const calculateStandings = (phase: number, groupName?: string) => {
    let filteredMatches = matches.filter(m => m.phase === phase);
    let filteredTeams = teams;

    if (groupName) {
      filteredTeams = teams.filter(t => t.group_name === groupName);
      filteredMatches = filteredMatches.filter(m => 
        filteredTeams.some(t => t.id === m.team_a_id) && 
        filteredTeams.some(t => t.id === m.team_b_id)
      );
    }

    return computeRanking(filteredTeams, filteredMatches as any, sets);
  };

  const finalists = matches.filter(m => m.phase === Math.max(...phases));
  const finalMatch = finalists.length === 1 ? finalists[0] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">{category.tournaments?.name}</h1>
              <p className="text-xs font-bold text-primary-400 uppercase tracking-widest">
                {category.gender === 'MASCULINE' ? 'Masculino' : 'Feminino'} • {getPhaseName(currentPhase)}
              </p>
            </div>
          </div>
          
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button 
              onClick={() => setActiveTab('bracket')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'bracket' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <GitBranch className="w-4 h-4" />
              Chaveamento
            </button>
            <button 
              onClick={() => setActiveTab('ranking')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'ranking' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Table className="w-4 h-4" />
              Classificação
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8">
        {activeTab === 'bracket' ? (
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between overflow-x-auto pb-8 scrollbar-hide">
            {phases.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center py-20 text-slate-500">
                 <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
                 <p className="font-bold">Nenhuma partida gerada ainda.</p>
              </div>
            ) : phases.map((phase, pIdx) => (
              <div key={phase} className="flex-1 min-w-[280px] space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center font-black text-xs text-slate-400">
                    {pIdx + 1}
                  </div>
                  <h3 className="font-black uppercase tracking-widest text-slate-400 text-sm whitespace-nowrap">{getPhaseName(phase)}</h3>
                </div>

                <div className="space-y-4">
                  {matches.filter(m => m.phase === phase).map((m) => (
                    <Link 
                      key={m.id} 
                      to={`/torneio/${catId}/partida/${m.id}`}
                      className={`block glass p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 ${m.status === 'IN_PROGRESS' ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-slate-800'}`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter italic">Jogo {m.match_number}</span>
                           {m.group_name && <span className="text-[10px] font-black text-primary-500 uppercase tracking-tighter px-1.5 py-0.5 bg-primary-500/10 rounded">Grupo {m.group_name}</span>}
                        </div>
                        {m.status === 'IN_PROGRESS' && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 animate-pulse">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            AO VIVO
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className={`flex justify-between items-center ${m.winner_id === m.team_a_id ? 'text-primary-400' : m.winner_id && m.winner_id !== m.team_a_id ? 'text-slate-600' : 'text-slate-300'}`}>
                          <span className="font-bold truncate pr-2 text-sm">{m.team_a?.name || 'A definir'}</span>
                          <span className="font-black text-xl">{m.score_a || 0}</span>
                        </div>
                        <div className={`flex justify-between items-center ${m.winner_id === m.team_b_id ? 'text-primary-400' : m.winner_id && m.winner_id !== m.team_b_id ? 'text-slate-600' : 'text-slate-300'}`}>
                          <span className="font-bold truncate pr-2 text-sm">{m.team_b?.name || 'A definir'}</span>
                          <span className="font-black text-xl">{m.score_b || 0}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Podium UI Logic */}
             {finalMatch?.status === 'FINISHED' && (
                <div className="relative pt-20 pb-12 px-6 bg-gradient-to-b from-primary-900/20 to-transparent rounded-[48px] border border-primary-500/10 overflow-hidden">
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/10 blur-[120px] rounded-full -z-10" />
                   <div className="text-center mb-16">
                      <h2 className="text-5xl font-black uppercase tracking-tighter text-white mb-2">Pódio Final</h2>
                      <div className="flex items-center justify-center gap-2 text-primary-400 font-bold uppercase tracking-widest text-xs">
                        <Trophy className="w-4 h-4" />
                        Vencedores Smart Giro
                      </div>
                   </div>
                   
                   <div className="flex flex-col md:flex-row items-end justify-center gap-8 max-w-4xl mx-auto">
                      {/* Champion */}
                      <div className="w-full md:w-1/2 flex flex-col items-center order-1">
                         <div className="mb-6 relative scale-110">
                            <div className="w-32 h-32 bg-gradient-to-br from-amber-300 to-amber-600 rounded-[32px] flex items-center justify-center border-4 border-amber-200/50 shadow-2xl shadow-amber-500/40">
                               <span className="text-6xl font-black text-amber-950">1</span>
                            </div>
                            <div className="absolute -top-4 -right-4 p-3 bg-white rounded-full shadow-2xl animate-bounce">
                               <Trophy className="w-6 h-6 text-amber-600" />
                            </div>
                         </div>
                         <div className="text-center bg-primary-600 p-8 rounded-t-[40px] border-t border-x border-primary-400/30 w-full flex flex-col justify-center shadow-2xl">
                            <p className="text-2xl font-black text-white uppercase truncate">
                               {finalMatch.winner_id === finalMatch.team_a_id ? finalMatch.team_a?.name : finalMatch.team_b?.name}
                            </p>
                            <p className="text-xs font-black text-primary-200 uppercase tracking-[0.2em] mt-2">Campeão</p>
                         </div>
                      </div>

                      {/* Runner up */}
                      <div className="w-full md:w-1/2 flex flex-col items-center order-2">
                         <div className="mb-4 relative">
                            <div className="w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-slate-400/30">
                               <span className="text-4xl font-black text-slate-400">2</span>
                            </div>
                         </div>
                         <div className="text-center bg-slate-900/50 p-6 rounded-t-3xl border-t border-x border-slate-800 w-full flex flex-col justify-center">
                            <p className="font-black text-slate-300 uppercase truncate">
                               {finalMatch.winner_id === finalMatch.team_a_id ? finalMatch.team_b?.name : finalMatch.team_a?.name}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Vice-Campeão</p>
                         </div>
                      </div>
                   </div>
                </div>
             )}

             {/* Dynamic Standings */}
             <div className="grid lg:grid-cols-2 gap-8">
                {category.tournament_format === 'GROUPS' ? (
                  // Show Groups Standings
                  Array.from(new Set(teams.map(t => t.group_name).filter(Boolean))).map(groupName => {
                    const groupRanking = calculateStandings(1, groupName || undefined);
                    return (
                      <div key={groupName as string} className="glass rounded-3xl border border-slate-800 overflow-hidden h-fit">
                        <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-primary-500" />
                            <h3 className="font-black uppercase tracking-widest text-sm">Grupo {groupName as string}</h3>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                             <thead>
                               <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                                 <th className="px-6 py-4">#</th>
                                 <th className="px-6 py-4">Equipe</th>
                                 <th className="px-6 py-4 text-center">V-D</th>
                                 <th className="px-6 py-4 text-center">Sets</th>
                                 <th className="px-6 py-4 text-center">Pts</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-800/50">
                               {groupRanking.map((r, i) => (
                                 <tr key={r.team_id} className="hover:bg-slate-900/40 transition-colors cursor-help" onClick={() => setSelectedTeam(r)}>
                                   <td className="px-6 py-4">
                                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${i < 2 ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{i + 1}</span>
                                   </td>
                                   <td className="px-6 py-4 font-bold">{r.name}</td>
                                   <td className="px-6 py-4 text-center font-black text-primary-400">{r.matches_won}-{r.matches_lost}</td>
                                   <td className="px-6 py-4 text-center font-medium text-slate-400">{r.sets_won}-{r.sets_lost}</td>
                                   <td className="px-6 py-4 text-center font-bold text-slate-300">{r.total_points_scored}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Show General Ranking for Knockout
                  <div className="lg:col-span-2 glass rounded-3xl border border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-800 bg-slate-900/30">
                       <h3 className="font-black uppercase tracking-widest text-sm">Classificação Geral (Fase {currentPhase})</h3>
                    </div>
                    <div className="overflow-x-auto">
                       <table className="w-full text-left">
                         <thead>
                           <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                             <th className="px-6 py-4">#</th>
                             <th className="px-6 py-4">Equipe</th>
                             <th className="px-6 py-4 text-center">V-D</th>
                             <th className="px-6 py-4 text-center">Sets (V-P)</th>
                             <th className="px-6 py-4 text-center">Pontos (M-S)</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                           {calculateStandings(currentPhase).map((r, i) => (
                             <tr key={r.team_id} className="hover:bg-slate-900/40 transition-colors cursor-help" onClick={() => setSelectedTeam(r)}>
                               <td className="px-6 py-4">
                                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>{i + 1}</span>
                               </td>
                               <td className="px-6 py-4 font-bold">{r.name}</td>
                               <td className="px-6 py-4 text-center font-black text-primary-400">{r.matches_won}-{r.matches_lost}</td>
                               <td className="px-6 py-4 text-center text-slate-400">{r.sets_won}-{r.sets_lost}</td>
                               <td className="px-6 py-4 text-center font-bold text-slate-300">{r.total_points_scored}-{r.points_conceded}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Stats Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedTeam(null)} />
          <div className="relative w-full max-w-lg glass border border-slate-800 rounded-[32px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
               <h3 className="text-2xl font-black uppercase tracking-tight">{selectedTeam.name}</h3>
               <button onClick={() => setSelectedTeam(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                 <X className="w-6 h-6" />
               </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Sets Vencidos</p>
                   <p className="text-3xl font-black text-primary-400">{selectedTeam.sets_won}</p>
                </div>
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Pontos Marcados</p>
                   <p className="text-3xl font-black text-white">{selectedTeam.total_points_scored}</p>
                </div>
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">PS (Sofridos)</p>
                   <p className="text-3xl font-black text-red-400">{selectedTeam.points_conceded}</p>
                </div>
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Vitórias</p>
                   <p className="text-3xl font-black text-emerald-400">{selectedTeam.matches_won}</p>
                </div>
              </div>
              <div className="p-5 bg-primary-600/10 border border-primary-500/20 rounded-2xl">
                <p className="text-xs font-bold text-primary-400 leading-relaxed italic">
                   Os critérios de desempate consideram vitórias, saldo de sets, saldo de pontos e confronto direto.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
