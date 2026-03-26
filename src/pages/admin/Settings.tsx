import { useState, useEffect } from 'react';
import { Database as DBIcon, RefreshCw, ShieldAlert, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function Settings() {
  const [saving, setSaving] = useState(false);
  const [tournament, setTournament] = useState<{ id: string, name: string, description: string | null } | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  
  const [confirmEdit, setConfirmEdit] = useState(false);

  const [isImmutable, setIsImmutable] = useState(() => {
    return localStorage.getItem('match_immutability') === 'true';
  });

  useEffect(() => {
    fetchTournament();
  }, []);

  const fetchTournament = async () => {
    const { data } = await supabase.from('tournaments').select('*').single();
    if (data) {
      setTournament(data);
      setEditName(data.name);
      setEditDesc(data.description || '');
    }
  };

  const toggleImmutability = () => {
    const newVal = !isImmutable;
    setIsImmutable(newVal);
    localStorage.setItem('match_immutability', String(newVal));
  };

  const handleSaveTournament = async () => {
    if (!tournament || !confirmEdit) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('tournaments')
        .update({ name: editName, description: editDesc })
        .eq('id', tournament.id);

      if (error) throw error;
      alert('Torneio atualizado com sucesso!');
      setConfirmEdit(false);
      fetchTournament();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold">Configurações do Sistema</h2>
        <p className="text-slate-500 mt-1">Gerencie as preferências globais do torneio</p>
      </div>

      <div className="grid gap-6">
        {/* Tournament Info */}
        <div className="glass p-8 rounded-[32px] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <DBIcon className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold">Informações do Torneio</h3>
          </div>

          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Nome do Torneio</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Descrição</label>
                <input 
                  type="text" 
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl">
              <input 
                type="checkbox" 
                id="confirmEdit" 
                checked={confirmEdit}
                onChange={(e) => setConfirmEdit(e.target.checked)}
                className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="confirmEdit" className="text-sm font-bold text-amber-700 dark:text-amber-400">
                Confirmo que desejo alterar as informações do torneio.
              </label>
            </div>

            <button 
              onClick={handleSaveTournament}
              disabled={saving || !confirmEdit || !editName}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-slate-900 dark:bg-primary-600 text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-primary-500/10"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        {/* Security & Rules */}
        <div className="glass p-8 rounded-[32px] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold">Segurança & Regras</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                   <div className={`w-3 h-3 rounded-full ${isImmutable ? 'bg-primary-500 animate-pulse' : 'bg-slate-400'}`} />
                </div>
                <div>
                  <p className="font-bold text-lg">Imutabilidade de Jogos</p>
                  <p className="text-sm text-slate-500">Impedir edição de jogos finalizados por árbitros</p>
                </div>
              </div>
              <button 
                onClick={toggleImmutability}
                className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isImmutable ? 'bg-primary-600 shadow-lg shadow-primary-500/30' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${isImmutable ? 'right-1.5' : 'left-1.5'}`} />
              </button>
            </div>

            <div className="p-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[32px] space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                  <RefreshCw className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-blue-900 dark:text-blue-400">Gerenciamento de Ciclo</h4>
                  <p className="text-sm text-blue-700/70 dark:text-blue-400/60 mt-1">
                    Para **Reiniciar** (limpar placares), **Finalizar** ou **Excluir** um torneio permanentemente, utilize as ferramentas na página de Gerenciamento de Torneios.
                  </p>
                </div>
              </div>
              <a 
                href="/admin/torneios"
                className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-primary-600 text-white rounded-2xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-primary-500/20 text-center"
              >
                Ir para Gerenciamento de Torneios
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
