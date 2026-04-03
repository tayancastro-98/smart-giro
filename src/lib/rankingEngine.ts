import { supabase } from './supabase';
import type { Database } from '../types/supabase';

type Match = Database['public']['Tables']['matches']['Row'];
type SetRecord = Database['public']['Tables']['sets']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

export interface TeamStats {
  team_id: string;
  name: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  sets_won: number;
  sets_lost: number;
  total_points_scored: number;
  points_conceded: number;
  last_set_points: number;
  last_set_points_conceded: number;
  penalties: number;
  is_winner?: boolean;
}

export type TieBreakerCriterion = 
  | 'MATCHES_WON' 
  | 'HEAD_TO_HEAD' 
  | 'SETS_RATIO' 
  | 'POINTS_RATIO' 
  | 'TOTAL_POINTS_SCORED' 
  | 'SETS_WON' 
  | 'POINTS_CONCEDED';

export const computeRanking = (
  teams: Team[], 
  matches: Match[], 
  allSets: SetRecord[],
  criteria: TieBreakerCriterion[] = ['MATCHES_WON', 'SETS_RATIO', 'POINTS_RATIO']
): TeamStats[] => {
  const statsMap: Record<string, TeamStats> = {};

  // Initialize
  teams.forEach(t => {
    statsMap[t.id] = {
      team_id: t.id,
      name: t.name,
      matches_played: 0,
      matches_won: 0,
      matches_lost: 0,
      sets_won: 0,
      sets_lost: 0,
      total_points_scored: 0,
      points_conceded: 0,
      last_set_points: 0,
      last_set_points_conceded: 0,
      penalties: 0
    };
  });

  // Process completed matches
  const finishedMatches = matches.filter(m => m.status === 'FINISHED');
  
  finishedMatches.forEach(m => {
    const matchSets = allSets.filter(s => s.match_id === m.id).sort((a, b) => b.set_number - a.set_number);
    
    if (m.team_a_id) statsMap[m.team_a_id].matches_played++;
    if (m.team_b_id) statsMap[m.team_b_id].matches_played++;

    if (m.winner_id) {
      statsMap[m.winner_id].matches_won++;
      const loserId = m.winner_id === m.team_a_id ? m.team_b_id : m.team_a_id;
      if (loserId) statsMap[loserId].matches_lost++;
    }

    matchSets.forEach((s, idx) => {
      if (m.team_a_id) {
        statsMap[m.team_a_id].total_points_scored += s.points_a;
        statsMap[m.team_a_id].points_conceded += s.points_b;
        if (s.is_finished) {
          if (s.winner_team_side === 'A') statsMap[m.team_a_id].sets_won++;
          else statsMap[m.team_a_id].sets_lost++;
        }
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

  const getHeadToHead = (teamA: string, teamB: string) => {
    const match = finishedMatches.find(m => 
      (m.team_a_id === teamA && m.team_b_id === teamB) || 
      (m.team_a_id === teamB && m.team_b_id === teamA)
    );
    if (!match || !match.winner_id) return 0;
    return match.winner_id === teamA ? 1 : -1;
  };

  const getCriterionValue = (stat: TeamStats, criterion: TieBreakerCriterion): number => {
    switch (criterion) {
      case 'MATCHES_WON': return stat.matches_won;
      case 'SETS_WON': return stat.sets_won;
      case 'SETS_RATIO': return stat.sets_won - stat.sets_lost;
      case 'POINTS_RATIO': return stat.total_points_scored - stat.points_conceded;
      case 'TOTAL_POINTS_SCORED': return stat.total_points_scored;
      case 'POINTS_CONCEDED': return -stat.points_conceded; // Negative because lower is better
      default: return 0;
    }
  };

  return Object.values(statsMap).sort((a, b) => {
    for (const criterion of criteria) {
      if (criterion === 'HEAD_TO_HEAD') {
        const h2h = getHeadToHead(a.team_id, b.team_id);
        if (h2h !== 0) return -h2h; // Negative because sort expects (a,b) => b-a for descending
      } else {
        const valA = getCriterionValue(a, criterion);
        const valB = getCriterionValue(b, criterion);
        if (valB !== valA) return valB - valA;
      }
    }
    // Final tie-breaker: Penalties (lower is better)
    return a.penalties - b.penalties;
  });
};

export const generateNextPhase = async (categoryId: string, currentPhase: number) => {
  // Fetch current state
  const { data: category } = await supabase.from('categories').select('*').eq('id', categoryId).single();
  const { data: teams } = await supabase.from('teams').select('*').eq('category_id', categoryId);
  const { data: matches } = await supabase.from('matches').select('*').eq('category_id', categoryId).eq('phase', currentPhase);
  const { data: allSets } = await supabase.from('sets').select('*').in('match_id', (matches || []).map(m => m.id));

  if (!category || !teams || !matches || !allSets) return;

  const format = category.tournament_format || 'KNOCKOUT';
  const advancementRule = category.advancement_rule as any; // e.g. { type: 'TOP_N_PER_GROUP', n: 2 }
  const tieBreakers = (category.tie_breaker_config as TieBreakerCriterion[]) || ['MATCHES_WON', 'SETS_RATIO', 'POINTS_RATIO'];

  if (format === 'GROUPS' && currentPhase === 1) {
    // Phase 1 (Groups) -> Phase 2 (Knockout)
    const groups = Array.from(new Set(teams.map(t => t.group_name).filter(Boolean)));
    let advancingTeams: TeamStats[] = [];

    for (const groupName of groups) {
      const groupTeams = teams.filter(t => t.group_name === groupName);
      const groupMatches = matches.filter(m => 
        groupTeams.some(t => t.id === m.team_a_id) && 
        groupTeams.some(t => t.id === m.team_b_id)
      );
      const groupRanking = computeRanking(groupTeams, groupMatches, allSets, tieBreakers);
      
      const n = advancementRule?.n || 2;
      advancingTeams = [...advancingTeams, ...groupRanking.slice(0, n)];
    }

    // Now advancingTeams contains the qualifiers. 
    // We need to pair them for the next knockout phase.
    // For simplicity, let's pair 1st of A vs 2nd of B, etc.
    // Or just rank them all together and pair them.
    const sortedQualifiers = advancingTeams.sort((a, b) => {
      // Primary tie-breaker here could be their performance in groups
      if (b.matches_won !== a.matches_won) return b.matches_won - a.matches_won;
      return (b.sets_won - b.sets_lost) - (a.sets_won - a.sets_lost);
    });

    const nextMatches = [];
    let matchNum = matches.length + 1;
    for (let i = 0; i < sortedQualifiers.length; i += 2) {
      if (i + 1 < sortedQualifiers.length) {
        nextMatches.push({
          category_id: categoryId,
          team_a_id: sortedQualifiers[i].team_id,
          team_b_id: sortedQualifiers[i+1].team_id,
          phase: currentPhase + 1,
          match_number: matchNum++,
          status: 'PENDING',
          is_best_of_5: false
        });
      }
    }

    if (nextMatches.length > 0) {
      await supabase.from('matches').insert(nextMatches);
    }
  } else if (format === 'KNOCKOUT' || (format === 'GROUPS' && currentPhase > 1)) {
    // Standard Knockout transition
    const ranking = computeRanking(teams, matches, allSets, tieBreakers);
    const winners = ranking.filter(r => r.matches_won > 0); // This is simplified

    const nextMatches = [];
    let matchNum = (await supabase.from('matches').select('match_number', { count: 'exact' }).eq('category_id', categoryId)).count || 0;
    matchNum++;

    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        nextMatches.push({
          category_id: categoryId,
          team_a_id: winners[i].team_id,
          team_b_id: winners[i+1].team_id,
          phase: currentPhase + 1,
          match_number: matchNum++,
          status: 'PENDING',
          is_best_of_5: false
        });
      }
    }

    if (nextMatches.length > 0) {
      await supabase.from('matches').insert(nextMatches);
    }
  }

  // Update category current phase
  await supabase.from('categories').update({ current_phase: currentPhase + 1 }).eq('id', categoryId);
};
