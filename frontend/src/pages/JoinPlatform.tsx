/**
 * Join Platform Entry Point
 *
 * Delegates to the unified config-driven JoinWizard onboarding engine.
 * Supports all 46 provider types across 8 display groups with zero out-of-scope categories.
 */

import JoinWizard from './join/JoinWizard';

export default function JoinPlatform() {
  return <JoinWizard />;
}
