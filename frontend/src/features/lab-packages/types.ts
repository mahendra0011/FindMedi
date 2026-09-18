/** Lab packages feature — API response types. */
export interface LabPackage {
  _id: string;
  name: string;
  description?: string;
  tests: string[];
  discount?: number;
  price: number;
}

export interface LabPackageForm {
  name: string;
  description: string;
  tests: string[];
  discount: number;
  price: number;
}
