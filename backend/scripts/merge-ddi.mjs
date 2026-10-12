// One-shot merge: appends clinically curated DDI pairs into interactions.json
// (dedupes on sorted drugA::drugB key). Run: node scripts/merge-ddi.mjs
import fs from 'node:fs';

const FILE = new URL('../src/config/interactions.json', import.meta.url);

const EXTRA = [
  // ── Bleeding / anticoagulant cluster (continuation) ─────────────────────────
  { drugA: 'warfarin', drugB: 'sulfinpyrazone', severity: 'major', effect: 'Uricosuric displaces warfarin from albumin and inhibits its metabolism, amplifying effect.', recommendation: 'Avoid; if used, reduce warfarin dose and monitor INR daily initially.' },
  { drugA: 'warfarin', drugB: 'trimethoprim', severity: 'major', effect: 'Trimethoprim inhibits warfarin metabolism, raising INR and bleeding risk.', recommendation: 'Monitor INR closely during TMP-SMX and reduce warfarin dose.' },
  { drugA: 'warfarin', drugB: 'dabigatran', severity: 'major', effect: 'Overlapping anticoagulation increases hemorrhage risk without a reliable monitoring marker.', recommendation: 'Avoid routine combination; specialist decision only.' },
  { drugA: 'warfarin', drugB: 'azithromycin', severity: 'moderate', effect: 'Azithromycin can raise INR and bleeding risk in susceptible patients.', recommendation: 'Check INR 3-5 days after starting azithromycin.' },
  { drugA: 'warfarin', drugB: 'terbinafine', severity: 'moderate', effect: 'Terbinafine inhibits warfarin metabolism, raising INR.', recommendation: 'Monitor INR during oral terbinafine therapy.' },
  { drugA: 'warfarin', drugB: 'paroxetine', severity: 'moderate', effect: 'SSRI platelet-serotonin depletion plus CYP effects raise bleeding risk.', recommendation: 'Monitor INR and clinical bleeding; consider gastroprotection.' },
  { drugA: 'warfarin', drugB: 'sertraline', severity: 'moderate', effect: 'SSRIs increase bleeding risk through platelet inhibition and possible INR changes.', recommendation: 'Monitor INR and watch for bruising or GI bleeding.' },
  { drugA: 'warfarin', drugB: 'atorvastatin', severity: 'moderate', effect: 'Atorvastatin can modestly raise INR via CYP interactions.', recommendation: 'Monitor INR after starting atorvastatin.' },
  { drugA: 'rivaroxaban', drugB: 'ketoconazole', severity: 'major', effect: 'Strong CYP3A4/P-gp inhibition raises rivaroxaban levels, increasing major bleeding risk.', recommendation: 'Avoid dual therapy; if required, cap at 15 mg and monitor for bleeding.' },
  { drugA: 'apixaban', drugB: 'ritonavir', severity: 'major', effect: 'Ritonavir roughly doubles apixaban exposure and bleeding risk.', recommendation: 'Avoid; if required, halve the apixaban dose and monitor closely.' },
  { drugA: 'dabigatran', drugB: 'amiodarone', severity: 'moderate', effect: 'P-gp inhibition increases dabigatran exposure, raising bleeding risk.', recommendation: 'Consider dose reduction in elderly/renal impairment; monitor for bleeding.' },
  { drugA: 'enoxaparin', drugB: 'aspirin', severity: 'major', effect: 'Combined anticoagulant and antiplatelet effects raise major bleeding risk.', recommendation: 'Use with caution, lowest effective doses, and clinical monitoring.' },

  // ── Serotonin syndrome cluster ──────────────────────────────────────────────
  { drugA: 'phenelzine', drugB: 'sertraline', severity: 'major', effect: 'MAOI plus SSRI precipitates serotonin syndrome with hyperthermia and death risk.', recommendation: 'Contraindicated. Observe a 14-day washout in either direction.' },
  { drugA: 'tranylcypromine', drugB: 'dextromethorphan', severity: 'major', effect: 'MAOI blocks dextromethorphan metabolism, causing severe serotonin syndrome.', recommendation: 'Avoid all OTC cough preparations containing dextromethorphan during MAOI therapy.' },
  { drugA: 'selegiline', drugB: 'sertraline', severity: 'major', effect: 'Even transdermal selegiline plus SSRI can trigger serotonin syndrome.', recommendation: 'Use only with documented tolerance at low doses; otherwise wash out 14 days.' },
  { drugA: 'linezolid', drugB: 'sertraline', severity: 'major', effect: 'Reversible MAO inhibition by linezolid plus SSRI raises serotonin syndrome risk.', recommendation: 'Monitor closely for serotonin toxicity; consider alternative antibiotic.' },
  { drugA: 'linezolid', drugB: 'venlafaxine', severity: 'major', effect: 'SNRI plus MAO-inhibiting oxazolidinone increases serotonin syndrome risk.', recommendation: 'Monitor BP and serotonin-toxicity signs; prefer alternative antimicrobial.' },
  { drugA: 'methylene blue', drugB: 'sertraline', severity: 'major', effect: 'Methylene blue is a potent MAO inhibitor that precipitates serotonin syndrome with SSRIs.', recommendation: 'Contraindicated. Stop SSRI 2 weeks before elective methylene-blue use.' },
  { drugA: 'phenelzine', drugB: 'tramadol', severity: 'major', effect: 'MAOI plus serotonergic opioid causes serotonin syndrome and lowers seizure threshold.', recommendation: 'Avoid; substitute a non-serotonergic analgesic.' },
  { drugA: 'isocarboxazid', drugB: 'meperidine', severity: 'major', effect: 'Classic MAOI-opioid interaction causing serotonin syndrome and hyperthermia.', recommendation: 'Contraindicated; meperidine must never be used with any MAO inhibitor.' },
  { drugA: 'moclobemide', drugB: 'sertraline', severity: 'major', effect: 'Reversible MAO-A inhibitor plus SSRI raises serotonin syndrome risk.', recommendation: 'Observe a washout period and avoid the combination.' },
  { drugA: 'sertraline', drugB: 'tramadol', severity: 'moderate', effect: 'SSRI plus serotonergic opioid raises serotonin syndrome and seizure risk.', recommendation: 'Monitor for agitation, tremor, or clonus; consider alternative analgesic.' },
  { drugA: 'dextromethorphan', drugB: 'sertraline', severity: 'moderate', effect: 'Serotonergic OTC antitussive plus SSRI can precipitate serotonin syndrome.', recommendation: 'Advise patients to avoid dextromethorphan-containing products.' },
  { drugA: 'fluvoxamine', drugB: 'tizanidine', severity: 'major', effect: 'CYP1A2 inhibition multiplies tizanidine exposure, causing profound hypotension and sedation.', recommendation: 'Contraindicated; use an alternative muscle relaxant or SSRI.' },
  { drugA: 'ciprofloxacin', drugB: 'tizanidine', severity: 'major', effect: 'CYP1A2 inhibition by ciprofloxacin raises tizanidine levels, causing severe hypotension and bradycardia.', recommendation: 'Contraindicated; avoid tizanidine during fluoroquinolone therapy.' },
  { drugA: 'fluvoxamine', drugB: 'clozapine', severity: 'major', effect: 'CYP1A2 inhibition can triple clozapine levels, causing seizures and severe sedation.', recommendation: 'Avoid; if unavoidable, reduce clozapine by 50% and monitor levels.' },
  { drugA: 'clozapine', drugB: 'caffeine', severity: 'moderate', effect: 'Caffeine inhibits CYP1A2, raising clozapine levels unpredictably.', recommendation: 'Advise consistent caffeine intake and monitor clozapine levels.' },

  // ── Methotrexate / cytotoxic cluster ────────────────────────────────────────
  { drugA: 'methotrexate', drugB: 'trimethoprim', severity: 'major', effect: 'Additive antifolate effect causes severe pancytopenia and fatal myelosuppression.', recommendation: 'Contraindicated. Use an alternative antibiotic such as a cephalosporin.' },
  { drugA: 'methotrexate', drugB: 'piperacillin', severity: 'major', effect: 'Penicillins reduce renal tubular secretion of methotrexate, delaying clearance and worsening toxicity.', recommendation: 'Monitor CBC and methotrexate levels closely; consider dose reduction.' },
  { drugA: 'methotrexate', drugB: 'cisplatin', severity: 'major', effect: 'Cisplatin impairs renal methotrexate excretion, causing profound pancytopenia and mucositis.', recommendation: 'Sequence carefully with hydration, leucovorin rescue, and level monitoring.' },
  { drugA: 'methotrexate', drugB: 'ketoprofen', severity: 'major', effect: 'NSAID-induced reduction in renal methotrexate clearance leads to severe myelosuppression.', recommendation: 'Avoid NSAIDs during high-dose methotrexate; use paracetamol.' },

  // ── Statin / rhabdomyolysis cluster ─────────────────────────────────────────
  { drugA: 'simvastatin', drugB: 'itraconazole', severity: 'major', effect: 'Strong CYP3A4 inhibition multiplies statin exposure, causing rhabdomyolysis and acute kidney injury.', recommendation: 'Withhold simvastatin during azole therapy; switch to pravastatin/rosuvastatin.' },
  { drugA: 'simvastatin', drugB: 'clarithromycin', severity: 'major', effect: 'Macrolide CYP3A4 inhibition greatly increases simvastatin levels, risking rhabdomyolysis.', recommendation: 'Stop simvastatin for the antibiotic course or switch to azithromycin.' },
  { drugA: 'simvastatin', drugB: 'diltiazem', severity: 'moderate', effect: 'CYP3A4 inhibition raises simvastatin exposure, increasing myopathy risk.', recommendation: 'Cap simvastatin at 20 mg daily with diltiazem; monitor for muscle pain.' },
  { drugA: 'simvastatin', drugB: 'amiodarone', severity: 'moderate', effect: 'Amiodarone raises simvastatin levels, increasing myopathy and rhabdomyolysis risk.', recommendation: 'Cap simvastatin at 20 mg daily and monitor for muscle symptoms.' },
  { drugA: 'amlodipine', drugB: 'simvastatin', severity: 'moderate', effect: 'Amlodipine increases simvastatin exposure, raising myopathy risk.', recommendation: 'Cap simvastatin at 20 mg daily when co-prescribed with amlodipine.' },
  { drugA: 'verapamil', drugB: 'lovastatin', severity: 'moderate', effect: 'Verapamil inhibits CYP3A4, increasing lovastatin levels and myopathy risk.', recommendation: 'Limit lovastatin to 20 mg daily or switch to pravastatin/rosuvastatin.' },
  { drugA: 'fenofibrate', drugB: 'atorvastatin', severity: 'moderate', effect: 'Fibrate-statin combination increases the risk of myopathy and rhabdomyolysis.', recommendation: 'Use lowest effective statin dose; monitor for muscle pain or dark urine.' },
  { drugA: 'gemfibrozil', drugB: 'warfarin', severity: 'moderate', effect: 'Gemfibrozil displaces warfarin and inhibits its metabolism, raising INR.', recommendation: 'Monitor INR closely when gemfibrozil is added.' },

  // ── Lithium cluster ─────────────────────────────────────────────────────────
  { drugA: 'lithium', drugB: 'ibuprofen', severity: 'major', effect: 'NSAIDs reduce renal lithium clearance, causing lithium toxicity with tremor, ataxia, and seizures.', recommendation: 'Avoid NSAIDs; use paracetamol. Monitor lithium levels 3-5 days after any NSAID start.' },
  { drugA: 'lithium', drugB: 'lisinopril', severity: 'major', effect: 'ACE inhibitors reduce lithium clearance and can precipitate life-threatening lithium toxicity.', recommendation: 'Monitor lithium levels weekly during initiation and after dose changes.' },
  { drugA: 'lithium', drugB: 'hydrochlorothiazide', severity: 'major', effect: 'Thiazide-induced sodium depletion increases renal lithium reabsorption, causing toxicity.', recommendation: 'Reduce lithium dose by 25-50% when a thiazide is started; monitor levels.' },
  { drugA: 'lithium', drugB: 'losartan', severity: 'major', effect: 'ARBs reduce renal lithium excretion, raising serum levels toward the toxic range.', recommendation: 'Monitor lithium levels 1-2 weeks after starting or changing the ARB.' },
  { drugA: 'lithium', drugB: 'metronidazole', severity: 'major', effect: 'Metronidazole reduces lithium clearance, precipitating lithium intoxication.', recommendation: 'Monitor lithium levels during and 3-5 days after metronidazole therapy.' },
  { drugA: 'lithium', drugB: 'celecoxib', severity: 'moderate', effect: 'COX-2 inhibition can raise lithium levels, though less than traditional NSAIDs.', recommendation: 'Monitor lithium levels when celecoxib is added.' },

  // ── Digoxin / P-gp cluster ──────────────────────────────────────────────────
  { drugA: 'digoxin', drugB: 'verapamil', severity: 'major', effect: 'P-gp inhibition plus additive AV-node suppression raises digoxin levels and causes bradyarrhythmia.', recommendation: 'Reduce digoxin dose by 40-50% and monitor levels, heart rate, and ECG.' },
  { drugA: 'digoxin', drugB: 'clarithromycin', severity: 'major', effect: 'Macrolide P-gp inhibition acutely elevates digoxin concentration, causing toxicity.', recommendation: 'Halve digoxin dose when starting clarithromycin; monitor levels within a week.' },
  { drugA: 'digoxin', drugB: 'azithromycin', severity: 'major', effect: 'Azithromycin can raise digoxin levels via P-gp inhibition, precipitating arrhythmia.', recommendation: 'Monitor digoxin levels; watch for nausea, visual changes, and bradycardia.' },
  { drugA: 'dronedarone', drugB: 'digoxin', severity: 'major', effect: 'Dronedarone increases digoxin levels several-fold via P-gp inhibition.', recommendation: 'Halve the digoxin dose when starting dronedarone; monitor levels and rhythm.' },
  { drugA: 'metoclopramide', drugB: 'digoxin', severity: 'moderate', effect: 'Metoclopramide increases GI motility and P-gp effects, reducing digoxin absorption.', recommendation: 'Monitor digoxin levels when metoclopramide is started or stopped.' },
  { drugA: 'furosemide', drugB: 'digoxin', severity: 'moderate', effect: 'Loop-diuretic-induced hypokalemia potentiates digoxin toxicity.', recommendation: 'Monitor potassium and digoxin levels; supplement potassium as needed.' },

  // ── Colchicine / CYP3A4 toxicity cluster ────────────────────────────────────
  { drugA: 'clarithromycin', drugB: 'colchicine', severity: 'major', effect: 'CYP3A4/P-gp inhibition can multiply colchicine levels, causing fatal neuromuscular and multiorgan toxicity.', recommendation: 'Contraindicated, especially with renal impairment; use alternative antibiotic.' },
  { drugA: 'erythromycin', drugB: 'colchicine', severity: 'major', effect: 'Macrolide inhibition of colchicine metabolism causes severe, often fatal colchicine toxicity.', recommendation: 'Avoid combination; if unavoidable, use lowest dose with close monitoring.' },
  { drugA: 'fusidic acid', drugB: 'colchicine', severity: 'major', effect: 'Fusidic acid inhibits colchicine clearance, raising the risk of severe toxicity.', recommendation: 'Avoid concurrent use; choose an alternative antimicrobial.' },
  { drugA: 'colchicine', drugB: 'diltiazem', severity: 'moderate', effect: 'CYP3A4/P-gp inhibition raises colchicine levels, increasing toxicity risk.', recommendation: 'Use lowest colchicine dose; monitor for muscle weakness or GI toxicity.' },

  // ── Immunosuppressant / transplant cluster ─────────────────────────────────
  { drugA: 'tacrolimus', drugB: 'erythromycin', severity: 'major', effect: 'CYP3A4 inhibition raises tacrolimus levels, causing nephrotoxicity and neurotoxicity.', recommendation: 'Monitor tacrolimus trough levels daily during macrolide therapy.' },
  { drugA: 'cyclosporine', drugB: 'clarithromycin', severity: 'major', effect: 'Macrolide CYP3A4 inhibition increases cyclosporine exposure, risking acute renal failure.', recommendation: 'Monitor cyclosporine troughs and creatinine at least twice weekly.' },
  { drugA: 'sirolimus', drugB: 'ketoconazole', severity: 'major', effect: 'Strong CYP3A4 inhibition multiplies sirolimus levels, causing toxicity.', recommendation: 'Avoid; if unavoidable, reduce sirolimus by ~80% and monitor troughs.' },
  { drugA: 'voriconazole', drugB: 'sirolimus', severity: 'major', effect: 'Strong CYP3A4 inhibition multiplies sirolimus levels, causing toxicity.', recommendation: 'Avoid; if unavoidable, reduce sirolimus by ~80% and monitor troughs.' },
  { drugA: 'eplerenone', drugB: 'itraconazole', severity: 'major', effect: 'Strong CYP3A4 inhibition raises eplerenone levels, causing severe hyperkalemia.', recommendation: 'Contraindicated; do not combine with strong CYP3A4 inhibitors.' },
  { drugA: 'imatinib', drugB: 'ketoconazole', severity: 'major', effect: 'CYP3A4 inhibition increases imatinib plasma levels, causing edema, cytopenia, and hepatotoxicity.', recommendation: 'Avoid co-administration; monitor for imatinib toxicity if required.' },

  // ── Hypokalemia / QT cluster ────────────────────────────────────────────────
  { drugA: 'sotalol', drugB: 'hydrochlorothiazide', severity: 'major', effect: 'Thiazide-induced hypokalemia and hypomagnesemia potentiate sotalol QT effect.', recommendation: 'Correct electrolytes proactively and monitor ECG.' },
  { drugA: 'haloperidol', drugB: 'methadone', severity: 'major', effect: 'Both prolong QT; combined use markedly raises torsades de pointes risk.', recommendation: 'Monitor ECG and electrolytes; reduce doses or use less QT-prolonging agent.' },
  { drugA: 'ondansetron', drugB: 'promethazine', severity: 'major', effect: 'Additive QT prolongation from two antiemetic agents.', recommendation: 'Avoid combining two QT-prolonging antiemetics; monitor ECG if unavoidable.' },
  { drugA: 'azithromycin', drugB: 'amiodarone', severity: 'major', effect: 'Additive QT prolongation from macrolide plus class III antiarrhythmic.', recommendation: 'Prefer a non-QT antibiotic; monitor ECG if combination required.' },
  { drugA: 'domperidone', drugB: 'erythromycin', severity: 'major', effect: 'CYP3A4 inhibition plus additive QT effects raise the risk of torsades de pointes.', recommendation: 'Avoid combination; use an alternative prokinetic or antibiotic.' },
  { drugA: 'pimozide', drugB: 'fluconazole', severity: 'major', effect: 'Azole inhibition raises pimozide levels, causing severe QT prolongation and torsades.', recommendation: 'Contraindicated; use a non-interacting antifungal or antipsychotic.' },
  { drugA: 'flecainide', drugB: 'amiodarone', severity: 'major', effect: 'Amiodarone raises flecainide levels, risking proarrhythmia and QRS widening.', recommendation: 'Reduce flecainide dose by 30-50%; monitor ECG for QRS prolongation.' },
  { drugA: 'verapamil', drugB: 'metoprolol', severity: 'major', effect: 'Combined AV-node suppression causes severe bradycardia, hypotension, and heart block.', recommendation: 'Use lower doses with ECG monitoring; avoid in conduction disease.' },
  { drugA: 'diltiazem', drugB: 'metoprolol', severity: 'major', effect: 'Additive negative chronotropy and inotropy can precipitate symptomatic bradycardia.', recommendation: 'Monitor ECG and blood pressure; reduce doses of both agents.' },
  { drugA: 'ivabradine', drugB: 'verapamil', severity: 'major', effect: 'Additive sinus-node suppression causes severe bradycardia and heart block.', recommendation: 'Contraindicated; do not combine with non-dihydropyridine CCBs.' },

  // ── Respiratory depression / opioid cluster ─────────────────────────────────
  { drugA: 'alprazolam', drugB: 'oxycodone', severity: 'major', effect: 'Benzodiazepine plus opioid causes synergistic respiratory depression, coma, and death.', recommendation: 'Avoid unless no alternative; lowest doses, monitor respirations, co-prescribe naloxone.' },
  { drugA: 'zolpidem', drugB: 'oxycodone', severity: 'major', effect: 'Z-drug plus opioid markedly increases respiratory depression and overdose risk.', recommendation: 'Avoid; if unavoidable, reduce both doses and monitor respiratory rate.' },
  { drugA: 'phenobarbital', drugB: 'methadone', severity: 'major', effect: 'Barbiturate induction lowers methadone levels, precipitating withdrawal and relapse.', recommendation: 'Monitor for withdrawal and titrate methadone dose; avoid abrupt changes.' },
  { drugA: 'rifampin', drugB: 'methadone', severity: 'major', effect: 'Potent enzyme induction reduces methadone levels, causing withdrawal.', recommendation: 'Expect a large dose increase; monitor for withdrawal and re-taper after rifampin stops.' },
  { drugA: 'midazolam', drugB: 'ketoconazole', severity: 'major', effect: 'Azole inhibition of CYP3A4 causes prolonged sedation and respiratory depression.', recommendation: 'Avoid oral midazolam with azoles; monitor sedation and respiratory rate.' },
  { drugA: 'triazolam', drugB: 'ritonavir', severity: 'major', effect: 'Ritonavir can increase triazolam exposure many-fold, causing profound CNS depression.', recommendation: 'Contraindicated; use a non-benzodiazepine alternative.' },
  { drugA: 'buspirone', drugB: 'itraconazole', severity: 'major', effect: 'CYP3A4 inhibition raises buspirone levels, causing dizziness and sedation.', recommendation: 'Limit buspirone to 10 mg total daily dose and monitor for toxicity.' },

  // ── Enzyme induction / contraceptive cluster ────────────────────────────────
  { drugA: 'rifampin', drugB: 'oral contraceptives', severity: 'major', effect: 'Enzyme induction accelerates estrogen/progestogen metabolism, causing contraceptive failure.', recommendation: 'Use a non-hormonal or high-dose method during and 4 weeks after rifampin.' },
  { drugA: 'carbamazepine', drugB: 'oral contraceptives', severity: 'major', effect: 'CYP3A4 induction reduces contraceptive steroid levels, risking unintended pregnancy.', recommendation: 'Use a higher-dose or non-hormonal contraceptive; counsel on breakthrough bleeding.' },
  { drugA: 'carbamazepine', drugB: 'erythromycin', severity: 'major', effect: 'Macrolide inhibition raises carbamazepine levels, producing ataxia, diplopia, and toxicity.', recommendation: 'Monitor carbamazepine levels; consider azithromycin.' },
  { drugA: 'carbamazepine', drugB: 'clarithromycin', severity: 'major', effect: 'Potent CYP3A4 inhibition can double carbamazepine exposure, causing severe toxicity.', recommendation: 'Reduce carbamazepine dose and monitor levels and toxicity signs.' },
  { drugA: 'valproic acid', drugB: 'lamotrigine', severity: 'major', effect: 'Valproate doubles lamotrigine exposure, raising the risk of serious rash including SJS/TEN.', recommendation: 'Halve the lamotrigine starting dose and titrate slowly when valproate is present.' },
  { drugA: 'phenytoin', drugB: 'levothyroxine', severity: 'major', effect: 'Phenytoin accelerates T4/T3 metabolism and displacement, increasing levothyroxine requirement.', recommendation: 'Monitor TSH 6-8 weeks after starting phenytoin; adjust levothyroxine dose.' },
  { drugA: 'phenytoin', drugB: 'fluoxetine', severity: 'major', effect: 'CYP2C9/2D6 inhibition can raise phenytoin to toxic levels.', recommendation: 'Monitor phenytoin levels closely and reduce dose if toxicity signs appear.' },

  // ── Hyperkalemia cluster ────────────────────────────────────────────────────
  { drugA: 'spironolactone', drugB: 'potassium chloride', severity: 'moderate', effect: 'Potassium supplementation with a potassium-sparing diuretic risks severe hyperkalemia.', recommendation: 'Avoid routine K+ supplements; monitor serum potassium regularly.' },
  { drugA: 'lisinopril', drugB: 'potassium chloride', severity: 'moderate', effect: 'ACE inhibition plus potassium load can cause life-threatening hyperkalemia.', recommendation: 'Avoid supplementation unless documented deficiency; monitor potassium.' },
  { drugA: 'losartan', drugB: 'potassium chloride', severity: 'moderate', effect: 'ARB plus potassium supplementation raises hyperkalemia and arrhythmia risk.', recommendation: 'Monitor serum potassium; avoid routine supplements.' },
  { drugA: 'trimethoprim', drugB: 'spironolactone', severity: 'moderate', effect: 'Trimethoprim potassium-sparing effect plus spironolactone causes hyperkalemia.', recommendation: 'Monitor potassium closely during TMP-SMX in patients on spironolactone.' },
  { drugA: 'trimethoprim', drugB: 'lisinopril', severity: 'moderate', effect: 'TMP-SMX plus ACE inhibition raises the risk of significant hyperkalemia.', recommendation: 'Check potassium at baseline and 3-5 days after starting TMP-SMX.' },
  { drugA: 'amiloride', drugB: 'lisinopril', severity: 'moderate', effect: 'Dual potassium retention markedly increases hyperkalemia risk.', recommendation: 'Avoid combination or monitor potassium very closely.' },
  { drugA: 'triamterene', drugB: 'lisinopril', severity: 'moderate', effect: 'Potassium-sparing diuretic plus ACE inhibitor can cause dangerous hyperkalemia.', recommendation: 'Monitor serum potassium and creatinine regularly.' },

  // ── Chelation / absorption cluster ──────────────────────────────────────────
  { drugA: 'ciprofloxacin', drugB: 'ferrous sulfate', severity: 'moderate', effect: 'Iron-ciprofloxacin chelation markedly reduces antibiotic absorption and efficacy.', recommendation: 'Give ciprofloxacin 2 hours before or 6 hours after iron supplementation.' },
  { drugA: 'doxycycline', drugB: 'ferrous sulfate', severity: 'moderate', effect: 'Iron chelates tetracyclines, reducing both antibiotic and iron absorption.', recommendation: 'Separate by at least 3 hours; take iron at a different time of day.' },
  { drugA: 'levothyroxine', drugB: 'ferrous sulfate', severity: 'moderate', effect: 'Iron reduces levothyroxine absorption, raising TSH over time.', recommendation: 'Separate by at least 4 hours; recheck TSH after starting iron.' },
  { drugA: 'aluminum hydroxide', drugB: 'mycophenolate', severity: 'moderate', effect: 'Antacids reduce mycophenolate mofetil absorption by up to a third.', recommendation: 'Separate doses by at least 2 hours and monitor for rejection risk.' },
  { drugA: 'sucralfate', drugB: 'phenytoin', severity: 'moderate', effect: 'Sucralfate binds phenytoin in the gut, reducing absorption and serum levels.', recommendation: 'Administer sucralfate 2 hours before or 6 hours after phenytoin.' },
  { drugA: 'aluminum hydroxide', drugB: 'raltegravir', severity: 'moderate', effect: 'Polyvalent cations chelate raltegravir, lowering antiviral exposure.', recommendation: 'Separate by at least 2 hours before or 6 hours after raltegravir.' },
  { drugA: 'tetracycline', drugB: 'calcium carbonate', severity: 'moderate', effect: 'Calcium-tetracycline chelation impairs absorption of both agents.', recommendation: 'Space administration by 2-3 hours; prefer doxycycline if calcium is required.' },
  { drugA: 'cimetidine', drugB: 'warfarin', severity: 'moderate', effect: 'Cimetidine inhibits warfarin metabolism, modestly raising INR and bleeding risk.', recommendation: 'Monitor INR when starting/stopping cimetidine; consider famotidine instead.' },
  { drugA: 'cimetidine', drugB: 'theophylline', severity: 'moderate', effect: 'Cimetidine reduces theophylline clearance, risking toxicity.', recommendation: 'Monitor theophylline levels or switch to famotidine.' },
  { drugA: 'metformin', drugB: 'cimetidine', severity: 'moderate', effect: 'Cimetidine inhibits metformin renal tubular secretion, raising metformin levels.', recommendation: 'Monitor for GI intolerance; consider an H2 blocker with less interaction.' },
  { drugA: 'omeprazole', drugB: 'phenytoin', severity: 'moderate', effect: 'Prolonged PPI therapy can raise phenytoin levels via CYP2C19 inhibition.', recommendation: 'Monitor phenytoin levels during prolonged PPI use.' },

  // ── Metronidazole-alcohol + misc high-value ─────────────────────────────────
  { drugA: 'metronidazole', drugB: 'ethanol', severity: 'major', effect: 'Disulfiram-like reaction with flushing, vomiting, tachycardia, and hypotension.', recommendation: 'Counsel complete alcohol abstinence during and 48-72 hours after therapy.' },
  { drugA: 'allopurinol', drugB: 'azathioprine', severity: 'major', effect: 'Xanthine oxidase inhibition blocks azathioprine clearance, causing severe myelosuppression.', recommendation: 'Contraindicated. Reduce azathioprine to 25% if combination is unavoidable.' },
  { drugA: 'allopurinol', drugB: 'mercaptopurine', severity: 'major', effect: 'Xanthine oxidase inhibition massively increases 6-MP exposure, causing fatal pancytopenia.', recommendation: 'Contraindicated; reduce 6-MP dose to 25% or use alternative urate-lowering drug.' },
  { drugA: 'ergotamine', drugB: 'erythromycin', severity: 'major', effect: 'Macrolide inhibition of ergotamine metabolism causes severe vasospasm and ischemia.', recommendation: 'Contraindicated; use a non-interacting antibiotic.' },
  { drugA: 'dihydroergotamine', drugB: 'clarithromycin', severity: 'major', effect: 'Strong CYP3A4 inhibition produces ergotism with ischemic limb and CNS complications.', recommendation: 'Contraindicated within 72 hours of clarithromycin or any strong 3A4 inhibitor.' },
  { drugA: 'aminoglycoside', drugB: 'vancomycin', severity: 'major', effect: 'Combined nephrotoxicity and ototoxicity risk is substantially higher than either agent alone.', recommendation: 'Monitor renal function and drug levels closely; avoid prolonged overlap.' },
  { drugA: 'gentamicin', drugB: 'furosemide', severity: 'major', effect: 'Loop diuretics add ototoxicity and can worsen aminoglycoside-induced hearing loss.', recommendation: 'Monitor audiometry and renal function; consider an alternative diuretic.' },
  { drugA: 'prednisone', drugB: 'rifampin', severity: 'major', effect: 'Enzyme induction accelerates steroid metabolism, risking adrenal crisis on stress.', recommendation: 'Increase steroid dose empirically and counsel on sick-day rules.' },
  { drugA: 'valproic acid', drugB: 'carbamazepine', severity: 'moderate', effect: 'Bidirectional CYP interactions raise carbamazepine-epoxide levels and alter valproate metabolism.', recommendation: 'Monitor levels of both drugs; watch for ataxia or sedation.' },
  { drugA: 'metoclopramide', drugB: 'levodopa', severity: 'moderate', effect: 'Metoclopramide blocks central dopamine receptors, worsening parkinsonian symptoms.', recommendation: 'Avoid metoclopramide in Parkinson disease; use an alternative prokinetic.' },
  { drugA: 'tamoxifen', drugB: 'paroxetine', severity: 'moderate', effect: 'CYP2D6 inhibition reduces conversion of tamoxifen to its active metabolite endoxifen.', recommendation: 'Prefer SSRIs with weak CYP2D6 effects such as citalopram or escitalopram.' },
  { drugA: 'tamoxifen', drugB: 'bupropion', severity: 'moderate', effect: 'CYP2D6 inhibition lowers endoxifen formation, reducing tamoxifen efficacy.', recommendation: 'Choose an alternative antidepressant with less CYP2D6 inhibition.' },
];

const existing = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const seen = new Set(existing.map((e) => [e.drugA, e.drugB].map((d) => d.toLowerCase().trim()).sort().join('::')));
let added = 0;
let skipped = 0;
for (const pair of EXTRA) {
  const key = [pair.drugA, pair.drugB].map((d) => d.toLowerCase().trim()).sort().join('::');
  if (seen.has(key)) { skipped += 1; continue; }
  seen.add(key);
  existing.push(pair);
  added += 1;
}
fs.writeFileSync(FILE, `${JSON.stringify(existing, null, 2)}\n`);
console.log(`interactions.json: ${existing.length} total (+${added} added, ${skipped} duplicate skipped)`);
