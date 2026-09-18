/**
 * Lab-tests feature — types.
 * There is no dedicated model file yet, so we define the canonical shapes here.
 */
export interface LabTestCategory {
  _id: string;
  name: string;
  code: string;
  description?: string;
}

export interface LabTestResult {
  testId: string;
  testName: string;
  value: string | number;
  unit: string;
  referenceRange: { min: string; max: string };
  flagged: boolean;
  status: 'pending' | 'completed' | 'rejected';
}
