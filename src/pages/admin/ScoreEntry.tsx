import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, Save, Plus, Trophy, Loader2, CheckCircle2, Circle } from 'lucide-react';
import type { Database } from '../../types/supabase';
import { generateNextPhase } from '../../lib/rankingEngine';

type Match = Database['public']['Tables']['matches']['Row'] & {
  team_a: { name: string; id: string } | null;
  team_b: { name: string; id: string } | null;
};

type SetRecord = Database['public']['Tables']['sets']['Row'];

export function ScoreEntry() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [sets, setSets] = useState<Partial<SetRecord>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (matchId) fetchMatchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const fetchMatchData = async () => {
    if (!matchId) return;
    try {
      setLoading(true);
      const { data: mData, error: mError } = await supabase
        .from('matches')
        .select('*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*)')
        .eq('id', matchId)
        .single();

      if (mError) throw mError;
      setMatch(mData as any);

      const { data: sData, error: sError } = await supabase
        .from('sets')
        .select('*')
        .eq('match_id', matchId)
        .order('set_number', { ascending: true });

      if (sError) throw sError;
      setSets(sData || []);
    } catch (error) {
      console.error(error);
      navigate('/admin/partidas');
    } finally {
      setLoading(false);
    }
  };

  const addSet = () => {
    if (!matchId || !match) return;
    const maxSets = match.is_best_of_5 ? 5 : 3;
    if (sets.length >= maxSets) return;
    
    setSets([...sets, { 
      match_id: matchId, 
      set_number: sets.length + 1, 
      points_a: 0, 
      points_b: 0, 
      is_finished: false
    }]);
  };

  const updateSetScore = (index: number, field: 'points_a' | 'points_b', value: number) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: Math.max(0, value) };
    setSets(newSets);
  };

  const finishSet = (index: number) => {
    const newSets = [...sets];
    const s = newSets[index];
    const ptsA = s.points_a || 0;
    const ptsB = s.points_b || 0;
    const maxPts = Math.max(ptsA, ptsB);
    const diff = Math.abs(ptsA - ptsB);

    if (maxPts < 11) {
      alert('Um set deve ter pelo menos 11 pontos');
      return;
    }
    if (diff < 2) {
      alert('O vencedor deve abrir pelo menos 2 pontos de vantagem (Ex: 11x9, 12x10)');
      return;
    }
    newSets[index] = { 
      ...s, 
      is_finished: true,
      winner_team_side: ptsA > ptsB ? 'A' : 'B'
    };
    setSets(newSets);
  };

  const calculateWinner = () => {
    let setsA = 0;
    let setsB = 0;
    sets.forEach(s => {
      if (s.is_finished) {
        if ((s.points_a || 0) > (s.points_b || 0)) setsA++;
        else setsB++;
      }
    });

    const setsToWin = match?.is_best_of_5 ? 3 : 2;
    if (setsA >= setsToWin) return match?.team_a_id;
    if (setsB >= setsToWin) return match?.team_b_id;
    return null;
  };

  const handleSave = async (finalizeMatch: boolean = false) => {
    if (!matchId || !match) return;
    try {
      setSaving(true);
      
      // 1. Save sets
      for (const s of sets) {
        const setData = {
          match_id: matchId,
          set_number: s.set_number || 1,
          points_a: s.points_a || 0,
          points_b: s.points_b || 0,
          is_finished: s.is_finished || false,
          winner_team_side: s.winner_team_side || null
        };

        if (s.id) {
          await supabase.from('sets').update(setData).eq('id', s.id);
        } else {
          await supabase.from('sets').insert(setData);
        }
      }

      // 2. Update match general score
      let totalSetsA = 0;
      let totalSetsB = 0;
      sets.forEach(s => {
        if (s.is_finished) {
          if ((s.points_a || 0) > (s.points_b || 0)) totalSetsA++;
          else totalSetsB++;
        }
      });

      const winnerId = finalizeMatch ? calculateWinner() : null;
      const loserId = finalizeMatch && winnerId ? (winnerId === match.team_a_id ? match.team_b_id : match.team_a_id) : null;
      
      const { error: mError } = await supabase
        .from('matches')
        .update({
          status: finalizeMatch ? 'FINISHED' : 'IN_PROGRESS',
          winner_id: winnerId,
          loser_id: loserId,
          score_a: totalSetsA,
          score_b: totalSetsB,
          finalized_at: finalizeMatch ? new Date().toISOString() : null
        })
        .eq('id', matchId);

      if (mError) throw mError;
      
      if (finalizeMatch) {
         const { data: phaseMatches } = await supabase
           .from('matches')
           .select('status')
           .eq('category_id', match.category_id)
           .eq('phase', match.phase);
         
         const allFinished = phaseMatches?.every(m => m.status === 'FINISHED');
         
         if (allFinished && match.phase < 4) {
            await generateNextPhase(match.category_id, match.phase);
            alert('A fase foi concluída e os novos confrontos foram gerados!');
         } else {
            alert('Partida finalizada com sucesso!');
         }
         navigate('/admin/partidas');
      } else {
        await fetchMatchData();
        alert('Progresso salvo!');
      }

    } catch (error) {
      console.error(error);
      alert('Erro ao salvar placar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  if (!match) return null;

  const winnerIdCandidate = calculateWinner();
  const maxSets = match.is_best_of_5 ? 5 : 3;

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/partidas')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">Lançar Placar</h2>
      </div>

      <div className="glass p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{match.team_a?.name?.[0]}</span>
            </div>
            <p className="font-bold text-lg leading-tight">{match.team_a?.name}</p>
            <p className="text-4xl font-black text-primary-600">{match.score_a || 0}</p>
          </div>

          <div className="px-4">
            <span className="text-slate-400 font-black italic text-2xl">VS</span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">{match.team_b?.name?.[0]}</span>
            </div>
            <p className="font-bold text-lg leading-tight">{match.team_b?.name}</p>
            <p className="text-4xl font-black text-primary-600">{match.score_b || 0}</p>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
           <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
             {match.is_best_of_5 ? 'Melhor de 5 Sets' : 'Melhor de 3 Sets'}
           </span>
        </div>
      </div>

      <div className="space-y-4">
        {sets.map((s, idx) => {
          const isInEditMode = !s.is_finished && s.id;
          return (
            <div key={idx} className={`glass p-4 rounded-2xl border transition-all ${
              s.is_finished ? 'bg-slate-50/50 dark:bg-slate-800/10 border-slate-100 dark:border-slate-800' : 
              isInEditMode ? 'border-amber-400 dark:border-amber-600 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/20' :
              'border-primary-200 dark:border-primary-900 shadow-lg shadow-primary-500/5'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold uppercase text-slate-400">Set {idx + 1}</span>
                {s.is_finished ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      FINALIZADO
                    </div>
                    <button 
                      onClick={() => {
                        const newSets = [...sets];
                        newSets[idx] = { ...newSets[idx], is_finished: false };
                        setSets(newSets);
                      }}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors border border-blue-200 dark:border-blue-800 uppercase"
                    >
                      Editar Pontos
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                    <Circle className="w-3 h-3 fill-current animate-pulse" />
                    EM JOGO
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={() => updateSetScore(idx, 'points_a', (s.points_a || 0) + 1)} 
                    disabled={s.is_finished || saving} 
                    className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary-100 flex items-center justify-center font-bold text-xl active:scale-95 transition-transform"
                  >
                    +
                  </button>
                  <div className="text-3xl font-black w-12 text-center">{s.points_a}</div>
                  <button 
                    onClick={() => updateSetScore(idx, 'points_a', (s.points_a || 0) - 1)} 
                    disabled={s.is_finished || saving} 
                    className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xl active:scale-95 transition-transform"
                  >
                    -
                  </button>
                </div>

                <div className="h-20 w-px bg-slate-100 dark:bg-slate-800" />

                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={() => updateSetScore(idx, 'points_b', (s.points_b || 0) + 1)} 
                    disabled={s.is_finished || saving} 
                    className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary-100 flex items-center justify-center font-bold text-xl active:scale-95 transition-transform"
                  >
                    +
                  </button>
                  <div className="text-3xl font-black w-12 text-center">{s.points_b}</div>
                  <button 
                    onClick={() => updateSetScore(idx, 'points_b', (s.points_b || 0) - 1)} 
                    disabled={s.is_finished || saving} 
                    className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xl active:scale-95 transition-transform"
                  >
                    -
                  </button>
                </div>
              </div>

              {!s.is_finished && (
                <button 
                  onClick={() => finishSet(idx)}
                  className="w-full mt-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
                >
                  Finalizar Set
                </button>
              )}
            </div>
          );
        })}

        {sets.length < maxSets && !winnerIdCandidate && (
          <button 
            onClick={addSet}
            className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-primary-600 hover:border-primary-300 transition-all font-bold"
          >
            <Plus className="w-5 h-5" />
            Adicionar Set
          </button>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <button 
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          Salvar Parcial
        </button>

        {winnerIdCandidate && (
          <button 
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Trophy className="w-5 h-5" />
            Encerrar Partida
          </button>
        )}
      </div>
    </div>
  );
}
