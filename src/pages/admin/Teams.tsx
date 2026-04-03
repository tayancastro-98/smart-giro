import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, Loader2, Trophy, Shuffle, UserCheck, UserMinus } from 'lucide-react';
import type { Database } from '../../types/supabase';
import { createGroups } from '../../lib/tournamentGenerator';

type Team = Database['public']['Tables']['teams']['Row'];
type Category = Database['public']['Tables']['categories']['Row'] & {
  tournament: { name: string };
};

export function Teams() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [seedNumber, setSeedNumber] = useState<number>(1);
  const [groupName, setGroupName] = useState('');
  const [skipFirstPhase, setSkipFirstPhase] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          tournament:tournaments(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCategories(data as any);
      if (data && data.length > 0) {
        setSelectedCategoryId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async (catId: string) => {
    if (!catId) return;
    try {
      setIsTeamsLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('category_id', catId)
        .order('group_name', { ascending: true })
        .order('seed_number', { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setIsTeamsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchTeams(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeamId) {
        const { error } = await supabase
          .from('teams')
          .update({ 
            name, 
            seed_number: seedNumber,
            group_name: groupName || null,
            skip_first_phase: skipFirstPhase
          })
          .eq('id', editingTeamId);
        if (error) throw error;
        alert('Equipe atualizada!');
      } else {
        if (teams.length >= 24) {
          alert('Limite de 24 equipes atingido para esta categoria.');
          return;
        }
        const { error } = await supabase
          .from('teams')
          .insert({
            category_id: selectedCategoryId,
            name,
            seed_number: seedNumber,
            group_name: groupName || null,
            skip_first_phase: skipFirstPhase
          });
        if (error) throw error;
        alert('Equipe cadastrada!');
      }

      setName('');
      setGroupName('');
      setSkipFirstPhase(false);
      setSeedNumber(teams.length + 2);
      setIsCreating(false);
      setEditingTeamId(null);
      fetchTeams(selectedCategoryId);
    } catch (error: any) {
      console.error('Error saving team:', error);
      alert(error.message || 'Erro ao salvar equipe');
    }
  };

  const handleDelete = async (id: string, teamName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a equipe "${teamName}"? Esta ação falhará se a equipe já possuir jogos registrados.`)) return;
    try {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') {
          alert('Não é possível excluir esta equipe pois ela já possui jogos (partidas) vinculados. Delete os jogos ou resete o torneio primeiro.');
        } else {
          throw error;
        }
        return;
      }
      alert('Equipe excluída com sucesso.');
      fetchTeams(selectedCategoryId);
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Erro ao excluir equipe.');
    }
  };

  const handleSortGroups = async () => {
    if (!selectedCategory) return;
    if (teams.length < 2) {
      alert('São necessárias pelo menos 2 equipes para realizar o sorteio.');
      return;
    }
    if (!window.confirm('Isso embaralhará as equipes e as dividirá em grupos. As atribuições manuais serão substituídas. Continuar?')) return;

    try {
      setIsTeamsLoading(true);
      const groups = createGroups(teams, selectedCategory.group_size || 3);
      
      const updates = groups.flatMap(g => 
        g.teams.map(t => ({
          id: t.id,
          group_name: g.name
        }))
      );

      for (const update of updates) {
        await supabase
          .from('teams')
          .update({ group_name: update.group_name })
          .eq('id', update.id);
      }

      alert('Grupos sorteados com sucesso!');
      fetchTeams(selectedCategoryId);
    } catch (error) {
      console.error('Error sorting groups:', error);
      alert('Erro ao sortear grupos');
    } finally {
      setIsTeamsLoading(false);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Equipes</h2>
          <p className="text-slate-500 mt-1">Gerencie os times de cada categoria</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none appearance-none min-w-[200px]"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.tournament.name} - {cat.gender === 'MASCULINE' ? 'Masc' : 'Fem'}
                </option>
              ))}
            </select>
          </div>
          
          {selectedCategory?.tournament_format === 'GROUPS' && (
            <button 
              onClick={handleSortGroups}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-xl transition-colors shadow-lg shadow-amber-500/30 flex items-center gap-2"
            >
              <Shuffle className="w-5 h-5" />
              Sortear Grupos
            </button>
          )}

          <button 
            onClick={() => {
              setIsCreating(true);
              setSeedNumber(teams.length + 1);
              setGroupName('');
              setSkipFirstPhase(false);
            }}
            disabled={teams.length >= 24}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-xl transition-colors shadow-lg shadow-primary-500/30 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Equipe
          </button>
        </div>
      </div>

      {(isCreating || editingTeamId) && (
        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold mb-4">{editingTeamId ? 'Editar Equipe' : 'Cadastrar Equipe'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 ml-1">Nome da Equipe</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ex: Dragões do Tênis"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 ml-1">Cabeça de Chave (#)</label>
              <input
                type="number"
                min="1"
                required
                value={seedNumber}
                onChange={(e) => setSeedNumber(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            {selectedCategory?.tournament_format === 'GROUPS' && (
              <div>
                <label className="block text-sm font-medium mb-1 ml-1">Grupo (Ex: Grupo A)</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Deixe vazio para sorteio"
                />
              </div>
            )}
            <div className="flex items-center gap-4 py-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={skipFirstPhase}
                  onChange={(e) => setSkipFirstPhase(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium">Pular 1ª Fase (Bye)</span>
              </label>
              <p className="text-[10px] text-slate-400">Time entra direto na 2ª fase do mata-mata.</p>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => {
                  setIsCreating(false);
                  setEditingTeamId(null);
                  setName('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-md shadow-primary-500/20"
              >
                {editingTeamId ? 'Salvar Alterações' : 'Salvar Equipe'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100 italic w-20">Seed</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100 italic w-20">Grupo</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Equipe</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100 text-center">Status Bye</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isTeamsLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </td>
              </tr>
            ) : teams.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  Nenhuma equipe cadastrada para esta categoria.
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr key={team.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 font-bold text-sm">
                      {team.seed_number}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {team.group_name ? (
                      <span className="px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-md font-bold text-xs">
                        {team.group_name}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">--</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    {team.name}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {team.skip_first_phase ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-600">
                        <UserCheck className="w-4 h-4" />
                        <span className="text-[10px] font-bold">PULA 1ª FASE</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-300 dark:text-slate-600">
                        <UserMinus className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Normal</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingTeamId(team.id);
                          setName(team.name);
                          setSeedNumber(team.seed_number ?? 1);
                          setGroupName(team.group_name || '');
                          setSkipFirstPhase(!!team.skip_first_phase);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(team.id, team.name)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {teams.length > 0 && (
        <p className="text-xs text-slate-500 italic px-2">
          * Máximo de 24 equipes permitido por categoria para garantir a integridade da fase de grupos.
        </p>
      )}
    </div>
  );
}
