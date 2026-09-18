/** Lab staff feature — API response types. */
export interface LabStaffMember {
  _id: string;
  id?: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  department?: string;
  qualification?: string;
  status?: string;
  joinDate?: string;
}

export interface LabStaffForm {
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  qualification: string;
  status: string;
  joinDate: string;
}
