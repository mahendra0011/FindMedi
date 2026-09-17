/**
 * Auth feature — hooks.
 * The real auth hook lives in @/hooks/useAuth (Redux-based); re-export it
 * so the feature folder stays the single import surface for consumers.
 */
export { useAuth } from '@/hooks/useAuth';
