/**
 * MIND-M-01: validated screening instruments with real scoring.
 *
 * The finding said intake had free-text fields and no standardised scoring. That
 * is not just a feature gap here - free-text "how have you been feeling" cannot
 * be trended, cannot trigger a protocol, and cannot tell a clinician that a
 * patient's score fell from 22 to 17. Severity, in mental health, is the number.
 *
 * WHY THE SCORING IS WRITTEN OUT RATHER THAN APPROXIMATED
 * PHQ-9 and GAD-7 have published cut-points, and they are not interchangeable
 * with intuition. A PHQ-9 of 12 is "moderate"; a GAD-7 of 12 is also "moderate"
 * but the maxima differ (27 vs 21), so a shared percentage would misclassify.
 * The bands below are the validated ones.
 *
 * ITEM 9 OF PHQ-9 IS NOT A SCORE ITEM
 * It is a suicidality indicator. It contributes to the total (it must, or the
 * instrument is not PHQ-9) but any non-zero answer is a SEPARATE signal that must
 * reach a human. Scoring it into a total and losing the distinction is how a
 * risk flag disappears into a dashboard. `suicidalityFlagged` is therefore
 * surfaced independently of severity and never suppressed by a low total.
 */

export const RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

const band = (score, ranges) =>
  ranges.find(([max, label]) => score <= max)?.[1] ?? ranges[ranges.length - 1][1];

/**
 * PHQ-9 - Patient Health Questionnaire, 9 items.
 * https://www.phqscreeners.com/select-screener
 */
export const PHQ9 = {
  id: 'PHQ-9',
  label: 'PHQ-9 (Patient Health Questionnaire-9)',
  itemCount: 9,
  maxScore: 27,
  // Validated severity bands for the total.
  severity: (score) => band(score, [[4, 'Minimal'], [9, 'Mild'], [14, 'Moderate'], [19, 'Moderately severe'], [27, 'Severe']]),
  // The accepted threshold for clinically significant change on re-administration.
  reliableChange: 5,
  // A validated referral trigger: moderate or worse should not sit un-actioned.
  referralThreshold: 10,
  items: [
    { id: 'phq9_1', text: 'Little interest or pleasure in doing things' },
    { id: 'phq9_2', text: 'Feeling down, depressed, or hopeless' },
    { id: 'phq9_3', text: 'Trouble falling or staying asleep, or sleeping too much' },
    { id: 'phq9_4', text: 'Feeling tired or having little energy' },
    { id: 'phq9_5', text: 'Poor appetite or overeating' },
    { id: 'phq9_6', text: 'Feeling bad about yourself, or that you are a failure or have let yourself or your family down' },
    { id: 'phq9_7', text: 'Trouble concentrating on things' },
    { id: 'phq9_8', text: 'Moving or speaking so slowly that other people could have noticed, or the opposite - being so fidgety or restless that you have been moving around a lot more than usual' },
    { id: 'phq9_9', text: 'Thoughts that you would be better off dead, or of hurting yourself in some way', suicidalityItem: true },
  ],
};

/**
 * GAD-7 - Generalized Anxiety Disorder scale, 7 items.
 * https://www.phqscreeners.com/select-screener
 */
export const GAD7 = {
  id: 'GAD-7',
  label: 'GAD-7 (Generalized Anxiety Disorder scale)',
  itemCount: 7,
  maxScore: 21,
  severity: (score) => band(score, [[4, 'Minimal'], [9, 'Mild'], [14, 'Moderate'], [21, 'Severe']]),
  // Validated reliable-change threshold for GAD-7 (vs PHQ-9's 5).
  reliableChange: 4,
  referralThreshold: 10,
  items: [
    { id: 'gad7_1', text: 'Feeling nervous, anxious, or on edge' },
    { id: 'gad7_2', text: 'Not being able to stop or control worrying' },
    { id: 'gad7_3', text: 'Worrying too much about different things' },
    { id: 'gad7_4', text: 'Trouble relaxing' },
    { id: 'gad7_5', text: 'Being so restless that it is hard to sit still' },
    { id: 'gad7_6', text: 'Becoming easily annoyed or irritable' },
    { id: 'gad7_7', text: 'Feeling afraid, as if something awful might happen' },
  ],
};

export const INSTRUMENTS = { 'PHQ-9': PHQ9, 'GAD-7': GAD7 };
export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS);

/**
 * Score a completed instrument.
 *
 * REJECTS rather than coercing. A screening instrument with a missing item is
 * not a low score, it is an invalid one - and an invalid screen that scores 0
 * is the most dangerous possible output here, because it reads as "well" to
 * everything downstream.
 *
 * @param {string} instrumentId
 * @param {Record<string, number>} answers keyed by item id
 * @returns {{ valid, reason?, instrument, total, maxScore, severity, percentage, suicidalityFlagged, referralSuggested, responses }}
 */
export const score = (instrumentId, answers = {}) => {
  const instrument = INSTRUMENTS[instrumentId];
  if (!instrument) {
    return { valid: false, reason: `Unknown instrument "${instrumentId}". Expected one of: ${INSTRUMENT_IDS.join(', ')}` };
  }
  if (!answers || typeof answers !== 'object') {
    return { valid: false, reason: 'answers must be an object keyed by item id' };
  }

  const missing = [];
  const outOfRange = [];
  let total = 0;

  for (const item of instrument.items) {
    const raw = answers[item.id];
    if (raw === undefined || raw === null || raw === '') {
      missing.push(item.id);
      continue;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 3) {
      outOfRange.push(item.id);
      continue;
    }
    total += value;
  }

  if (missing.length) {
    return { valid: false, reason: `Missing response(s) for: ${missing.join(', ')}`, instrument: instrument.id };
  }
  if (outOfRange.length) {
    return { valid: false, reason: `Response(s) out of range (0-3) for: ${outOfRange.join(', ')}`, instrument: instrument.id };
  }

  const responses = instrument.items.map((item) => ({ itemId: item.id, value: Number(answers[item.id]) }));

  // Computed from the ITEM definition, not from a hardcoded 9. If the instrument
  // ever changes, the flag follows it instead of silently going stale.
  const suicidalityFlagged = instrument.items.some(
    (item) => item.suicidalityItem && Number(answers[item.id]) > 0
  );

  const severity = instrument.severity(total);

  return {
    valid: true,
    instrument: instrument.id,
    total,
    maxScore: instrument.maxScore,
    // Rounded, not raw: 12/27 = 44.4444... in a report looks like false precision.
    percentage: Math.round((total / instrument.maxScore) * 100),
    severity,
    // Reported independently of severity, always. A patient can score "Mild"
    // overall and still have answered item 9.
    suicidalityFlagged,
    referralSuggested: total >= instrument.referralThreshold || suicidalityFlagged,
    responses,
  };
};

/**
 * Trend across administrations - MIND-M-01's "trend tracking over sessions".
 *
 * Returns direction, the delta, and whether the change is CLINICALLY meaningful
 * rather than just numerically different. A 1-point move is noise; reporting it
 * as "improving" is how a clinician stops trusting the trend line.
 */
export const trend = (instrumentId, administrations = []) => {
  const instrument = INSTRUMENTS[instrumentId];
  if (!instrument) return { instrument: instrumentId, valid: false, reason: 'Unknown instrument' };

  const points = administrations
    .filter((a) => a?.valid !== false && Number.isFinite(Number(a?.total)))
    .map((a) => ({ at: a.completedAt || a.createdAt || null, total: Number(a.total) }))
    .sort((a, b) => (a.at ? new Date(a.at) : 0) - (b.at ? new Date(b.at) : 0));

  if (points.length === 0) return { instrument: instrument.id, valid: true, points: [], direction: 'no-data', change: null, clinicallyMeaningful: false };

  const first = points[0];
  const latest = points[points.length - 1];
  const change = latest.total - first.total;

  // Midpoint between the two administrations. One administration is not a trend.
  const elapsedDays = first.at && latest.at ? (new Date(latest.at) - new Date(first.at)) / 86400000 : null;

  let direction = 'no-data';
  if (points.length > 1) {
    if (change <= -instrument.reliableChange) direction = 'improving';
    else if (change >= instrument.reliableChange) direction = 'worsening';
    else direction = 'stable';
  }

  return {
    instrument: instrument.id,
    valid: true,
    points,
    administrations: points.length,
    first: first.total,
    latest: latest.total,
    change,
    // Signed so a reader cannot mistake "down 6" for a worsening.
    direction,
    clinicallyMeaningful: points.length > 1 && Math.abs(change) >= instrument.reliableChange,
    elapsedDays,
    reliableChangeThreshold: instrument.reliableChange,
  };
};
