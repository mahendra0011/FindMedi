/** Departments feature — API response types. */
export interface Department {
  _id: string;
  name: string;
  description?: string;
  head?: string;
  active?: boolean;
  fees_structure?: number;
}

export interface DepartmentForm {
  name: string;
  description: string;
  head: string;
  active: boolean;
  fees_structure: number;
}
