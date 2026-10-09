/**
 * File 22 P1-24: tele-consult Rx compliance (Telemedicine Practice
 * Guidelines 2020, List O/A/B spirit). Prohibited-on-tele list covers
 * NDPS + Schedule X exemplars by generic substring — a miss here harms a
 * patient, so matching is intentionally broad (substring, case-insensitive).
 */
const PROHIBITED = [
  // Benzodiazepines / Z-drugs
  'alprazolam', 'clonazepam', 'diazepam', 'lorazepam', 'nitrazepam',
  'midazolam', 'zolpidem', 'zopiclone', 'chlordiazepoxide', 'oxazepam',
  // Opioids / NDPS exemplars
  'morphine', 'codeine', 'tramadol', 'fentanyl', 'buprenorphine',
  'pentazocine', 'dextropropoxyphene',
  // Other Schedule X / abuse-prone
  'ketamine', 'phenobarbitone', 'amobarbital', 'secobarbital',
  'methylphenidate', 'amphetamine', 'modafinil', 'armodafinil',
  'pregabalin', 'gabapentin',
];

export function checkTeleRx(medicines) {
  const hits = [];
  for (const m of medicines || []) {
    const name = String(m?.medicineName || m?.name || '').toLowerCase();
    const hit = PROHIBITED.find((p) => name.includes(p));
    if (hit) hits.push({ medicine: m?.medicineName || m?.name, matched: hit });
  }
  return hits;
}

export function isTeleMode(appointmentMode) {
  return ['video', 'audio', 'voice', 'call', 'tele'].includes(String(appointmentMode || '').toLowerCase());
}
