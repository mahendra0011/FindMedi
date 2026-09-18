/**
 * Family members feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { FamilyMember, FamilyMemberForm } from './types';

export const getFamily = (): Promise<{ members: FamilyMember[] }> => Promise.resolve({ members: [] });

export const createFamily = (body: FamilyMemberForm): Promise<FamilyMember> => {
  const { name, relation, gender, phone, bloodGroup } = body;
  return Promise.resolve({
    _id: `fam-${crypto.randomUUID()}`,
    name,
    relation,
    gender,
    phone,
    bloodGroup,
  });
};

export const deleteFamily = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};
