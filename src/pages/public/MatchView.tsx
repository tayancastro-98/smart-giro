import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, Loader2, Trophy, Clock } from 'lucide-react';
import type { Database } from '../../types/supabase';

type Match = Database['public']['Tables']['matches']['Row'] & {
  team_a: { name: string } | null;
  team_b: { name: string } | null;
};
type SetRecord = Database['public']['Tables']['sets']['Row'];

export function MatchView() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [sets, setSets] = useState<SetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (matchId) {
      fetchMatchData();
      const channel = supabase
        .channel(`match-${matchId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, fetchMatchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sets', filter: `match_id=eq.${matchId}` }, fetchMatchData)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const fetchMatchData = async () => {
    if (!matchId) return;
    try {
      const { data: mData } = await supabase
        .from('matches')
        .select('*, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name)')
        .eq('id', matchId)
        .single();
      
      setMatch(mData as any);

      const { data: sData } = await supabase
        .from('sets')
        .select('*')
        .eq('match_id', matchId)
        .order('set_number', { ascending: true });

      setSets(sData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>;
  if (!match) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 pb-20">
      <div className="max-w-3xl mx-auto pt-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-900 rounded-full transition-colors mb-8">
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="glass p-8 rounded-[40px] border border-slate-800 text-center relative overflow-hidden mb-12">
          {match.status === 'IN_PROGRESS' && (
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-pulse" />
          )}
          
          <div className="flex items-center justify-between gap-6 mb-12">
            <div className="flex-1 space-y-4">
              <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto text-4xl font-black text-blue-500">
                {match.team_a?.name?.[0]}
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight leading-tight">{match.team_a?.name}</h2>
              <div className="text-6xl font-black text-primary-500">{match.score_a || 0}</div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl font-black italic text-slate-700">VS</span>
              {match.status === 'FINISHED' ? (
                <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-full flex items-center gap-2">
                  <Trophy className="w-3 h-3" />
                  ENCERRADO
                </div>
              ) : (
                <div className="px-4 py-1.5 bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[10px] font-black rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-ping" />
                  AO VIVO
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto text-4xl font-black text-red-500">
                {match.team_b?.name?.[0]}
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight leading-tight">{match.team_b?.name}</h2>
              <div className="text-6xl font-black text-primary-500">{match.score_b || 0}</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-black uppercase tracking-widest text-slate-500 text-xs text-center">Breakdown por Set</h3>
          
          <div className="grid gap-4">
            {sets.map((s, idx) => (
              <div key={idx} className={`glass p-6 rounded-2xl border ${s.is_finished ? 'border-slate-800' : 'border-primary-500/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SET {idx + 1}</span>
                  {!s.is_finished && <span className="text-[10px] font-black text-primary-400 flex items-center gap-1"><Clock className="w-3 h-3" /> EM DISPUTA</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-4xl font-black ${s.is_finished && s.points_a > s.points_b ? 'text-primary-400' : s.is_finished ? 'text-slate-600' : 'text-white'}`}>
                    {s.points_a}
                  </span>
                  <div className="w-px h-8 bg-slate-800 mx-8" />
                  <span className={`text-4xl font-black ${s.is_finished && s.points_b > s.points_a ? 'text-primary-400' : s.is_finished ? 'text-slate-600' : 'text-white'}`}>
                    {s.points_b}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
