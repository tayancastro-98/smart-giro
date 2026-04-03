import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Trophy, Play, CheckCircle2, AlertCircle, RefreshCw, Layers, Shuffle } from 'lucide-react';
import type { Database } from '../../types/supabase';
import { useNavigate } from 'react-router-dom';
import { generateGroupStage, generateKnockoutPhase, createGroups } from '../../lib/tournamentGenerator';
import { computeRanking as calculateCategoryRanking, generateNextPhase } from '../../lib/rankingEngine';

type Match = Database['public']['Tables']['matches']['Row'] & {
  team_a: { name: string } | null;
  team_b: { name: string } | null;
};
type Team = Database['public']['Tables']['teams']['Row'];
type Category = Database['public']['Tables']['categories']['Row'] & {
  tournament: { name: string };
};

export function Matches() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [standings, setStandings] = useState<any[]>([]);
  
  const isImmutable = localStorage.getItem('match_immutability') === 'true';
  const navigate = useNavigate();

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*, tournament:tournaments(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCategories(data as any);
      if (data.length > 0) setSelectedCategoryId(data[0].id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchesAndTeams = async (catId: string) => {
    if (!catId) return;
    try {
      setMatchesLoading(true);
      
      // Fetch Matches
      const { data: mData, error: mError } = await supabase
        .from('matches')
        .select('*, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name)')
        .eq('category_id', catId)
        .order('phase', { ascending: true })
        .order('match_number', { ascending: true });
      if (mError) throw mError;
      setMatches(mData as any);

      // Fetch Teams
      const { data: tData, error: tError } = await supabase
        .from('teams')
        .select('*')
        .eq('category_id', catId)
        .order('name', { ascending: true });
      if (tError) throw tError;
      setTeams(tData || []);

      // Calculate Standings if category is GROUPS
      const cat = categories.find(c => c.id === catId);
      if (cat?.tournament_format === 'GROUPS' && mData) {
        // Fetch all sets for ranking
        const { data: sData } = await supabase.from('sets').select('*').in('match_id', mData.map(m => m.id));
        const ranking = calculateCategoryRanking(tData || [], mData as any, sData || []);
        
        // Add group info to ranking
        const rankingWithGroups = ranking.map(stat => ({
          ...stat,
          group: tData?.find(t => t.id === stat.team_id)?.group_name
        }));
        setStandings(rankingWithGroups);
      } else {
        setStandings([]);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setMatchesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchMatchesAndTeams(selectedCategoryId);
    }
  }, [selectedCategoryId, categories]);

  const handleGenerateMatches = async () => {
    if (!selectedCategory) return;
    
    const confirmMsg = matches.length > 0 
      ? 'Atenção: Já existem partidas geradas. Ao clicar em "Sim", TODOS os placares e partidas atuais desta categoria serão APAGADOS para criar a nova estrutura. Deseja continuar?'
      : 'Deseja gerar as partidas para esta categoria?';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      setMatchesLoading(true);
      
      // 1. CLEANUP: Delete existing matches and sets for this category
      const { data: existingMatches } = await supabase
        .from('matches')
        .select('id')
        .eq('category_id', selectedCategoryId);
      
      const existingMatchIds = existingMatches?.map(m => m.id) || [];
      if (existingMatchIds.length > 0) {
        // Delete sets first due to foreign key constraints
        const { error: sDelError } = await supabase.from('sets').delete().in('match_id', existingMatchIds);
        if (sDelError) throw sDelError;
        
        const { error: mDelError } = await supabase.from('matches').delete().in('id', existingMatchIds);
        if (mDelError) throw mDelError;
      }

      let newMatches = [];

      if (selectedCategory.tournament_format === 'GROUPS') {
        const needsRerandomize = teams.some(t => !t.group_name) || window.confirm('Equipes já têm grupos. Deseja sortear novamente as equipes de forma aleatória?');
        
        if (needsRerandomize) {
          const groups = createGroups(teams, selectedCategory.group_size || 3);
          
          // Batch update teams with group names using upsert
          const teamUpdates = groups.flatMap(g => 
            g.teams.map(t => ({ 
              id: t.id, 
              group_name: g.name, 
              category_id: selectedCategory.id,
              name: t.name
            }))
          );
          
          const { error: tUpdateError } = await supabase.from('teams').upsert(teamUpdates);
          if (tUpdateError) throw tUpdateError;

          // Re-fetch teams to get updated data
          const { data: updatedTeams } = await supabase.from('teams').select('*').eq('category_id', selectedCategory.id);
          const groupMap: Record<string, Team[]> = {};
          (updatedTeams || []).forEach(t => {
            if (t.group_name) {
              if (!groupMap[t.group_name]) groupMap[t.group_name] = [];
              groupMap[t.group_name].push(t);
            }
          });
          const updatedGroups = Object.entries(groupMap).map(([name, teams]) => ({ name, teams }));
          newMatches = generateGroupStage(selectedCategory.id, updatedGroups);
        } else {
          // Reconstruct group structure from existing team group_names
          const groupMap: Record<string, Team[]> = {};
          teams.forEach(t => {
            if (t.group_name) {
              if (!groupMap[t.group_name]) groupMap[t.group_name] = [];
              groupMap[t.group_name].push(t);
            }
          });
          const groups = Object.entries(groupMap).map(([name, teams]) => ({ name, teams }));
          newMatches = generateGroupStage(selectedCategory.id, groups);
        }
      } else {
        newMatches = generateKnockoutPhase(selectedCategory.id, teams, 1);
      }

      if (!newMatches || newMatches.length === 0) {
        alert('Não foi possível gerar partidas. Verifique se há equipes suficientes cadastradas.');
        return;
      }

      // 3. INSERT NEW MATCHES (No longer using upsert to avoid conflicts with deleted IDs if any)
      const { error: mInsertError } = await supabase.from('matches').insert(
        newMatches.map(m => ({
          category_id: m.category_id,
          phase: m.phase,
          match_number: m.match_number,
          team_a_id: m.team_a_id,
          team_b_id: m.team_b_id,
          group_name: m.group_name,
          status: 'PENDING'
        }))
      );
      
      if (mInsertError) throw mInsertError;
      
      // Update category state
      await supabase.from('categories').update({ current_phase: 1, status: 'ONGOING' }).eq('id', selectedCategory.id);
      
      alert(`${newMatches.length} partidas geradas do zero com sucesso!`);
      fetchMatchesAndTeams(selectedCategoryId);
    } catch (error: any) {
      console.error('Error generating matches:', error);
      alert(`Erro ao gerar partidas: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleAssignTeam = async (matchId: string, side: 'team_a_id' | 'team_b_id', teamId: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ [side]: teamId === "" ? null : teamId })
        .eq('id', matchId);
      if (error) throw error;
      fetchMatchesAndTeams(selectedCategoryId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStartMatch = (id: string) => {
    navigate(`/admin/partidas/${id}/placar`);
  };

  const groupedByPhase = matches.reduce((acc: any, match) => {
    const phase = match.phase || 1;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(match);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Gerenciar Partidas</h2>
          <p className="text-slate-500 mt-1">Organize o chaveamento e inicie os jogos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none appearance-none min-w-[200px]"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.tournament.name} - {cat.gender === 'MASCULINE' ? 'Masc' : 'Fem'}</option>
            ))}
          </select>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleGenerateMatches}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-xl transition-colors shadow-lg shadow-primary-500/30 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${matchesLoading ? 'animate-spin' : ''}`} />
              {matches.length === 0 ? 'Gerar Partidas' : 'Regerar Partidas'}
            </button>

            {matches.length > 0 && matches.every(m => m.status === 'FINISHED') && (
              <button 
                onClick={async () => {
                   if (!selectedCategory) return;
                   if (!window.confirm('Deseja avançar para a próxima fase do torneio com base nos resultados atuais?')) return;
                   try {
                     setMatchesLoading(true);
                     await generateNextPhase(selectedCategoryId, selectedCategory.current_phase || 1);
                     alert('Próxima fase gerada com sucesso!');
                     fetchMatchesAndTeams(selectedCategoryId);
                   } catch (err: any) {
                     console.error(err);
                     alert('Erro ao avançar fase: ' + err.message);
                   } finally {
                     setMatchesLoading(false);
                   }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-xl transition-colors shadow-lg shadow-emerald-500/30 flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                Avançar de Fase
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Standings for Groups */}
      {selectedCategory?.tournament_format === 'GROUPS' && standings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-500" />
            Classificação por Grupos
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {Array.from(new Set(standings.map(s => s.group))).filter(Boolean).map(groupName => (
              <div key={groupName as string} className="glass overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-b border-slate-200 dark:border-slate-700 font-bold flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Grupo {groupName as string}</span>
                  <Shuffle className="w-3 h-3 text-slate-400" />
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-900/50">
                    <tr className="text-slate-500 font-black uppercase text-[10px]">
                      <th className="px-4 py-3">Pos</th>
                      <th className="px-4 py-3">Equipe</th>
                      <th className="px-4 py-3 text-center">V</th>
                      <th className="px-4 py-3 text-center">Sets (V-P)</th>
                      <th className="px-4 py-3 text-center">Gms (V-P)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {standings.filter(s => s.group === groupName).map((s, idx) => {
                      const advRule = selectedCategory.advancement_rule as any;
                      const isQualifying = idx < (advRule?.n || 2);
                      return (
                        <tr key={s.team_id} className={isQualifying ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}>
                          <td className="px-4 py-3 font-bold">{idx + 1}º</td>
                          <td className="px-4 py-3 font-medium">{s.name}</td>
                          <td className="px-4 py-3 text-center font-bold text-primary-600">{s.matches_won}</td>
                          <td className="px-4 py-3 text-center text-slate-500">
                            {s.sets_won}-{s.sets_lost}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500">
                            {s.total_points_scored}-{s.points_conceded}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {matchesLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 glass border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhuma partida gerada</h3>
          <p className="text-slate-500 max-w-xs mx-auto mb-6">Selecione uma categoria e clique em "Gerar Partidas" para começar.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.keys(groupedByPhase).sort().map(phaseStr => {
            const phase = parseInt(phaseStr);
            const phaseMatches = groupedByPhase[phase];
            
            return (
              <div key={phase} className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  {selectedCategory?.tournament_format === 'GROUPS' && phase === 1 ? 'Fase de Grupos' : 
                   `Fase ${phase}${phase > 1 ? ': Eliminatórias' : ''}`}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {phaseMatches.map((match: any) => (
                    <div key={match.id} className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Jogo {match.match_number}</span>
                          {match.group_name && (
                            <span className="text-[10px] font-bold text-primary-500 uppercase">Grupo {match.group_name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                             match.status === 'FINISHED' ? 'bg-slate-400' :
                             match.status === 'IN_PROGRESS' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                          }`} />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {match.status === 'FINISHED' ? 'Finalizado' :
                             match.status === 'IN_PROGRESS' ? 'Ao Vivo' : 'Pendente'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="relative">
                            <select 
                              disabled={match.status === 'FINISHED' || phase > 1}
                              value={match.team_a_id || ''}
                              onChange={(e) => handleAssignTeam(match.id, 'team_a_id', e.target.value)}
                              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg appearance-none disabled:opacity-80"
                            >
                              <option value="">{match.team_a?.name || 'Time A definir...'}</option>
                              {phase === 1 && teams.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name} {t.group_name ? `(${t.group_name})` : ''}
                                </option>
                              ))}
                            </select>
                            {match.status === 'FINISHED' && match.winner_id === match.team_a_id && (
                              <Trophy className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                            )}
                          </div>
                          
                          <div className="text-center text-[10px] font-bold text-slate-400 py-1">VS</div>
                          
                          <div className="relative">
                            <select 
                              disabled={match.status === 'FINISHED' || phase > 1}
                              value={match.team_b_id || ''}
                              onChange={(e) => handleAssignTeam(match.id, 'team_b_id', e.target.value)}
                              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg appearance-none disabled:opacity-80"
                            >
                              <option value="">{match.team_b?.name || 'Time B definir...'}</option>
                              {phase === 1 && teams.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name} {t.group_name ? `(${t.group_name})` : ''}
                                </option>
                              ))}
                            </select>
                            {match.status === 'FINISHED' && match.winner_id === match.team_b_id && (
                              <Trophy className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        {match.status === 'FINISHED' ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                              <CheckCircle2 className="w-4 h-4" />
                              Placar: {match.score_a ?? 0} x {match.score_b ?? 0}
                            </div>
                            {!isImmutable && (
                              <button 
                                onClick={() => handleStartMatch(match.id)}
                                className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200 dark:border-slate-700"
                              >
                                Editar Placares
                              </button>
                            )}
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleStartMatch(match.id)}
                            disabled={!match.team_a_id || !match.team_b_id}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all ${
                              match.status === 'IN_PROGRESS' 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-40 shadow-lg shadow-primary-500/20'
                            }`}
                          >
                            <Play className="w-4 h-4 fill-current" />
                            {match.status === 'IN_PROGRESS' ? 'Retomar Placar' : 'Iniciar Jogo'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
