import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, Loader2, Trophy } from 'lucide-react';
import type { Database } from '../../types/supabase';

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
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

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
          .update({ name, seed_number: seedNumber })
          .eq('id', editingTeamId);
        if (error) throw error;
        alert('Equipe atualizada!');
      } else {
        if (teams.length >= 10) {
          alert('Limite de 10 equipes atingido para esta categoria.');
          return;
        }
        const { error } = await supabase
          .from('teams')
          .insert({
            category_id: selectedCategoryId,
            name,
            seed_number: seedNumber
          });
        if (error) throw error;
        alert('Equipe cadastrada!');
      }

      setName('');
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
    console.log('Delete clicked for team:', id, teamName);
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
        
        <div className="flex items-center gap-3">
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
          
          <button 
            onClick={() => {
              setIsCreating(true);
              setSeedNumber(teams.length + 1);
            }}
            disabled={teams.length >= 10}
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
              <label className="block text-sm font-medium mb-1 ml-1">Número de Cabeça de Chave (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={seedNumber}
                onChange={(e) => setSeedNumber(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              />
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
                Salvar Equipe
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100 italic w-20">#</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Equipe</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isTeamsLoading ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </td>
              </tr>
            ) : teams.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
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
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    {team.name}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingTeamId(team.id);
                          setName(team.name);
                          setSeedNumber(team.seed_number ?? 1);
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
          * Máximo de 10 equipes permitido por categoria no sistema Smart Giro.
        </p>
      )}
    </div>
  );
}
