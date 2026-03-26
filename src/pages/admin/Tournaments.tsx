import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Play, Loader2, Trophy, CheckCircle2, Trash2, RefreshCw } from 'lucide-react';
import type { Database } from '../../types/supabase';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

interface TournamentWithCategories extends Tournament {
  categories: Category[];
}

export function Tournaments() {
  const [tournaments, setTournaments] = useState<TournamentWithCategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTournaments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          categories (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data as any);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from('tournaments')
          .update({ name, description })
          .eq('id', editingId);
        if (error) throw error;
        alert('Torneio atualizado!');
      } else {
        const { data: tournament, error: tError } = await supabase
          .from('tournaments')
          .insert({ name, description, status: 'DRAFT' })
          .select()
          .single();

        if (tError) throw tError;

        // Create categories by default
        const { error: cError } = await supabase.from('categories').insert([
          { tournament_id: tournament.id, gender: 'MASCULINE', current_phase: 1, status: 'PENDING' },
          { tournament_id: tournament.id, gender: 'FEMININE', current_phase: 1, status: 'PENDING' }
        ]);

        if (cError) throw cError;
        alert('Torneio criado!');
      }

      setName('');
      setDescription('');
      setIsCreating(false);
      setEditingId(null);
      fetchTournaments();
    } catch (error) {
      console.error('Error saving tournament:', error);
      alert('Erro ao salvar torneio');
    }
  };

  const handleStartTournament = async (id: string) => {
    if (!window.confirm('Tem certeza? Isso ativará o torneio e impedirá certas edições.')) return;
    try {
      const { error } = await supabase.from('tournaments').update({ status: 'ACTIVE' }).eq('id', id);
      if (error) throw error;
      fetchTournaments();
    } catch (error) {
      console.error('Error updating status', error);
      alert('Erro ao iniciar torneio');
    }
  };

  const handleFinishTournament = async (id: string) => {
    if (!window.confirm('Deseja realmente finalizar este torneio? Isso travará os resultados.')) return;
    try {
      const { error } = await supabase.from('tournaments').update({ status: 'FINISHED' }).eq('id', id);
      if (error) throw error;
      fetchTournaments();
    } catch (error) {
      console.error('Error finishing tournament', error);
      alert('Erro ao finalizar torneio');
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (!window.confirm('⚠️ AVISO CRÍTICO: Esta ação vai APAGAR TUDO (Categorias, Equipes, Jogos e Placar) deste torneio permanentemente. Deseja continuar?')) return;
    if (!window.confirm('Tem CERTEZA ABSOLUTA? Esta ação não pode ser desfeita.')) return;

    try {
      setIsLoading(true);
      
      // 1. Get Categories
      const { data: cats } = await supabase.from('categories').select('id').eq('tournament_id', id);
      const catIds = cats?.map(c => c.id) || [];

      if (catIds.length > 0) {
        // 2. Get Matches
        const { data: ms } = await supabase.from('matches').select('id').in('category_id', catIds);
        const mIds = ms?.map(m => m.id) || [];

        if (mIds.length > 0) {
          // 3. Delete Sets
          await supabase.from('sets').delete().in('match_id', mIds);
          // 4. Delete Matches
          await supabase.from('matches').delete().in('id', mIds);
        }

        // 5. Delete Teams
        await supabase.from('teams').delete().in('category_id', catIds);
        // 6. Delete Categories
        await supabase.from('categories').delete().eq('tournament_id', id);
      }

      // 7. Delete Tournament
      const { error: tError } = await supabase.from('tournaments').delete().eq('id', id);
      if (tError) throw tError;

      alert('Torneio excluído com sucesso!');
      fetchTournaments();
    } catch (error) {
      console.error('Error deleting tournament', error);
      alert('Erro ao excluir torneio. Algumas dependências podem não ter sido removidas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetTournament = async (id: string, name: string) => {
    if (!window.confirm(`⚠️ DESEJA REINICIAR O TORNEIO "${name}"?
Todos os placares e sets serão apagados, mas as equipes e a estrutura do torneio serão mantidas.`)) return;
    
    try {
      setIsLoading(true);
      
      // 1. Get Categories
      const { data: cats } = await supabase.from('categories').select('id').eq('tournament_id', id);
      const catIds = cats?.map(c => c.id) || [];

      if (catIds.length > 0) {
        // 2. Get Matches
        const { data: ms } = await supabase.from('matches').select('id').in('category_id', catIds);
        const mIds = ms?.map(m => m.id) || [];

        if (mIds.length > 0) {
          // 3. Delete Sets
          const { error: sErr } = await supabase.from('sets').delete().in('match_id', mIds);
          if (sErr) throw sErr;

          // 4. Reset Matches
          const { error: mErr } = await supabase.from('matches').update({
            status: 'PENDING',
            score_a: 0,
            score_b: 0,
            winner_id: null,
            loser_id: null,
            finalized_at: null
          }).in('id', mIds);
          if (mErr) throw mErr;
        }

        // 5. Reset Categories
        const { error: cErr } = await supabase.from('categories').update({ 
          current_phase: 1,
          status: 'PENDING' 
        }).eq('tournament_id', id);
        if (cErr) throw cErr;
      }

      alert('Torneio reiniciado com sucesso! Todos os placares foram limpos.');
      fetchTournaments();
    } catch (error) {
      console.error('Error resetting tournament', error);
      alert('Erro ao reiniciar torneio.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Torneios</h2>
          <p className="text-slate-500 mt-1">Gerencie os campeonatos e categorias</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-xl transition-colors shadow-lg shadow-primary-500/30 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Torneio
        </button>
      </div>

      {(isCreating || editingId) && (
        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Editar Torneio' : 'Criar Novo Torneio'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 ml-1">Nome do Torneio</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ex: Copa Smart Giro 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 ml-1">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none h-24"
                placeholder="Detalhes do evento..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => {
                  setIsCreating(false);
                  setEditingId(null);
                  setName('');
                  setDescription('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-md shadow-primary-500/20"
              >
                {editingId ? 'Salvar Alterações' : 'Criar Torneio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tournaments.length === 0 && !isCreating ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">Nenhum torneio encontrado</h3>
          <p className="text-slate-500">Crie o seu primeiro torneio para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold">{tournament.name}</h3>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    tournament.status === 'ACTIVE' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : tournament.status === 'FINISHED'
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {tournament.status === 'ACTIVE' ? 'EM ANDAMENTO' : tournament.status === 'DRAFT' ? 'RASCUNHO' : 'FINALIZADO'}
                  </span>
                </div>
                {tournament.description && <p className="text-slate-500 text-sm">{tournament.description}</p>}
                
                <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {tournament.categories?.map(cat => (
                    <div key={cat.id} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="font-semibold text-primary-600 dark:text-primary-400">
                        {cat.gender === 'MASCULINE' ? 'Masculino' : 'Feminino'}
                      </span>
                      <span className="text-slate-400 px-1">•</span>
                      <span className="text-slate-500">Fase {cat.current_phase}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex md:flex-col gap-2 w-full md:w-auto">
                {tournament.status === 'DRAFT' && (
                  <button 
                    onClick={() => handleStartTournament(tournament.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-md shadow-emerald-500/20"
                  >
                    <Play className="w-4 h-4" />
                    Iniciar
                  </button>
                )}
                {tournament.status === 'ACTIVE' && (
                  <button 
                    onClick={() => handleFinishTournament(tournament.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-md shadow-primary-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finalizar
                  </button>
                )}
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      setEditingId(tournament.id);
                      setName(tournament.name);
                      setDescription(tournament.description || '');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </button>
                  <button 
                    onClick={() => handleResetTournament(tournament.id, tournament.name)}
                    className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 rounded-xl font-medium transition-colors"
                    title="Limpar placares e voltar ao início"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reiniciar
                  </button>
                  <button 
                    onClick={() => handleDeleteTournament(tournament.id)}
                    className="flex-none p-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all"
                    title="Excluir Torneio"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
