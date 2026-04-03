import type { Database } from '../types/supabase';

type Team = Database['public']['Tables']['teams']['Row'];

export interface Group {
  name: string;
  teams: Team[];
}

/**
 * Shuffles an array in place.
 */
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Distributes teams into groups of a specific size.
 */
export function createGroups(teams: Team[], groupSize: number): Group[] {
  const shuffled = shuffle(teams);
  const groups: Group[] = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let i = 0; i < shuffled.length; i += groupSize) {
    const groupTeams = shuffled.slice(i, i + groupSize);
    groups.push({
      name: alphabet[Math.floor(i / groupSize)] || (Math.floor(i / groupSize) + 1).toString(),
      teams: groupTeams,
    });
  }

  return groups;
}

/**
 * Generates all Round-Robin matches for a set of groups.
 */
export function generateGroupStage(categoryId: string, groups: Group[]) {
  const matches = [];
  let matchNumber = 1;

  for (const group of groups) {
    const { teams } = group;
    // Round robin within the group
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          category_id: categoryId,
          team_a_id: teams[i].id,
          team_b_id: teams[j].id,
          phase: 1,
          match_number: matchNumber++,
          status: 'PENDING',
          is_best_of_5: false,
          group_name: group.name
        });
      }
    }
  }

  return matches;
}

/**
 * Generates a simple Knockout bracket.
 */
export function generateKnockoutPhase(categoryId: string, teams: Team[], startPhase: number = 1, startMatchNumber: number = 1) {
  const matches = [];
  let matchNumber = startMatchNumber;

  // Simple pairings: 1-2, 3-4, ...
  for (let i = 0; i < teams.length; i += 2) {
    if (i + 1 < teams.length) {
      matches.push({
        category_id: categoryId,
        team_a_id: teams[i].id,
        team_b_id: teams[i + 1].id,
        phase: startPhase,
        match_number: matchNumber++,
        status: 'PENDING',
        is_best_of_5: false,
        group_name: null
      });
    }
  }

  return matches;
}
