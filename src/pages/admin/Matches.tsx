import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Trophy, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Database } from '../../types/supabase';
import { useNavigate } from 'react-router-dom';

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
  const isImmutable = localStorage.getItem('match_immutability') === 'true';
  const navigate = useNavigate();

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
        .order('match_number', { ascending: true });
      if (mError) throw mError;
      setMatches(mData as any);

      // Fetch Teams (for assignment in Phase 1)
      const { data: tData, error: tError } = await supabase
        .from('teams')
        .select('*')
        .eq('category_id', catId)
        .order('name', { ascending: true });
      if (tError) throw tError;
      setTeams(tData || []);

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
  }, [selectedCategoryId]);

  const handleInitializePhase1 = async () => {
    if (!selectedCategoryId) return;
    try {
      setMatchesLoading(true);
      // Generate 11 match slots if they don't exist
      const matchSlots = Array.from({ length: 11 }, (_, i) => ({
        category_id: selectedCategoryId,
        match_number: i + 1,
        phase: i < 5 ? 1 : i < 8 ? 2 : i < 10 ? 3 : 4,
        is_best_of_5: i === 10, // J11 is best of 5
        status: 'PENDING'
      }));

      const { error } = await supabase.from('matches').upsert(matchSlots, { onConflict: 'category_id,match_number' });
      if (error) throw error;
      
      fetchMatchesAndTeams(selectedCategoryId);
    } catch (error) {
      console.error(error);
      alert('Erro ao inicializar as partidas');
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
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none appearance-none min-w-[200px]"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.tournament.name} - {cat.gender === 'MASCULINE' ? 'Masc' : 'Fem'}</option>
            ))}
          </select>
          
          {matches.length === 0 && (
            <button 
              onClick={handleInitializePhase1}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-xl transition-colors shadow-lg shadow-primary-500/30"
            >
              Inicializar Partidas
            </button>
          )}
        </div>
      </div>

      {matchesLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 glass border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhuma partida inicializada</h3>
          <p className="text-slate-500 max-w-xs mx-auto mb-6">Clique em "Inicializar Partidas" para criar os 11 confrontos obrigatórios da categoria.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[1, 2, 3, 4].map(phase => {
            const phaseMatches = matches.filter(m => m.phase === phase);
            if (phaseMatches.length === 0) return null;
            
            return (
              <div key={phase} className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  {phase === 1 ? 'Fase 1: Rodada Inicial (10 Times)' : 
                   phase === 2 ? 'Fase 2: Quartas / Repescagem' : 
                   phase === 3 ? 'Fase 3: Semifinais' : 'Fase 4: Grande Final'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {phaseMatches.map(match => (
                    <div key={match.id} className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Jogo {match.match_number}</span>
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
                          {phase === 1 ? (
                            <select 
                              value={match.team_a_id || ''}
                              onChange={(e) => handleAssignTeam(match.id, 'team_a_id', e.target.value)}
                              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg"
                            >
                              <option value="">Selecione Time A</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          ) : (
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium">
                              {match.team_a?.name || (phase === 2 && match.match_number === 6 ? 'A definir: 1MV' : 'A definir...')}
                            </div>
                          )}
                          <div className="text-center text-[10px] font-bold text-slate-400">VS</div>
                          {phase === 1 ? (
                            <select 
                              value={match.team_b_id || ''}
                              onChange={(e) => handleAssignTeam(match.id, 'team_b_id', e.target.value)}
                              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg"
                            >
                              <option value="">Selecione Time B</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          ) : (
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium">
                              {match.team_b?.name || (phase === 2 && match.match_number === 6 ? 'A definir: MC' : 'A definir...')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        {match.status === 'FINISHED' ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                              <CheckCircle2 className="w-4 h-4" />
                              {match.winner_id === match.team_a_id ? 'Vencedor: ' + match.team_a?.name : 'Vencedor: ' + match.team_b?.name}
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
