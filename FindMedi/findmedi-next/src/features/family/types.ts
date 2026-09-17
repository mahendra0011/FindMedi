/** Family members feature — API response types. */
export interface FamilyMember {
  _id: string;
  name: string;
  relation: string;
  gender?: string;
  phone?: string;
  bloodGroup?: string;
}

export interface FamilyMemberForm {
  name: string;
  relation: string;
  gender: string;
  phone: string;
  bloodGroup: string;
}
