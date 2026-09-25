import { getSupabase } from './supabase';
import type { LeaderboardEntry } from './leaderboard';

export interface Group {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  members: number;
}

export class GroupError extends Error {}

const MESSAGES: [RegExp, string][] = [
  [/could not find the function|does not exist|PGRST202|PGRST205/i, 'I gruppi non sono ancora attivi sul server.'],
  [/codice non valido/i, 'Codice non valido: controlla le lettere e riprova.'],
  [/gruppo pieno/i, 'Il gruppo ha raggiunto il numero massimo di membri.'],
  [/troppi gruppi/i, 'Hai già creato il numero massimo di gruppi (20).'],
  [/nome mancante/i, 'Scrivi un nome per il gruppo.'],
  [/not authenticated|JWT/i, 'Accedi per usare i gruppi.'],
  [/network|fetch/i, 'Connessione assente: riprova.'],
];

function fail(e: { message: string; code?: string }): never {
  const text = `${e.message} ${e.code ?? ''}`;
  throw new GroupError(MESSAGES.find(([re]) => re.test(text))?.[1] ?? e.message);
}

export async function myGroups(): Promise<Group[]> {
  const { data, error } = await (await getSupabase()).rpc('my_groups');
  if (error) fail(error);
  return (data ?? []).map((g: Group) => ({ ...g, members: Number(g.members) }));
}

export async function createGroup(name: string): Promise<Pick<Group, 'id' | 'name' | 'code'>> {
  const { data, error } = await (await getSupabase()).rpc('create_group', { p_name: name.trim() });
  if (error) fail(error);
  return data;
}

export async function joinGroup(code: string): Promise<Pick<Group, 'id' | 'name' | 'code'>> {
  const { data, error } = await (await getSupabase()).rpc('join_group', { p_code: code.trim().toUpperCase() });
  if (error) fail(error);
  return data;
}

export async function leaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await (await getSupabase()).rpc('group_leaderboard', { gid: groupId });
  if (error) fail(error);
  return data ?? [];
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await (await getSupabase()).from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
  if (error) fail(error);
}

export async function removeMember(groupId: string, userId: string) {
  return leaveGroup(groupId, userId);
}

export async function deleteGroup(groupId: string) {
  const { error } = await (await getSupabase()).from('groups').delete().eq('id', groupId);
  if (error) fail(error);
}

/** Link d'invito: apre l'app nella pagina Gruppi con il codice già inserito. */
export function inviteLink(code: string): string {
  return `${location.origin}${location.pathname}#/gruppi?codice=${code}`;
}
