import { useQuery } from '@tanstack/react-query';
import { getDiagnostics } from './api';
export function useDiagnostics() {
  return useQuery({ queryKey: ['diagnostics'], queryFn: getDiagnostics });
}
