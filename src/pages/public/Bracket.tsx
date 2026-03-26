import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Trophy, Table, GitBranch, Loader2, ChevronLeft, MapPin, X, Info } from 'lucide-react';
import type { Database } from '../../types/supabase';
import { computeRanking } from '../../lib/rankingEngine';
import type { TeamStats } from '../../lib/rankingEngine';

type Category = Database['public']['Tables']['categories']['Row'] & {
  tournaments: { name: string } | null;
};
type Match = Database['public']['Tables']['matches']['Row'] & {
  team_a: { name: string } | null;
  team_b: { name: string } | null;
};
type SetRecord = Database['public']['Tables']['sets']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

export function Bracket() {
  const { catId } = useParams<{ catId: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankingPhase1, setRankingPhase1] = useState<TeamStats[]>([]);
  const [rankingPhase2, setRankingPhase2] = useState<TeamStats[]>([]);
  const [rankingPhase3, setRankingPhase3] = useState<TeamStats[]>([]);
  const [activeRankingPhase, setActiveRankingPhase] = useState<1 | 2>(1);
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
      const { data: sData } = await supabase.from('sets').select('*').in('match_id', (mData || []).map(m => m.id));

      if (tData && mData && sData) {
        // Compute Phase 1 Ranking
        const p1Matches = mData.filter(m => m.phase === 1);
        setRankingPhase1(computeRanking(tData as Team[], p1Matches as any, sData as SetRecord[]));

        // Compute Phase 2 Ranking
        const p2Matches = mData.filter(m => m.phase === 2);
        setRankingPhase2(computeRanking(tData as Team[], p2Matches as any, sData as SetRecord[]));

        // Compute Phase 3 Ranking (Semi-Finals)
        const p3Matches = mData.filter(m => m.phase === 3);
        setRankingPhase3(computeRanking(tData as Team[], p3Matches as any, sData as SetRecord[]));
        
        // Auto-switch to phase 2 ranking if it has started
        if (p2Matches.some(m => m.status !== 'PENDING')) {
          setActiveRankingPhase(2);
        }
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>;
  if (!category) return null;

  const phases = [
    { name: 'Fase 1', matches: matches.filter(m => m.phase === 1) },
    { name: 'Fase 2', matches: matches.filter(m => m.phase === 2) },
    { name: 'Semi Final', matches: matches.filter(m => m.phase === 3) },
    { name: 'Final', matches: matches.filter(m => m.phase === 4) },
  ];

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
                {category.gender === 'MASCULINE' ? 'Masculino' : 'Feminino'} • Fase {category.current_phase}
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
              Rankings
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8">
        {activeTab === 'bracket' ? (
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between overflow-x-auto pb-8">
            {phases.map((phase, pIdx) => (
              <div key={pIdx} className="flex-1 min-w-[280px] space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center font-black text-xs text-slate-400">
                    {pIdx + 1}
                  </div>
                  <h3 className="font-black uppercase tracking-widest text-slate-400 text-sm">{phase.name}</h3>
                </div>

                <div className="space-y-4">
                  {phase.matches.map((m) => (
                    <Link 
                      key={m.id} 
                      to={`/torneio/${catId}/partida/${m.id}`}
                      className={`block glass p-4 rounded-2xl border transition-all hover:scale-[1.02] ${m.status === 'IN_PROGRESS' ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-slate-800'}`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter italic">Jogo {m.match_number}</span>
                        {m.status === 'IN_PROGRESS' && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 animate-pulse">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            AO VIVO
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className={`flex justify-between items-center ${m.winner_id === m.team_a_id ? 'text-primary-400' : m.winner_id && m.winner_id !== m.team_a_id ? 'text-slate-600' : ''}`}>
                          <span className="font-bold truncate pr-2">{m.team_a?.name || 'A definir'}</span>
                          <span className="font-black text-lg">{m.score_a || 0}</span>
                        </div>
                        <div className={`flex justify-between items-center ${m.winner_id === m.team_b_id ? 'text-primary-400' : m.winner_id && m.winner_id !== m.team_b_id ? 'text-slate-600' : ''}`}>
                          <span className="font-bold truncate pr-2">{m.team_b?.name || 'A definir'}</span>
                          <span className="font-black text-lg">{m.score_b || 0}</span>
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
             {/* Podium Section */}
             {matches.find(m => m.match_number === 11 && m.status === 'FINISHED') && (
               <div className="relative pt-20 pb-12 px-6 bg-gradient-to-b from-primary-900/20 to-transparent rounded-[48px] border border-primary-500/10 overflow-hidden">
                 {/* Decorative background rays */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/10 blur-[120px] rounded-full -z-10" />
                 
                 <div className="text-center mb-16">
                   <h2 className="text-5xl font-black uppercase tracking-tighter text-white mb-2">Pódio do Torneio</h2>
                   <div className="flex items-center justify-center gap-2 text-primary-400 font-bold uppercase tracking-widest text-xs">
                     <Trophy className="w-4 h-4" />
                     Vencedores Smart Giro
                   </div>
                 </div>

                 <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-0 max-w-4xl mx-auto">
                    {/* 2nd Place */}
                    <div className="w-full md:w-1/3 order-2 md:order-1 px-4">
                      {(() => {
                        const final = matches.find(m => m.match_number === 11);
                        const runnerUpName = final?.winner_id 
                          ? (final.winner_id === final.team_a_id ? final.team_b?.name : final.team_a?.name)
                          : 'Runner Up';
                        return (
                          <div className="flex flex-col items-center">
                            <div className="mb-4 relative">
                              <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-slate-400/30">
                                 <span className="text-3xl font-black text-slate-400">2</span>
                              </div>
                              <div className="absolute -top-3 -right-3 p-2 bg-slate-400 rounded-full shadow-lg">
                                <Trophy className="w-4 h-4 text-slate-900" />
                              </div>
                            </div>
                            <div className="text-center bg-slate-900/50 p-6 rounded-t-3xl border-t border-x border-slate-800 w-full h-32 flex flex-col justify-center">
                              <p className="font-black text-slate-300 uppercase truncate">
                                {runnerUpName}
                              </p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Vice-Campeão</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 1st Place */}
                    <div className="w-full md:w-1/3 order-1 md:order-2 px-4">
                      {(() => {
                        const final = matches.find(m => m.match_number === 11);
                        const winnerName = final?.winner_id 
                          ? (final.winner_id === final.team_a_id ? final.team_a?.name : final.team_b?.name)
                          : 'Campeão';
                        return (
                          <div className="flex flex-col items-center">
                            <div className="mb-6 relative scale-110">
                              <div className="w-28 h-28 bg-gradient-to-br from-amber-300 to-amber-600 rounded-[32px] flex items-center justify-center border-4 border-amber-200/50 shadow-2xl shadow-amber-500/40">
                                 <span className="text-5xl font-black text-amber-950">1</span>
                              </div>
                              <div className="absolute -top-4 -right-4 p-3 bg-white rounded-full shadow-2xl animate-bounce">
                                <Trophy className="w-6 h-6 text-amber-600" />
                              </div>
                            </div>
                            <div className="text-center bg-primary-600 p-8 rounded-t-[40px] border-t border-x border-primary-400/30 w-full h-48 flex flex-col justify-center shadow-2xl shadow-primary-500/20">
                              <p className="text-2xl font-black text-white uppercase truncate">
                                {winnerName}
                              </p>
                              <p className="text-xs font-black text-primary-200 uppercase tracking-[0.2em] mt-2">Campeão</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 3rd Place */}
                    <div className="w-full md:w-1/3 order-3 md:order-3 px-4">
                      <div className="flex flex-col items-center">
                        <div className="mb-4 relative">
                          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-orange-500/30">
                             <span className="text-3xl font-black text-orange-500">3</span>
                          </div>
                          <div className="absolute -top-3 -right-3 p-2 bg-orange-600 rounded-full shadow-lg">
                            <Trophy className="w-4 h-4 text-orange-100" />
                          </div>
                        </div>
                        <div className="text-center bg-slate-900/50 p-6 rounded-t-3xl border-t border-x border-slate-800 w-full h-24 flex flex-col justify-center">
                          <p className="font-black text-orange-400 uppercase truncate">
                            {rankingPhase3.filter(r => !r.is_winner && r.matches_played > 0)[0]?.name || 'Top 3'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">3º Colocado</p>
                        </div>
                      </div>
                    </div>
                 </div>
               </div>
             )}

             {/* Phase Selector */}
             <div className="flex justify-center mb-8">
               <div className="bg-slate-900/50 p-1 rounded-2xl border border-slate-800 flex gap-2">
                 <button 
                  onClick={() => setActiveRankingPhase(1)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeRankingPhase === 1 ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                   Fase 1
                 </button>
                 <button 
                  onClick={() => setActiveRankingPhase(2)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeRankingPhase === 2 ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                   Fase 2
                 </button>
               </div>
             </div>

             <div className="grid lg:grid-cols-2 gap-8">
               {(activeRankingPhase === 1 ? rankingPhase1 : rankingPhase2).length > 0 ? (
                 <>
                   {/* MV Ranking */}
                   <div className="glass rounded-3xl border border-slate-800 overflow-hidden">
                     <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <Trophy className="w-5 h-5 text-amber-500" />
                         <h3 className="font-black uppercase tracking-widest text-sm">Melhores Vencedores (MV) - Fase {activeRankingPhase}</h3>
                       </div>
                       <span className="text-[10px] font-bold text-slate-500">QUALIFICA PARA PRÓXIMA FASE</span>
                     </div>
                     <div className="overflow-x-auto">
                       <table className="w-full text-left">
                         <thead>
                           <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                             <th className="px-6 py-4">#</th>
                             <th className="px-6 py-4">Equipe</th>
                             <th className="px-6 py-4 text-center">Sets (V/P)</th>
                             <th className="px-6 py-4 text-center">Pts</th>
                             <th className="px-6 py-4 text-center">PS</th>
                             <th className="px-6 py-4 text-center italic">PSU</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                           {(activeRankingPhase === 1 ? rankingPhase1 : rankingPhase2).filter(r => r.is_winner).map((r, i) => (
                             <tr 
                               key={r.team_id} 
                               onClick={() => setSelectedTeam(r)}
                               className="group hover:bg-slate-900/40 transition-colors cursor-pointer"
                             >
                               <td className="px-6 py-4">
                                 <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>{i + 1}</span>
                               </td>
                               <td className="px-6 py-4 font-bold">
                                 <div className="flex items-center gap-2">
                                   {r.name}
                                   <Info className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 </div>
                               </td>
                               <td className="px-6 py-4 text-center font-black text-primary-400">
                                 {r.sets_won} / {r.sets_lost}
                               </td>
                               <td className="px-6 py-4 text-center font-bold text-slate-300">{r.total_points_scored}</td>
                               <td className="px-6 py-4 text-center font-bold text-slate-500">{r.points_conceded}</td>
                               <td className="px-6 py-4 text-center font-bold text-slate-600 italic">{r.last_set_points_conceded}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>

                   {/* MC Ranking */}
                   <div className="glass rounded-3xl border border-slate-800 overflow-hidden">
                     <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <MapPin className="w-5 h-5 text-blue-500" />
                         <h3 className="font-black uppercase tracking-widest text-sm">Melhor Campanha (MC) - Fase {activeRankingPhase}</h3>
                       </div>
                       <span className="text-[10px] font-bold text-blue-500">REPESCAGEM</span>
                     </div>
                     <div className="overflow-x-auto">
                       <table className="w-full text-left">
                         <thead>
                           <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                             <th className="px-6 py-4">#</th>
                             <th className="px-6 py-4">Equipe</th>
                             <th className="px-6 py-4 text-center">Sets (V/P)</th>
                             <th className="px-6 py-4 text-center">Pts</th>
                             <th className="px-6 py-4 text-center">PS</th>
                             <th className="px-6 py-4 text-center italic">PSU</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                           {(activeRankingPhase === 1 ? rankingPhase1 : rankingPhase2).filter(r => !r.is_winner && r.matches_played > 0).map((r, i) => (
                             <tr 
                               key={r.team_id} 
                               onClick={() => setSelectedTeam(r)}
                               className="group hover:bg-slate-900/40 transition-colors cursor-pointer"
                             >
                               <td className="px-6 py-4">
                                 <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{i + 1}</span>
                               </td>
                               <td className="px-6 py-4 font-bold">
                                 <div className="flex items-center gap-2">
                                   {r.name}
                                   <Info className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 </div>
                               </td>
                               <td className="px-6 py-4 text-center font-black text-primary-400">
                                 {r.sets_won} / {r.sets_lost}
                               </td>
                               <td className="px-6 py-4 text-center font-bold text-slate-300">{r.total_points_scored}</td>
                               <td className="px-6 py-4 text-center font-bold text-slate-500">{r.points_conceded}</td>
                               <td className="px-6 py-4 text-center font-bold text-slate-600 italic">{r.last_set_points_conceded}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 </>
               ) : (
                 <div className="lg:col-span-2 flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-[32px] border border-dashed border-slate-800">
                   <Table className="w-12 h-12 text-slate-700 mb-4" />
                   <p className="text-slate-500 font-bold">Nenhuma partida finalizada nesta fase ainda.</p>
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
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Sets Ganhos</p>
                   <p className="text-3xl font-black text-primary-400">{selectedTeam.sets_won}</p>
                </div>
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Pontos Marcados</p>
                   <p className="text-3xl font-black text-white">{selectedTeam.total_points_scored}</p>
                </div>
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Último Set (M/S)</p>
                   <p className="text-3xl font-black text-white">{selectedTeam.last_set_points} / {selectedTeam.last_set_points_conceded}</p>
                </div>
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Ptos Sofridos</p>
                   <p className="text-3xl font-black text-slate-400">{selectedTeam.points_conceded}</p>
                </div>
              </div>

              <div className="p-5 bg-primary-600/10 border border-primary-500/20 rounded-2xl">
                <p className="text-xs font-bold text-primary-400 leading-relaxed italic">
                   Critérios de desempate aplicados em ordem: sets, pontos totais, último set, pontos sofridos e penalidades.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
