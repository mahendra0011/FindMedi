/**
 * MIND-M-04: purpose-bound consent and session-level retention for mental
 * health.
 *
 * Two separate controls, and it matters that they are separate:
 *
 * 1. PURPOSE LIMITATION (DPDP s.6). Consent to *treat* is not consent to use the
 *    therapy record for research, teaching, or an insurance claim. The existing
 *    consent record is a single `consentType` string, so nothing downstream can
 *    tell which use was actually authorised. A referral whose only consent is
 *    "Treatment Consent" must therefore REFUSE a research export.
 *
 * 2. RETENTION. Therapy notes are the most sensitive record in the product.
 *    "Destroy notes after N days unless consent is renewed" needs two parts that
 *    did not exist: the consent has to carry the N, and the sessions have to
 *    carry the date they stop being necessary.
 *
 * WHY THE SWEEP DESTROYS NOTES BUT KEEPS THE ENCOUNTER
 * A swept session keeps date, type and clinician, and loses `notes`. The
 * encounter has to stay on the record - a treatment timeline with holes in it is
 * clinically dangerous - but the free text is the part with no clinical value
 * after the window and the most exposure if it leaks.
 */

export const MH_PURPOSES = [
  'treatment',
  'medication',
  'research',
  'teaching',
  'insurance',
  'third-party-sharing',
];

/** Defaults when a consent predates purpose binding: the narrowest safe set. */
export const DEFAULT_PURPOSES = ['treatment', 'medication'];
export const DEFAULT_RETENTION_DAYS = 365;

const daysBetween = (from, to) => (to.getTime() - from.getTime()) / 86400000;

/**
 * Is there a live consent covering `purpose`?
 *
 * Fail CLOSED. A consent with no `purposes` array predates this work, and the
 * narrow default is treatment/medication only - not "everything".
 *
 * @returns {{ ok: boolean, reason?: string, consent?: object }}
 */
export const assertPurposeConsent = (referral, purpose = 'treatment', now = new Date()) => {
  const consents = referral?.consents || [];
  if (consents.length === 0) {
    return { ok: false, reason: 'no-consent-on-record' };
  }

  const match = consents.find((c) => {
    if (c.status === 'Revoked') return false;
    if (c.expiryDate && new Date(c.expiryDate) <= now) return false;

    // A legacy consent with no purposes array only ever authorised care.
    const purposes = Array.isArray(c.purposes) && c.purposes.length ? c.purposes : DEFAULT_PURPOSES;
    return purposes.includes(purpose);
  });

  if (!match) return { ok: false, reason: 'no-active-consent-for-purpose' };
  return { ok: true, consent: match };
};

/**
 * The retention deadline for a session created under `consent`.
 *
 * Falls back to the default window when the consent predates retention policy,
 * rather than storing null - a null `retainUntil` would mean "never", which is
 * the opposite of the intent.
 */
export const retentionDeadlineFor = (consent, now = new Date()) => {
  const days = Number(consent?.retentionDays) > 0 ? Number(consent.retentionDays) : DEFAULT_RETENTION_DAYS;
  const from = consent?.grantedAt ? new Date(consent.grantedAt) : now;
  return new Date(from.getTime() + days * 86400000);
};

/**
 * Sessions whose retention window has closed and whose notes are still present.
 * Read-only - safe to run against production on a schedule.
 */
export const sessionsPastRetention = (referral, now = new Date()) => {
  const sessions = referral?.sessions || [];
  return sessions
    .map((s, index) => ({ session: s, index }))
    .filter(({ session }) => {
      if (!session?.retainUntil) return false;
      if (session.purgedAt) return false;
      const hasNotes = typeof session.notes === 'string' && session.notes.trim().length > 0;
      return hasNotes && new Date(session.retainUntil) <= now;
    });
};

/**
 * Destroy the notes of sessions past their retention window, in place.
 *
 * `dryRun` is the default everywhere it is called from. This is irreversible,
 * operates on the most sensitive record class in the product, and must never run
 * because someone forgot a query parameter.
 */
export const sweepRetention = (referral, { dryRun = true, now = new Date() } = {}) => {
  const sessions = referral?.sessions || [];
  const eligible = sessionsPastRetention(referral, now);

  const details = eligible.map(({ index, session }) => ({
    index,
    sessionDate: session.date,
    retainUntil: session.retainUntil,
    noteLength: typeof session.notes === 'string' ? session.notes.length : 0,
    // Days past the deadline - distinguishes a policy that is never renewed
    // from one that is swept on time.
    daysOverdue: Math.floor(daysBetween(new Date(session.retainUntil), now)),
  }));

  if (!dryRun) {
    for (const { index, session } of eligible) {
      session.notes = '';
      session.purgedAt = now;
      // consentId / date / type / conductedBy are deliberately retained.
      sessions[index] = session;
    }
    if (referral) referral.sessions = sessions;
  }

  return {
    scanned: sessions.length,
    eligible: eligible.length,
    purged: dryRun ? 0 : eligible.length,
    dryRun,
    details,
  };
};

/** True when a consent has lapsed and nobody renewed it. */
export const isLapsed = (consent, now = new Date()) =>
  !!consent?.expiryDate && new Date(consent.expiryDate) <= now;

/** Build the renewal record, carrying the purpose set and retention forward. */
export const buildRenewal = (previous, { signedBy, notes, expiresAt, retentionDays } = {}) => ({
  consentType: previous?.consentType || 'Treatment Consent',
  documentUrl: previous?.documentUrl || '',
  signedBy: signedBy || previous?.signedBy || '',
  grantedAt: new Date(),
  signedAt: new Date(),
  expiresAt: expiresAt || null,
  expiryDate: expiresAt || null,
  retentionDays: Number(retentionDays) > 0
    ? Number(retentionDays)
    : previous?.retentionDays || DEFAULT_RETENTION_DAYS,
  purposes: Array.isArray(previous?.purposes) && previous.purposes.length
    ? previous.purposes
    : DEFAULT_PURPOSES,
  notes: notes || '',
  status: 'Active',
  renewedFrom: previous?._id ? String(previous._id) : null,
});