import { getSupabase } from './supabase';
import type { LeaderboardEntry } from './leaderboard';
import type { Assignment, StudentRow } from './teacher';

export type GroupKind = 'group' | 'class';

export interface Group {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  /** Nelle classi conta solo gli studenti. */
  members: number;
  kind: GroupKind;
  role: 'student' | 'teacher';
  leaderboard_visible: boolean;
}

export class GroupError extends Error {}

const MESSAGES: [RegExp, string][] = [
  [/could not find the function|does not exist|PGRST202|PGRST205/i, 'I gruppi non sono ancora attivi sul server.'],
  [/codice non valido/i, 'Codice non valido: controlla le lettere e riprova.'],
  [/troppi tentativi/i, 'Troppi tentativi con i codici: riprova tra un’ora.'],
  [/gruppo pieno/i, 'Il gruppo ha raggiunto il numero massimo di membri.'],
  [/troppi gruppi/i, 'Hai già creato il numero massimo di gruppi (20).'],
  [/nome mancante/i, 'Scrivi un nome per il gruppo.'],
  [/solo insegnanti|solo il proprietario/i, 'Operazione riservata agli insegnanti della classe.'],
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
  return (data ?? []).map((g: Group) => ({
    ...g, members: Number(g.members), kind: g.kind ?? 'group', role: g.role ?? 'student', leaderboard_visible: g.leaderboard_visible ?? true,
  }));
}

export async function createGroup(name: string, kind: GroupKind = 'group'): Promise<Pick<Group, 'id' | 'name' | 'code'>> {
  const params = kind === 'class' ? { p_name: name.trim(), p_kind: 'class' } : { p_name: name.trim() };
  const { data, error } = await (await getSupabase()).rpc('create_group', params);
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

/** Nome e tipo di un gruppo prima di entrarci (per il consenso nelle classi). */
export async function groupInfo(code: string): Promise<{ name: string; kind: GroupKind } | null> {
  const { data, error } = await (await getSupabase()).rpc('group_info', { p_code: code.trim().toUpperCase() });
  if (error) {
    // server senza le classi: si procede come per un gruppo normale
    if (/PGRST202|could not find/i.test(`${error.message} ${error.code}`)) return null;
    fail(error);
  }
  return data;
}

export async function classReport(groupId: string): Promise<StudentRow[]> {
  const { data, error } = await (await getSupabase()).rpc('class_report', { gid: groupId });
  if (error) fail(error);
  return data ?? [];
}

export async function setLeaderboardVisible(groupId: string, visible: boolean) {
  const { error } = await (await getSupabase()).rpc('set_leaderboard_visible', { gid: groupId, visible });
  if (error) fail(error);
}

export async function setMemberRole(groupId: string, userId: string, role: 'student' | 'teacher') {
  const { error } = await (await getSupabase()).rpc('set_member_role', { gid: groupId, uid: userId, new_role: role });
  if (error) fail(error);
}

export async function listAssignments(groupId?: string): Promise<Assignment[]> {
  let q = (await getSupabase()).from('assignments').select('*, groups(name)').order('due_date', { ascending: true, nullsFirst: false });
  if (groupId) q = q.eq('group_id', groupId);
  const { data, error } = await q;
  if (error) fail(error);
  return data ?? [];
}

export async function addAssignment(groupId: string, userId: string, lessonId: number, dueDate: string | null, note: string) {
  const { error } = await (await getSupabase()).from('assignments').insert({
    group_id: groupId, lesson_id: lessonId, due_date: dueDate || null, note: note.trim(), created_by: userId,
  });
  if (error) fail(error);
}

export async function deleteAssignment(id: string) {
  const { error } = await (await getSupabase()).from('assignments').delete().eq('id', id);
  if (error) fail(error);
}
