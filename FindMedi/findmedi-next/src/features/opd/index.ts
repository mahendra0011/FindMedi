/** OPD registration feature barrel. */
export type { OPDPatient, OPDToken, TokenStats, RegStats } from './types';
export {
  getPatients,
  getTokens,
  createPatient,
  generateToken,
  getTokenQueue,
  callToken,
  startTokenConsultation,
  completeToken,
  skipToken,
  recallToken,
  getTokenStats,
  searchPatients,
  getRegStats,
} from './api';
export {
  useOPDPatients,
  useOPDTokens,
  useCreatePatient,
  useGenerateToken,
  useTokenQueue,
  useTokenStats,
  useCallToken,
  useStartConsultation,
  useCompleteToken,
  useSkipToken,
  useRecallToken,
  usePatientSearch,
  useRegStats,
} from './hooks';
