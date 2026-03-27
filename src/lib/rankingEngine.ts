import { supabase } from './supabase';
import type { Database } from '../types/supabase';

type Match = Database['public']['Tables']['matches']['Row'];
type SetRecord = Database['public']['Tables']['sets']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

export interface TeamStats {
  team_id: string;
  name: string;
  sets_won: number;
  sets_lost: number;
  total_points_scored: number;
  last_set_points: number;
  last_set_points_conceded: number;
  points_conceded: number;
  penalties: number;
  matches_played: number;
  is_winner?: boolean;
}

export const computeRanking = (teams: Team[], matches: Match[], allSets: SetRecord[]): TeamStats[] => {
  const statsMap: Record<string, TeamStats> = {};

  // Initialize
  teams.forEach(t => {
    statsMap[t.id] = {
      team_id: t.id,
      name: t.name,
      sets_won: 0,
      sets_lost: 0,
      total_points_scored: 0,
      last_set_points: 0,
      last_set_points_conceded: 0,
      points_conceded: 0,
      penalties: 0,
      matches_played: 0
    };
  });

  // Process completed matches
  matches.filter(m => m.status === 'FINISHED').forEach(m => {
    const matchSets = allSets.filter(s => s.match_id === m.id).sort((a, b) => b.set_number - a.set_number);
    
    if (m.team_a_id) {
       statsMap[m.team_a_id].matches_played++;
       if (m.winner_id === m.team_a_id) statsMap[m.team_a_id].is_winner = true;
    }
    if (m.team_b_id) {
       statsMap[m.team_b_id].matches_played++;
       if (m.winner_id === m.team_b_id) statsMap[m.team_b_id].is_winner = true;
    }

    matchSets.forEach((s, idx) => {
      if (m.team_a_id) {
        statsMap[m.team_a_id].total_points_scored += s.points_a;
        statsMap[m.team_a_id].points_conceded += s.points_b;
        if (s.is_finished) {
           if (s.winner_team_side === 'A') statsMap[m.team_a_id].sets_won++;
           else statsMap[m.team_a_id].sets_lost++;
        }
        // Last set points (index 0 because we sorted by set_number desc)
        if (idx === 0) {
           statsMap[m.team_a_id].last_set_points = s.points_a;
           statsMap[m.team_a_id].last_set_points_conceded = s.points_b;
        }
      }
      if (m.team_b_id) {
        statsMap[m.team_b_id].total_points_scored += s.points_b;
        statsMap[m.team_b_id].points_conceded += s.points_a;
        if (s.is_finished) {
           if (s.winner_team_side === 'B') statsMap[m.team_b_id].sets_won++;
           else statsMap[m.team_b_id].sets_lost++;
        }
        if (idx === 0) {
           statsMap[m.team_b_id].last_set_points = s.points_b;
           statsMap[m.team_b_id].last_set_points_conceded = s.points_a;
        }
      }
    });
  });

  // Sorting based on criteria (User requested: Sets Lost > Pts Conceded > Last Set Pts Conceded)
  return Object.values(statsMap).sort((a, b) => {
    // 1. Sets Won (higher is better) - Important for comparing MC (Losers)
    if (b.sets_won !== a.sets_won) return b.sets_won - a.sets_won;
    // 2. Sets Lost (lower is better)
    if (a.sets_lost !== b.sets_lost) return a.sets_lost - b.sets_lost;
    // 3. Total Points Scored (higher is better)
    if (b.total_points_scored !== a.total_points_scored) return b.total_points_scored - a.total_points_scored;
    // 4. Total Points Conceded (lower is better)
    if (a.points_conceded !== b.points_conceded) return a.points_conceded - b.points_conceded;
    // 5. Last Set Points Scored (higher is better)
    if (b.last_set_points !== a.last_set_points) return b.last_set_points - a.last_set_points;
    // 6. Last Set Points Conceded (lower is better)
    if (a.last_set_points_conceded !== b.last_set_points_conceded) return a.last_set_points_conceded - b.last_set_points_conceded;
    // 7. Penalties (lower is better)
    return a.penalties - b.penalties;
  });
};

export const generateNextPhase = async (categoryId: string, currentPhase: number) => {
  // Fetch current state
  const { data: teams } = await supabase.from('teams').select('*').eq('category_id', categoryId);
  const { data: matches } = await supabase.from('matches').select('*').eq('category_id', categoryId).eq('phase', currentPhase);
  const { data: allSets } = await supabase.from('sets').select('*').in('match_id', (matches || []).map(m => m.id));

  if (!teams || !matches || !allSets) return;

  const ranking = computeRanking(teams, matches, allSets);

  // Split into Winners and Losers for MV and MC logic
  const winners = ranking.filter(r => r.matches_played > 0 && matches.find(m => m.winner_id === r.team_id));
  const losers = ranking.filter(r => r.matches_played > 0 && !matches.find(m => m.winner_id === r.team_id));

  if (currentPhase === 1) {
    // Phase 1 (J1-J5) -> Phase 2 (J6-J8)
    // J6: 1º MV vs 1º MC (Obrigatoriamente)
    // J7: 2º MV vs 4º MV
    // J8: 3º MV vs 5º MV
    
    // winners should be 5 teams
    // losers should be 5 teams
    const mv = winners; // ranked 1 to 5
    const mc = losers[0]; // best loser

    const nextMatches = [
      { num: 6, a: mv[0].team_id, b: mc.team_id },
      { num: 7, a: mv[1].team_id, b: mv[3].team_id },
      { num: 8, a: mv[2].team_id, b: mv[4].team_id }
    ];

    for (const nm of nextMatches) {
       await supabase.from('matches')
         .update({ team_a_id: nm.a, team_b_id: nm.b })
         .eq('category_id', categoryId)
         .eq('match_number', nm.num);
    }
  } else if (currentPhase === 2) {
    // Phase 2 (J6-J8) -> Phase 3 (J9-J10) - Semi Final
    // J9: 1º MV vs 1º MC (Obrigatoriamente)
    // J10: 2º MV vs 3º MV
    
    // Need to rank based on Phase 2 performance
    // MV = Winners of J6, J7, J8
    // MC = Best loser of J6, J7, J8
    const mv = winners;
    const mc = losers[0];

    const nextMatches = [
      { num: 9, a: mv[0].team_id, b: mc.team_id },
      { num: 10, a: mv[1].team_id, b: mv[2].team_id }
    ];

    for (const nm of nextMatches) {
       await supabase.from('matches')
         .update({ team_a_id: nm.a, team_b_id: nm.b })
         .eq('category_id', categoryId)
         .eq('match_number', nm.num);
    }
  } else if (currentPhase === 3) {
    // Phase 3 (J9-J10) -> Phase 4 (J11) - Final
    // J11: Winner J9 vs Winner J10
    const nextMatches = [
      { num: 11, a: winners[0].team_id, b: winners[1].team_id }
    ];

    for (const nm of nextMatches) {
       await supabase.from('matches')
         .update({ team_a_id: nm.a, team_b_id: nm.b })
         .eq('category_id', categoryId)
         .eq('match_number', nm.num);
    }
  }

  // Update category current phase
  await supabase.from('categories').update({ current_phase: currentPhase + 1 }).eq('id', categoryId);
};
