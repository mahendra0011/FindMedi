/**
 * Depth-completion leaves — mirrors subcatogary.md §6/§7/§10/§12/§14/§15/§16/§18/§19/§20
 * leaf lists under parents that already exist in categoryTree.mjs.
 * (§26 reference lists stay as model enums — deliberately NOT categories.)
 */

export const DEPTH_CATEGORY_NODES = Object.freeze([
  // ─── §6 Emergency — emergency types ─────────────────────────────────────────
  { code: 'EMG.TYPE', name: 'Emergency Types', nameHi: 'आपातकाल के प्रकार', aliases: ['Emergency Situations'], parent: null, type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.CARDIAC', name: 'Cardiac Emergency (Chest Pain / Arrest)', nameHi: 'हृदय आपातकाल', aliases: ['Heart Attack Emergency', 'CPR Needed'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.STROKE', name: 'Stroke (FAST Response)', nameHi: 'स्ट्रोक', aliases: ['Brain Attack', 'Paralysis Emergency'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.TRAUMA', name: 'Accident & Trauma', nameHi: 'दुर्घटना एवं ट्रॉमा', aliases: ['Road Accident', 'Head Injury'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.BURNS', name: 'Burns Emergency', nameHi: 'जलन / आग से चोट', aliases: ['Fire Injury', 'Scald'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.POISONING', name: 'Poisoning', nameHi: 'ज़हर / विषाक्तता', aliases: ['Overdose Emergency', 'Toxic Ingestion'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.OBSTETRIC', name: 'Obstetric Emergency', nameHi: 'प्रसूति आपातकाल', aliases: ['Delivery Emergency', 'Pregnancy Emergency'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.PAEDIATRIC', name: 'Paediatric Emergency', nameHi: 'बाल आपातकाल', aliases: ['Child Emergency', 'Infant Emergency'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.PSYCHIATRIC', name: 'Psychiatric Emergency', nameHi: 'मानसिक आपातकाल', aliases: ['Crisis Helpline', 'Self-harm Risk'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', isSensitive: true, kind: 'Service' },
  { code: 'EMG.TYPE.SNAKE_BITE', name: 'Snake Bite', nameHi: 'साँप का काटना', aliases: ['Anti-venom Needed', 'Animal Bite'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.DROWNING', name: 'Drowning', nameHi: 'डूबना', aliases: ['Water Rescue'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.ANAPHYLAXIS', name: 'Severe Allergy (Anaphylaxis)', nameHi: 'गंभीर एलर्जी', aliases: ['Anaphylactic Shock'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.RESPIRATORY', name: 'Breathing Emergency', nameHi: 'सांस आपातकाल', aliases: ['Asthma Attack', 'Choking'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.DIABETIC', name: 'Diabetic Emergency', nameHi: 'मधुमेह आपातकाल', aliases: ['Hypo / Hyperglycemia', 'Sugar Emergency'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },
  { code: 'EMG.TYPE.SEIZURE', name: 'Seizure / Epilepsy Attack', nameHi: 'दौरे', aliases: ['Fits Emergency', 'Convulsion'], parent: 'EMG.TYPE', type: 'emergency_type', tier: 'T1', kind: 'Service' },

  // ─── §6 Ambulance types ─────────────────────────────────────────────────────
  { code: 'EMG.SERVICE.AMBULANCE.BLS', name: 'BLS Ambulance', nameHi: 'बीएलएस एम्बुलेंस', aliases: ['Basic Life Support', 'Oxygen Ambulance'], parent: 'EMG.SERVICE.AMBULANCE', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'EMG.SERVICE.AMBULANCE.ALS', name: 'ALS Ambulance', nameHi: 'एएलएस एम्बुलेंस', aliases: ['Advanced Life Support', 'Ventilator Ambulance'], parent: 'EMG.SERVICE.AMBULANCE', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'EMG.SERVICE.AMBULANCE.NICU', name: 'NICU Ambulance', nameHi: 'एनआईसीयू एम्बुलेंस', aliases: ['Neonatal Transport', 'Baby Ambulance'], parent: 'EMG.SERVICE.AMBULANCE', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'EMG.SERVICE.AMBULANCE.CARDIAC', name: 'Cardiac Ambulance', nameHi: 'कार्डियक एम्बुलेंस', aliases: ['Defibrillator Ambulance', 'CCU Ambulance'], parent: 'EMG.SERVICE.AMBULANCE', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'EMG.SERVICE.AMBULANCE.MORTUARY', name: 'Mortuary Van', nameHi: 'मोर्चरी वैन', aliases: ['Hearse Van', 'Dead Body Transport'], parent: 'EMG.SERVICE.AMBULANCE', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'EMG.SERVICE.AMBULANCE.BIKE', name: 'Bike Responder', nameHi: 'बाइक रेस्पॉन्डर', aliases: ['First Responder Bike', 'Traffic Bypass Responder'], parent: 'EMG.SERVICE.AMBULANCE', type: 'service', tier: 'T1', kind: 'Service' },

  // ─── §6 Blood bank components ───────────────────────────────────────────────
  { code: 'EMG.FAC.BLOOD_BANK.WHOLE_BLOOD', name: 'Whole Blood', nameHi: 'सम्पूर्ण रक्त', aliases: ['Blood Unit'], parent: 'EMG.FAC.BLOOD_BANK', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'EMG.FAC.BLOOD_BANK.PRBC', name: 'Packed Red Blood Cells', nameHi: 'पैक्ड रेड ब्लड सेल्स', aliases: ['PRBC', 'RBC Component'], parent: 'EMG.FAC.BLOOD_BANK', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'EMG.FAC.BLOOD_BANK.PLATELETS', name: 'Platelets (RDP / SDP)', nameHi: 'प्लेटलेट्स', aliases: ['RDP', 'Single Donor Platelets', 'Dengue Platelets'], parent: 'EMG.FAC.BLOOD_BANK', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'EMG.FAC.BLOOD_BANK.FFP', name: 'Fresh Frozen Plasma', nameHi: 'फ्रेश फ्रोज़न प्लाज़्मा', aliases: ['FFP', 'Plasma Component'], parent: 'EMG.FAC.BLOOD_BANK', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'EMG.FAC.BLOOD_BANK.CRYO', name: 'Cryoprecipitate', nameHi: 'क्रायोप्रेसिपिटेट', aliases: ['Cryo', 'Clotting Factor'], parent: 'EMG.FAC.BLOOD_BANK', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'EMG.FAC.BLOOD_BANK.RARE_GROUP', name: 'Rare Blood Group Registry', nameHi: 'दुर्लभ रक्त समूह रजिस्टर', aliases: ['Bombay Blood Group', 'Rare Donor Network'], parent: 'EMG.FAC.BLOOD_BANK', type: 'service', tier: 'T1', kind: 'Service' },

  // ─── §6 Helplines ───────────────────────────────────────────────────────────
  { code: 'EMG.INFO.HELPLINES.NATIONAL_112', name: 'National Emergency 112', nameHi: 'राष्ट्रीय आपातकाल 112', aliases: ['ERSS 112', 'All-in-one Emergency'], parent: 'EMG.INFO.HELPLINES', type: 'info', tier: 'T1', kind: 'Info' },
  { code: 'EMG.INFO.HELPLINES.AMBULANCE_108', name: 'Ambulance 108 / 102', nameHi: 'एम्बुलेंस 108 / 102', aliases: ['Govt Ambulance Service', 'Janani Express'], parent: 'EMG.INFO.HELPLINES', type: 'info', tier: 'T1', kind: 'Info' },
  { code: 'EMG.INFO.HELPLINES.MEDICAL_ADVICE', name: 'Medical Advice Helpline (104)', nameHi: 'चिकित्सा सलाह 104', aliases: ['Health Helpline 104'], parent: 'EMG.INFO.HELPLINES', type: 'info', tier: 'T1', kind: 'Info' },
  { code: 'EMG.INFO.HELPLINES.TELEMANAS', name: 'Tele-MANAS 14416', nameHi: 'टेली-मनस 14416', aliases: ['Mental Health Helpline', 'Crisis Counselling Line'], parent: 'EMG.INFO.HELPLINES', type: 'info', tier: 'T1', isSensitive: true, kind: 'Info' },
  { code: 'EMG.INFO.HELPLINES.WOMEN_181', name: 'Women Helpline 181', nameHi: 'महिला हेल्पलाइन 181', aliases: ['Abuse Support Line', 'Sakshi Helpline'], parent: 'EMG.INFO.HELPLINES', type: 'info', tier: 'T1', isSensitive: true, kind: 'Info' },
  { code: 'EMG.INFO.HELPLINES.CHILDLINE_1098', name: 'Childline 1098', nameHi: 'चाइल्डलाइन 1098', aliases: ['Child Help Line', 'CHILDLINE India'], parent: 'EMG.INFO.HELPLINES', type: 'info', tier: 'T1', kind: 'Info' },
  { code: 'EMG.INFO.HELPLINES.POISON_INFO', name: 'Poison Information Centre', nameHi: 'पॉइज़न सूचना केंद्र', aliases: ['AIIMS Poison Centre', 'Toxicology Helpline'], parent: 'EMG.INFO.HELPLINES', type: 'info', tier: 'T1', kind: 'Info' },
  { code: 'EMG.INFO.HELPLINES.ANTIVENOM', name: 'Anti-venom & Anti-rabies Stock', nameHi: 'एंटी-वेनम / एंटी-रेबीज उपलब्धता', aliases: ['ARV Availability', 'Snake Anti-venom Stock'], parent: 'EMG.INFO.HELPLINES', type: 'info', tier: 'T1', kind: 'Info' },

  // ─── §6 Oxygen products ─────────────────────────────────────────────────────
  { code: 'EMG.PROD.OXYGEN.CYLINDER', name: 'Oxygen Cylinder', nameHi: 'ऑक्सीजन सिलेंडर', aliases: ['B / D Type Cylinder', 'O2 Cylinder'], parent: 'EMG.PROD.OXYGEN', type: 'product_line', tier: 'T1', kind: 'Product' },
  { code: 'EMG.PROD.OXYGEN.CONCENTRATOR', name: 'Oxygen Concentrator', nameHi: 'ऑक्सीजन कंसंट्रेटर', aliases: ['5L / 10L Concentrator', 'Home Oxygen Machine'], parent: 'EMG.PROD.OXYGEN', type: 'product_line', tier: 'T1', kind: 'Product' },
  { code: 'EMG.PROD.OXYGEN.REFILL', name: 'Oxygen Refill Service', nameHi: 'ऑक्सीजन रिफिल सेवा', aliases: ['Cylinder Refill', 'O2 Refill Point'], parent: 'EMG.PROD.OXYGEN', type: 'service', tier: 'T1', kind: 'Service' },

  // ─── §7 AYUSH therapies ─────────────────────────────────────────────────────
  { code: 'AYUSH.THERAPY', name: 'AYUSH Therapies', nameHi: 'आयुष चिकित्सा पद्धतियाँ', aliases: ['Traditional Therapies'], parent: null, type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.VAMANA', name: 'Vamana (Therapeutic Emesis)', nameHi: 'वमन', aliases: ['Panchakarma Vamana', 'Detox Emesis'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.VIRECHANA', name: 'Virechana (Purgation)', nameHi: 'विरेचन', aliases: ['Panchakarma Virechana'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.BASTI', name: 'Basti (Medicated Enema)', nameHi: 'बस्ती', aliases: ['Panchakarma Basti', 'Enema Therapy'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.NASYA', name: 'Nasya (Nasal Therapy)', nameHi: 'नस्य', aliases: ['Panchakarma Nasya'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.RAKTAMOKSHANA', name: 'Raktamokshana (Bloodletting)', nameHi: 'रक्तमोक्षण', aliases: ['Panchakarma Raktamokshana', 'Leech Detox'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.ABHYANGA', name: 'Abhyanga (Oil Massage)', nameHi: 'अभ्यंग', aliases: ['Ayurvedic Massage', 'Full Body Oil Therapy'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.SHIRODHARA', name: 'Shirodhara', nameHi: 'शिरोधारा', aliases: ['Oil Pour Therapy', 'Stress Relief Therapy'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.KIZHI', name: 'Kizhi / Pinda Sweda', nameHi: 'किझी', aliases: ['Herbal Poultice Therapy', 'Elakizhi', 'Njavarakizhi'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.HIJAMA', name: 'Hijama (Wet Cupping)', nameHi: 'हिजामा', aliases: ['Cupping Therapy', 'Unani Cupping'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.LEECH', name: 'Leech Therapy', nameHi: 'जोंक चिकित्सा', aliases: ['Jalauka Avacharana'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.AGNI_KARMA', name: 'Agni Karma (Heat Cautery)', nameHi: 'अग्नि कर्म', aliases: ['Ayurveda Cautery'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.VARMAM', name: 'Varmam Therapy', nameHi: 'वर्मम चिकित्सा', aliases: ['Siddha Vital Points Therapy'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.YOGA_SESSION', name: 'Yoga Therapy Session', nameHi: 'योग चिकित्सा सत्र', aliases: ['Therapeutic Yoga Class'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.NATURO_HYDRO', name: 'Hydrotherapy', nameHi: 'हाइड्रोथेरेपी', aliases: ['Water Therapy', 'Naturopathy Bath'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.NATURO_MUD', name: 'Mud Therapy', nameHi: 'मिट्टी चिकित्सा', aliases: ['Mud Pack', 'Naturopathy Mud Bath'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.NATURO_FASTING', name: 'Fasting Therapy', nameHi: 'उपवास चिकित्सा', aliases: ['Naturopathy Fasting', 'Detox Fast'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'AYUSH.THERAPY.ACUPUNCTURE_SESSION', name: 'Acupuncture Session', nameHi: 'एक्यूपंक्चर सत्र', aliases: ['Needle Therapy', 'Dry Needling'], parent: 'AYUSH.THERAPY', type: 'service', tier: 'T2', kind: 'Service' },

  // ─── §10 Nutrition — diet philosophies ──────────────────────────────────────
  { code: 'NUT.DIET', name: 'Diet Types', nameHi: 'आहार प्रकार', aliases: ['Diet Philosophy', 'Meal Preference'], parent: null, type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.VEGETARIAN', name: 'Vegetarian', nameHi: 'शाकाहारी', aliases: ['Veg Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.VEGAN', name: 'Vegan', nameHi: 'वीगन', aliases: ['Plant-based Diet', 'No Dairy'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.JAIN', name: 'Jain Diet', nameHi: 'जैन आहार', aliases: ['Jain Food', 'No Root Vegetables'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.EGGETARIAN', name: 'Eggetarian', nameHi: 'अंडाहारी', aliases: ['Eggetarian Diet', 'Veg + Egg'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.NONVEG', name: 'Non-vegetarian', nameHi: 'मांसाहारी', aliases: ['Non-veg Diet', 'Meat Included'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.KETO', name: 'Keto', nameHi: 'कीटो', aliases: ['Ketogenic Diet', 'Low Carb High Fat'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.LOW_CARB', name: 'Low Carb', nameHi: 'कम कार्बोहाइड्रेट', aliases: ['Carb-controlled Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.LOW_FAT', name: 'Low Fat', nameHi: 'कम वसा', aliases: ['Fat-restricted Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.HIGH_PROTEIN', name: 'High Protein', nameHi: 'उच्च प्रोटीन', aliases: ['Protein-rich Diet', 'Muscle Gain Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.MEDITERRANEAN', name: 'Mediterranean', nameHi: 'भूमध्यसागरीय आहार', aliases: ['Med Diet', 'Olive Oil Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.DASH', name: 'DASH Diet', nameHi: 'डैश आहार', aliases: ['BP Control Diet', 'Hypertension Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.DIABETES', name: 'Diabetes-friendly', nameHi: 'मधुमेह अनुकूल', aliases: ['Sugar Control Diet', 'Diabetic Meal'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.CARDIAC', name: 'Cardiac Diet', nameHi: 'हृदय आहार', aliases: ['Heart Healthy Diet', 'Cholesterol Control'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.RENAL', name: 'Renal Diet', nameHi: 'वृक्क आहार', aliases: ['Kidney-friendly Diet', 'Low Potassium'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.LIVER', name: 'Liver-friendly', nameHi: 'यकृत अनुकूल', aliases: ['Fatty Liver Diet', 'Hepatic Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.PCOS', name: 'PCOS Diet', nameHi: 'पीसीओएस आहार', aliases: ['Insulin Resistance Diet', 'Hormonal Balance Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.PREGNANCY', name: 'Pregnancy Diet', nameHi: 'गर्भावस्था आहार', aliases: ['Prenatal Nutrition', 'Maternal Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.LACTATION', name: 'Lactation Diet', nameHi: 'स्तनपान आहार', aliases: ['Nursing Mother Diet', 'Postpartum Nutrition'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.ELDER_SOFT', name: 'Elder Soft Diet', nameHi: 'वृद्धा मृदु आहार', aliases: ['Soft Food', 'Easy Chew Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.PAEDIATRIC', name: 'Paediatric Nutrition', nameHi: 'बाल पोषण', aliases: ['Child Diet Plan', 'Growing Child Meals'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.GLUTEN_FREE', name: 'Gluten-free', nameHi: 'ग्लूटेन मुक्त', aliases: ['Celiac Diet', 'No Wheat'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.LACTOSE_FREE', name: 'Lactose-free', nameHi: 'लैक्टोज मुक्त', aliases: ['Dairy-free Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.GOUT', name: 'Gout-friendly', nameHi: 'गाउट अनुकूल', aliases: ['Low Purine Diet', 'Uric Acid Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },

  // ─── §10 Meal preferences ───────────────────────────────────────────────────
  { code: 'NUT.PREF', name: 'Meal Preferences', nameHi: 'भोजन वरीयताएँ', aliases: ['Food Preference'], parent: null, type: 'info', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.PREF.HOME_COOKED', name: 'Home-cooked Style', nameHi: 'घर का खाना', aliases: ['Ghar Jaisa Khana', 'Home Style Meals'], parent: 'NUT.PREF', type: 'info', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.PREF.TIFFIN', name: 'Tiffin Subscription', nameHi: 'टिफिन सब्सक्रिप्शन', aliases: ['Dabba Service', 'Daily Tiffin'], parent: 'NUT.PREF', type: 'info', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.PREF.ORGANIC', name: 'Organic', nameHi: 'जैविक', aliases: ['Organic Food', 'Chemical-free Produce'], parent: 'NUT.PREF', type: 'info', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.PREF.MILLET', name: 'Millet-based', nameHi: 'बाजरा आधारित', aliases: ['Shree Anna', 'Millet Meals'], parent: 'NUT.PREF', type: 'info', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.PREF.NO_ONION_GARLIC', name: 'No Onion / Garlic', nameHi: 'बिना प्याज़-लहसुन', aliases: ['Satvik Kitchen', 'Vrat Food'], parent: 'NUT.PREF', type: 'info', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.PREF.SATTVIC', name: 'Sattvic', nameHi: 'सात्विक', aliases: ['Sattvic Diet', 'Yoga Food'], parent: 'NUT.PREF', type: 'info', tier: 'T2', kind: 'Filter' },

  // ─── §10 Meal slots ─────────────────────────────────────────────────────────
  { code: 'NUT.MEAL', name: 'Meal Slots', nameHi: 'भोजन समय', aliases: ['Meal Timing'], parent: null, type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.BREAKFAST', name: 'Healthy Breakfast', nameHi: 'स्वस्थ नाश्ता', aliases: ['Morning Meal', 'Breakfast Delivery'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.LUNCH', name: 'Healthy Lunch', nameHi: 'स्वस्थ दोपहर भोजन', aliases: ['Lunch Box', 'Office Lunch'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.DINNER', name: 'Healthy Dinner', nameHi: 'स्वस्थ रात्रि भोजन', aliases: ['Dinner Delivery', 'Light Dinner'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.SNACKS', name: 'Healthy Snacks', nameHi: 'स्वस्थ स्नैक्स', aliases: ['Guilt-free Snacking', 'Roasted Snacks'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.BEVERAGES', name: 'Healthy Beverages', nameHi: 'स्वस्थ पेय', aliases: ['Herbal Drinks', 'Fresh Juices', 'Smoothies'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.SALADS', name: 'Soups & Salads', nameHi: 'सूप एवं सलाद', aliases: ['Salad Bowls', 'Detox Soups'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.SUGAR_FREE', name: 'Sugar-free Desserts', nameHi: 'शुगर-फ्री मिठाई', aliases: ['Diabetic Sweets', 'No Sugar Desserts'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },
  { code: 'NUT.MEAL.KIDS', name: 'Kids Meals', nameHi: 'बच्चों के भोजन', aliases: ['Child Tiffin', 'School Lunch Box'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },

  // ─── §10 Dietitian focus areas ──────────────────────────────────────────────
  { code: 'NUT.PRO.FOCUS', name: 'Nutrition Focus Areas', nameHi: 'पोषण विशेषज्ञता', aliases: ['Dietitian Specialisations'], parent: null, type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.WEIGHT', name: 'Weight Management', nameHi: 'वज़न प्रबंधन', aliases: ['Weight Loss Diet', 'Weight Gain Plan'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', adClaimsRestricted: true, kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.DIABETES', name: 'Diabetes Nutrition', nameHi: 'मधुमेह पोषण', aliases: ['Diabetic Diet Plan'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.CARDIAC', name: 'Cardiac Nutrition', nameHi: 'हृदय पोषण', aliases: ['Cholesterol Diet', 'Post-angioplasty Diet'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.RENAL', name: 'Renal Nutrition', nameHi: 'वृक्क पोषण', aliases: ['Dialysis Diet', 'Kidney Diet Plan'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.PREGNANCY', name: 'Pregnancy & Lactation Nutrition', nameHi: 'गर्भावस्था एवं स्तनपान पोषण', aliases: ['Prenatal Dietitian'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.PAED', name: 'Paediatric Nutrition', nameHi: 'बाल पोषण विशेषज्ञ', aliases: ['Child Growth Diet', 'Picky Eater Help'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.SPORTS', name: 'Sports Nutrition', nameHi: 'खेल पोषण', aliases: ['Athlete Diet', 'Performance Nutrition'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.ELDER', name: 'Geriatric Nutrition', nameHi: 'वृद्धा पोषण', aliases: ['Senior Diet Plan', 'Malnutrition Care'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.POST_SURGERY', name: 'Post-surgery Recovery Diet', nameHi: 'शल्यक्रिया पश्चात आहार', aliases: ['Healing Diet', 'Post-op Nutrition'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.THYROID_PCOS', name: 'Thyroid & PCOS Nutrition', nameHi: 'थायरॉइड एवं पीसीओएस पोषण', aliases: ['Hormonal Diet Plan'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },

  // ─── §10 Health-food store aisles ───────────────────────────────────────────
  { code: 'NUT.PROD.STORE', name: 'Health Food Store', nameHi: 'हेल्थ फूड स्टोर', aliases: ['Organic Grocery', 'Health Grocery'], parent: null, type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.PROD.STORE.MILLETS', name: 'Millets & Ancient Grains', nameHi: 'मिलेट्स / श्री अन्न', aliases: ['Shree Anna', 'Ragi Jowar Bajra'], parent: 'NUT.PROD.STORE', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.PROD.STORE.OILS', name: 'Cold-pressed Oils & Ghee', nameHi: 'कोल्ड-प्रेस्ड तेल एवं घी', aliases: ['Wood-pressed Oil', 'Desi Ghee'], parent: 'NUT.PROD.STORE', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.PROD.STORE.GRAINS', name: 'Organic Grains & Flours', nameHi: 'जैविक अनाज एवं आटा', aliases: ['Organic Atta', 'Whole Grains'], parent: 'NUT.PROD.STORE', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.PROD.STORE.SWEETENERS', name: 'Natural Sweeteners', nameHi: 'प्राकृतिक मधुर', aliases: ['Jaggery', 'Honey', 'Stevia'], parent: 'NUT.PROD.STORE', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.PROD.STORE.HERBAL_TEAS', name: 'Herbal Teas & Kadha', nameHi: 'हर्बल चाय एवं काढ़ा', aliases: ['Green Tea', 'Ayurvedic Kadha Mix'], parent: 'NUT.PROD.STORE', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.PROD.STORE.SUPERFOODS', name: 'Superfoods', nameHi: 'सुपरफूड्स', aliases: ['Seeds Mix', 'Moringa', 'Amla Powder'], parent: 'NUT.PROD.STORE', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },
  { code: 'NUT.PROD.STORE.DRY_FRUITS', name: 'Dry Fruits & Seeds', nameHi: 'सूखे मेवे एवं बीज', aliases: ['Nuts Mix', 'Almonds Walnuts'], parent: 'NUT.PROD.STORE', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.PROD.STORE.SPICES', name: 'Therapeutic Spices', nameHi: 'औषधीय मसाले', aliases: ['Turmeric Haldi', 'Cinnamon Dalchini'], parent: 'NUT.PROD.STORE', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.PROD.STORE.KIDS_FOOD', name: 'Kids Health Food', nameHi: 'बच्चों का हेल्थ फूड', aliases: ['Healthy Child Snacks'], parent: 'NUT.PROD.STORE', type: 'product_line', tier: 'T2', kind: 'Product' },

  // ─── §10 Supplement categories ──────────────────────────────────────────────
  { code: 'NUT.PROD.SUPP.PROTEIN', name: 'Protein Powders', nameHi: 'प्रोटीन पाउडर', aliases: ['Whey', 'Plant Protein'], parent: 'NUT.PROD.SUPPLEMENTS', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },
  { code: 'NUT.PROD.SUPP.VITAMINS', name: 'Multivitamins', nameHi: 'मल्टीविटामिन', aliases: ['Daily Vitamins', 'Multimineral'], parent: 'NUT.PROD.SUPPLEMENTS', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },
  { code: 'NUT.PROD.SUPP.OMEGA', name: 'Omega & Fish Oil', nameHi: 'ओमेगा / फिश ऑयल', aliases: ['Omega 3', 'Fish Oil Capsules'], parent: 'NUT.PROD.SUPPLEMENTS', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },
  { code: 'NUT.PROD.SUPP.PROBIOTIC', name: 'Probiotics', nameHi: 'प्रोबायोटिक्स', aliases: ['Gut Health Supplements'], parent: 'NUT.PROD.SUPPLEMENTS', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },
  { code: 'NUT.PROD.SUPP.JOINT', name: 'Joint & Collagen', nameHi: 'जोड़ / कोलेजन', aliases: ['Collagen Powder', 'Glucosamine'], parent: 'NUT.PROD.SUPPLEMENTS', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },
  { code: 'NUT.PROD.SUPP.IRON_CALCIUM', name: 'Iron & Calcium', nameHi: 'आयरन / कैल्शियम', aliases: ['Anaemia Supplements', 'Bone Health'], parent: 'NUT.PROD.SUPPLEMENTS', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },
  { code: 'NUT.PROD.SUPP.HERBAL', name: 'Herbal Supplements', nameHi: 'हर्बल सप्लीमेंट', aliases: ['Ashwagandha', 'Chyawanprash', 'Ayurvedic Supplements'], parent: 'NUT.PROD.SUPPLEMENTS', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },

  // ─── §10 Nutrition services ─────────────────────────────────────────────────
  { code: 'NUT.SERVICE.MEAL_PLANS', name: 'Custom Meal Plans', nameHi: 'कस्टम मील प्लान', aliases: ['Diet Plan Service', 'Weekly Meal Chart'], parent: 'NUT.SERVICE', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'NUT.SERVICE.VIDEO_CONSULT', name: 'Video Diet Consultation', nameHi: 'वीडियो डाइट परामर्श', aliases: ['Online Dietitian Consult'], parent: 'NUT.SERVICE', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'NUT.SERVICE.CORPORATE_CANTEEN', name: 'Corporate Canteen Audit', nameHi: 'कॉर्पोरेट कैंटीन ऑडिट', aliases: ['Office Menu Planning'], parent: 'NUT.SERVICE', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'NUT.SERVICE.SCHOOL_MEAL_AUDIT', name: 'School Meal Audit', nameHi: 'स्कूल भोजन ऑडिट', aliases: ['Mid-day Meal Review'], parent: 'NUT.SERVICE', type: 'service', tier: 'T2', kind: 'Service' },

  // ─── §12 Fitness — gym styles ───────────────────────────────────────────────
  { code: 'FIT.FAC.GYM.CROSSFIT', name: 'CrossFit Box', nameHi: 'क्रॉसफिट', aliases: ['CrossFit Gym', 'WOD Box'], parent: 'FIT.FAC.GYM', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.GYM.FUNCTIONAL', name: 'Functional Training Studio', nameHi: 'फंक्शनल ट्रेनिंग', aliases: ['Functional Fitness', 'TRX Studio'], parent: 'FIT.FAC.GYM', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.GYM.CALISTHENICS', name: 'Calisthenics Park', nameHi: 'कैलिस्थेनिक्स', aliases: ['Street Workout', 'Bodyweight Training'], parent: 'FIT.FAC.GYM', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.GYM.WOMEN_ONLY', name: 'Women-only Gym', nameHi: 'केवल महिलाओं का जिम', aliases: ['Ladies Gym', 'Female Trainers Only'], parent: 'FIT.FAC.GYM', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.GYM.SENIOR', name: 'Senior Fitness Centre', nameHi: 'वृद्धा फिटनेस केंद्र', aliases: ['Elder Gym', 'Silver Fitness'], parent: 'FIT.FAC.GYM', type: 'facility_type', tier: 'T2', kind: 'Facility' },

  // ─── §12 Yoga styles ────────────────────────────────────────────────────────
  { code: 'FIT.FAC.YOGA.HATHA', name: 'Hatha Yoga', nameHi: 'हठ योग', aliases: ['Classical Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.ASHTANGA', name: 'Ashtanga Yoga', nameHi: 'अष्टांग योग', aliases: ['Ashtanga Vinyasa', 'Mysore Style'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.VINYASA', name: 'Vinyasa Flow', nameHi: 'विन्यास फ्लो', aliases: ['Flow Yoga', 'Power Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.IYENGAR', name: 'Iyengar Yoga', nameHi: 'अयंगार योग', aliases: ['Prop-based Yoga', 'Alignment Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.KUNDALINI', name: 'Kundalini Yoga', nameHi: 'कुंडलिनी योग', aliases: ['Kriya Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.PRENATAL', name: 'Prenatal / Postnatal Yoga', nameHi: 'प्रसवपूर्व / प्रसवोत्तर योग', aliases: ['Garbhasana Yoga', 'Mom & Baby Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.YIN', name: 'Yin & Restorative Yoga', nameHi: 'यिन योग', aliases: ['Restorative Yoga', 'Deep Stretch'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.AERIAL', name: 'Aerial Yoga', nameHi: 'एरियल योग', aliases: ['Hamock Yoga', 'Flying Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.THERAPY', name: 'Yoga Therapy', nameHi: 'योग थेरेपी', aliases: ['Clinical Yoga', 'Back Care Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.MEDITATION', name: 'Meditation & Pranayama Centre', nameHi: 'ध्यान एवं प्राणायाम केंद्र', aliases: ['Dhyana Kendra', 'Pranayama Classes'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },

  // ─── §12 Mind-body classes ──────────────────────────────────────────────────
  { code: 'FIT.SERVICE.MIND_BODY', name: 'Mind-Body Classes', nameHi: 'माइंड-बॉडी कक्षाएँ', aliases: ['Mindfulness Fitness'], parent: null, type: 'wellness', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.MIND_BODY.MEDITATION', name: 'Guided Meditation', nameHi: 'निर्देशित ध्यान', aliases: ['Meditation Class', 'Dhyana Session'], parent: 'FIT.SERVICE.MIND_BODY', type: 'wellness', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.MIND_BODY.PRANAYAMA', name: 'Pranayama', nameHi: 'प्राणायाम', aliases: ['Breathing Practice', 'Anulom Vilom'], parent: 'FIT.SERVICE.MIND_BODY', type: 'wellness', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.MIND_BODY.TAICHI', name: 'Tai Chi / Qigong', nameHi: 'ताई ची / चीगोंग', aliases: ['Tai Chi Class', 'Qigong Practice'], parent: 'FIT.SERVICE.MIND_BODY', type: 'wellness', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.MIND_BODY.BREATHWORK', name: 'Breathwork', nameHi: 'ब्रेथवर्क', aliases: ['Conscious Breathing', 'Breath Therapy'], parent: 'FIT.SERVICE.MIND_BODY', type: 'wellness', tier: 'T2', kind: 'Service' },

  // ─── §12 Dance & group fitness ──────────────────────────────────────────────
  { code: 'FIT.SERVICE.DANCE', name: 'Dance Fitness', nameHi: 'डांस फिटनेस', aliases: ['Dance Workout'], parent: null, type: 'wellness', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.DANCE.ZUMBA', name: 'Zumba', nameHi: 'ज़ुम्बा', aliases: ['Zumba Class', 'Latin Dance Fitness'], parent: 'FIT.SERVICE.DANCE', type: 'wellness', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.DANCE.AEROBICS', name: 'Aerobics', nameHi: 'एरोबिक्स', aliases: ['Step Aerobics', 'Cardio Class'], parent: 'FIT.SERVICE.DANCE', type: 'wellness', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.DANCE.DANCE_FIT', name: 'Bollywood / Bhangra Fitness', nameHi: 'बॉलीवुड फिटनेस', aliases: ['Dance Workout Class', 'Masala Bhangra'], parent: 'FIT.SERVICE.DANCE', type: 'wellness', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.DANCE.PILATES', name: 'Pilates', nameHi: 'पिलाटेस', aliases: ['Mat Pilates', 'Reformer Pilates'], parent: 'FIT.SERVICE.DANCE', type: 'wellness', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.DANCE.BARRE', name: 'Barre', nameHi: 'बारे', aliases: ['Ballet Barre Workout'], parent: 'FIT.SERVICE.DANCE', type: 'wellness', tier: 'T2', kind: 'Service' },

  // ─── §12 Sports facilities & leagues ────────────────────────────────────────
  { code: 'FIT.SERVICE.SPORTS', name: 'Sports & Outdoor', nameHi: 'खेल एवं आउटडोर', aliases: ['Sports Coaching', 'Sports Leagues'], parent: null, type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.SPORTS.SWIMMING', name: 'Swimming', nameHi: 'तैराकी', aliases: ['Swim Coaching', 'Swim Classes'], parent: 'FIT.SERVICE.SPORTS', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.SPORTS.BADMINTON', name: 'Badminton', nameHi: 'बैडमिंटन', aliases: ['Badminton Court', 'Shuttle Coaching'], parent: 'FIT.SERVICE.SPORTS', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.SPORTS.CRICKET', name: 'Cricket', nameHi: 'क्रिकेट', aliases: ['Cricket Nets', 'Cricket Academy'], parent: 'FIT.SERVICE.SPORTS', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.SPORTS.FOOTBALL', name: 'Football', nameHi: 'फुटबॉल', aliases: ['Soccer Coaching', 'Football Turf'], parent: 'FIT.SERVICE.SPORTS', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.SPORTS.TENNIS', name: 'Tennis', nameHi: 'टेनिस', aliases: ['Tennis Court', 'Tennis Coaching'], parent: 'FIT.SERVICE.SPORTS', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.SPORTS.MARTIAL_ARTS', name: 'Martial Arts', nameHi: 'मार्शल आर्ट्स', aliases: ['Karate', 'Taekwondo', 'Boxing', 'Self-defence'], parent: 'FIT.SERVICE.SPORTS', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.SPORTS.RUNNING', name: 'Running Clubs', nameHi: 'रनिंग क्लब', aliases: ['Marathon Training', 'Runner Group'], parent: 'FIT.SERVICE.SPORTS', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.SPORTS.CYCLING', name: 'Cycling', nameHi: 'साइकलिंग', aliases: ['Cycling Club', 'Biking Group'], parent: 'FIT.SERVICE.SPORTS', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.SPORTS.TREKKING', name: 'Trekking & Hiking', nameHi: 'ट्रेकिंग', aliases: ['Hiking Group', 'Nature Walks'], parent: 'FIT.SERVICE.SPORTS', type: 'service', tier: 'T2', kind: 'Service' },

  // ─── §12 Goal-based programs ────────────────────────────────────────────────
  { code: 'FIT.SERVICE.PROGRAM', name: 'Goal-based Programs', nameHi: 'लक्ष्य आधारित कार्यक्रम', aliases: ['Fitness Programs'], parent: null, type: 'program', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.PROGRAM.WEIGHT_LOSS', name: 'Weight Loss Program', nameHi: 'वज़न घटाने का कार्यक्रम', aliases: ['Fat Loss Program'], parent: 'FIT.SERVICE.PROGRAM', type: 'program', tier: 'T2', adClaimsRestricted: true, kind: 'Service' },
  { code: 'FIT.SERVICE.PROGRAM.STRENGTH', name: 'Strength Building', nameHi: 'शक्ति निर्माण', aliases: ['Muscle Building Program'], parent: 'FIT.SERVICE.PROGRAM', type: 'program', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.PROGRAM.MOBILITY', name: 'Mobility & Flexibility', nameHi: 'मोबिलिटी एवं लचीलापन', aliases: ['Stretching Program', 'ROM Training'], parent: 'FIT.SERVICE.PROGRAM', type: 'program', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.PROGRAM.POSTNATAL', name: 'Postnatal Restore', nameHi: 'प्रसवोत्तर पुनर्स्थापन', aliases: ['New Mom Fitness', 'Core Restore'], parent: 'FIT.SERVICE.PROGRAM', type: 'program', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.PROGRAM.BACK_CARE', name: 'Back Pain Care', nameHi: 'पीठ दर्द देखभाल', aliases: ['Spine Care Program', 'Desk Job Fix'], parent: 'FIT.SERVICE.PROGRAM', type: 'program', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.PROGRAM.DIABETES_ACTIVE', name: 'Diabetes Active Program', nameHi: 'मधुमेह सक्रिय कार्यक्रम', aliases: ['Exercise for Diabetes'], parent: 'FIT.SERVICE.PROGRAM', type: 'program', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.PROGRAM.SCHOOL', name: 'School Fitness Program', nameHi: 'स्कूल फिटनेस कार्यक्रम', aliases: ['Kids Fitness Program', 'PE Classes'], parent: 'FIT.SERVICE.PROGRAM', type: 'program', tier: 'T2', kind: 'Service' },

  // ─── §14 Skin & hair — condition care ───────────────────────────────────────
  { code: 'CARE.DERM.CONDITION', name: 'Skin & Hair Conditions', nameHi: 'त्वचा एवं बाल समस्याएँ', aliases: ['Dermatology Concerns'], parent: null, type: 'condition', tier: 'T2', kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.ACNE', name: 'Acne & Pimples', nameHi: 'मुँहासे', aliases: ['Acne Care', 'Pimple Treatment'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.PIGMENTATION', name: 'Pigmentation & Dark Spots', nameHi: 'पिगमेंटेशन', aliases: ['Melasma', 'Dark Spots', 'Tanning'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', adClaimsRestricted: true, kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.ECZEMA_PSORIASIS', name: 'Eczema & Psoriasis', nameHi: 'एक्जिमा / सोरायसिस', aliases: ['Chronic Skin Conditions', 'Dermatitis'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.FUNGAL', name: 'Fungal Infections', nameHi: 'फंगल संक्रमण', aliases: ['Ringworm', 'Dhobi Itch'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.HAIR_FALL', name: 'Hair Fall', nameHi: 'बाल झड़ना', aliases: ['Hair Loss Care', 'Alopecia Care'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', adClaimsRestricted: true, kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.DANDRUFF', name: 'Dandruff & Scalp', nameHi: 'रूसी', aliases: ['Scalp Care', 'Itchy Scalp'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.ALLERGY', name: 'Skin Allergy', nameHi: 'त्वचा एलर्जी', aliases: ['Urticaria', 'Hives', 'Contact Dermatitis'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.VITILIGO', name: 'Vitiligo (Safed Daag)', nameHi: 'सफेद दाग', aliases: ['Leucoderma', 'White Patches'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.WARTS', name: 'Warts & Skin Tags', nameHi: 'मस्से', aliases: ['Mole Removal', 'Skin Tags'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', adClaimsRestricted: true, kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.SCARS', name: 'Scars & Stretch Marks', nameHi: 'निशान', aliases: ['Acne Scars', 'Stretch Mark Care'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', adClaimsRestricted: true, kind: 'Service' },
  { code: 'CARE.DERM.CONDITION.SUN_DAMAGE', name: 'Sun Damage Care', nameHi: 'धूप से क्षति', aliases: ['Sunburn Care', 'Photoaging'], parent: 'CARE.DERM.CONDITION', type: 'condition', tier: 'T2', kind: 'Service' },

  // ─── §14 Skin & hair — product aisles ───────────────────────────────────────
  { code: 'CARE.DERM.PRODUCT', name: 'Skin & Hair Products', nameHi: 'त्वचा एवं बाल उत्पाद', aliases: ['Dermacare Products'], parent: null, type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.SUNSCREEN', name: 'Sunscreen', nameHi: 'सनस्क्रीन', aliases: ['Sunblock', 'SPF Protection'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.MOISTURISER', name: 'Moisturisers', nameHi: 'मॉइस्चराइज़र', aliases: ['Body Lotion', 'Cold Cream'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.CLEANSER', name: 'Cleansers & Face Wash', nameHi: 'क्लींज़र / फेस वॉश', aliases: ['Face Wash', 'Gentle Cleanser'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.MED_SHAMPOO', name: 'Medicated Shampoo', nameHi: 'मेडिकेटेड शैम्पू', aliases: ['Anti-dandruff Shampoo', 'Ketoconazole'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.ANTI_ACNE', name: 'Anti-acne Products', nameHi: 'एंटी-एक्ने उत्पाद', aliases: ['Acne Gel', 'Benzoyl Peroxide'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.ANTI_FUNGAL', name: 'Anti-fungal Products', nameHi: 'एंटी-फंगल उत्पाद', aliases: ['Fungal Cream', 'Antifungal Powder'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.BABY_SKIN', name: 'Baby Skin Care', nameHi: 'बेबी स्किन केयर', aliases: ['Baby Lotion', 'Diaper Rash Cream'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.HAIR_OIL', name: 'Hair Oils & Serums', nameHi: 'हेयर ऑयल / सीरम', aliases: ['Hair Fall Oil', 'Hair Serum'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.ORAL_CARE', name: 'Oral Care', nameHi: 'ओरल केयर', aliases: ['Toothpaste', 'Mouthwash'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.FEMININE', name: 'Feminine Hygiene', nameHi: 'फेमिनाइन हाइजीन', aliases: ['Intimate Wash', 'Menstrual Products'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.MENS_GROOMING', name: "Men's Grooming", nameHi: 'पुरुष ग्रूमिंग', aliases: ['Beard Care', 'Shaving'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'CARE.DERM.PRODUCT.AYURVEDIC_SKIN', name: 'Ayurvedic Skin Care', nameHi: 'आयुर्वेदिक त्वचा देखभाल', aliases: ['Ubtan', 'Kumkumadi Oil'], parent: 'CARE.DERM.PRODUCT', type: 'product_line', tier: 'T2', kind: 'Product' },

  // ─── §15 Devices — monitoring ───────────────────────────────────────────────
  { code: 'DEV.PROD.MONITORING', name: 'Health Monitoring Devices', nameHi: 'हेल्थ मॉनिटरिंग डिवाइस', aliases: ['Vitals Monitor', 'Home Monitoring'], parent: null, type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MONITORING.BP', name: 'BP Monitor', nameHi: 'बीपी मॉनिटर', aliases: ['Blood Pressure Machine'], parent: 'DEV.PROD.MONITORING', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MONITORING.GLUCOMETER', name: 'Glucometer & Strips', nameHi: 'ग्लुकोमीटर', aliases: ['Sugar Testing Machine', 'Glucose Meter'], parent: 'DEV.PROD.MONITORING', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MONITORING.OXIMETER', name: 'Pulse Oximeter', nameHi: 'पल्स ऑक्सीमीटर', aliases: ['SpO2 Meter'], parent: 'DEV.PROD.MONITORING', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MONITORING.THERMOMETER', name: 'Thermometer', nameHi: 'थर्मामीटर', aliases: ['Digital Thermometer', 'IR Thermometer'], parent: 'DEV.PROD.MONITORING', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MONITORING.SCALE', name: 'Weighing Scale', nameHi: 'वेइंग स्केल', aliases: ['Body Weight Scale', 'BMI Scale'], parent: 'DEV.PROD.MONITORING', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MONITORING.ECG_PATCH', name: 'Portable ECG Device', nameHi: 'पोर्टेबल ईसीजी', aliases: ['ECG Patch', 'Handheld ECG'], parent: 'DEV.PROD.MONITORING', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MONITORING.CGM', name: 'Continuous Glucose Monitor', nameHi: 'सीजीएम', aliases: ['CGM Sensor', 'Flash Glucose Monitor'], parent: 'DEV.PROD.MONITORING', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MONITORING.WEARABLE', name: 'Health Wearables', nameHi: 'हेल्थ वियरेबल', aliases: ['Fitness Band', 'Health Smartwatch'], parent: 'DEV.PROD.MONITORING', type: 'device', tier: 'T2', kind: 'Product' },

  // ─── §15 Respiratory devices ────────────────────────────────────────────────
  { code: 'DEV.PROD.RESP', name: 'Respiratory Devices', nameHi: 'श्वसन डिवाइस', aliases: ['Breathing Equipment'], parent: null, type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.RESP.NEBULISER', name: 'Nebuliser', nameHi: 'नेब्युलाइज़र', aliases: ['Steam Nebulizer', 'Nebulizer Machine'], parent: 'DEV.PROD.RESP', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.RESP.CPAP_BIPAP', name: 'CPAP / BiPAP Machine', nameHi: 'सीपैप / बीपैप', aliases: ['Sleep Apnea Machine', 'Ventilator Support Home'], parent: 'DEV.PROD.RESP', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.RESP.SPACER', name: 'Inhaler Spacers', nameHi: 'इनहेलर स्पेसर', aliases: ['Aerochamber', 'Spacer Chamber'], parent: 'DEV.PROD.RESP', type: 'device', tier: 'T2', kind: 'Product' },

  // ─── §15 Mobility & home-care equipment ─────────────────────────────────────
  { code: 'DEV.PROD.MOBILITY', name: 'Mobility & Home-care Equipment', nameHi: 'मोबिलिटी एवं होम-केयर उपकरण', aliases: ['Mobility Aids'], parent: null, type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MOBILITY.WHEELCHAIR', name: 'Wheelchair', nameHi: 'व्हीलचेयर', aliases: ['Manual / Powered Wheelchair'], parent: 'DEV.PROD.MOBILITY', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MOBILITY.WALKER', name: 'Walker / Rollator', nameHi: 'वॉकर', aliases: ['Walking Frame', 'Rollator'], parent: 'DEV.PROD.MOBILITY', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MOBILITY.CRUTCHES', name: 'Crutches', nameHi: 'क्रचेस', aliases: ['Elbow Crutches', 'Axilla Crutches'], parent: 'DEV.PROD.MOBILITY', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MOBILITY.COMMODE', name: 'Commode Chair', nameHi: 'कमोड चेयर', aliases: ['Bedside Commode', 'Toilet Chair'], parent: 'DEV.PROD.MOBILITY', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MOBILITY.SHOWER_CHAIR', name: 'Shower / Bath Chair', nameHi: 'शॉवर चेयर', aliases: ['Bath Bench', 'Transfer Bench'], parent: 'DEV.PROD.MOBILITY', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.MOBILITY.HOSPITAL_BED', name: 'Hospital Bed', nameHi: 'हॉस्पिटल बेड', aliases: ['Semi-fowler Bed', 'Home ICU Bed'], parent: 'DEV.PROD.MOBILITY', type: 'device', tier: 'T2', kind: 'Product' },

  // ─── §15 Orthopaedic supports ───────────────────────────────────────────────
  { code: 'DEV.PROD.SUPPORTS', name: 'Braces & Supports', nameHi: 'ब्रेस एवं सपोर्ट', aliases: ['Orthopaedic Supports'], parent: null, type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.SUPPORTS.KNEE', name: 'Knee Brace', nameHi: 'घुटने का ब्रेस', aliases: ['Knee Cap', 'Knee Support'], parent: 'DEV.PROD.SUPPORTS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.SUPPORTS.BACK', name: 'Back Support Belt', nameHi: 'बैक सपोर्ट बेल्ट', aliases: ['Lumbar Belt', 'LS Belt'], parent: 'DEV.PROD.SUPPORTS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.SUPPORTS.NECK', name: 'Neck Collar', nameHi: 'नेक कॉलर', aliases: ['Cervical Collar'], parent: 'DEV.PROD.SUPPORTS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.SUPPORTS.SPLINTS', name: 'Splints & Finger Support', nameHi: 'स्प्लिंट', aliases: ['Finger Splint', 'Wrist Brace'], parent: 'DEV.PROD.SUPPORTS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.SUPPORTS.COMPRESSION', name: 'Compression Stockings', nameHi: 'कम्प्रेशन स्टॉकिंग', aliases: ['Varicose Vein Stockings', 'TED Hose'], parent: 'DEV.PROD.SUPPORTS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.SUPPORTS.DIABETIC_FOOTWEAR', name: 'Diabetic Footwear', nameHi: 'मधुमेह जूते', aliases: ['MCR Footwear', 'Ulcer-prevention Shoes'], parent: 'DEV.PROD.SUPPORTS', type: 'device', tier: 'T2', kind: 'Product' },

  // ─── §15 Hearing aids variants ──────────────────────────────────────────────
  { code: 'DEV.PROD.HEARING_AIDS.BTE', name: 'Behind-the-ear (BTE)', nameHi: 'बीटीई हियरिंग एड', aliases: ['BTE Hearing Aid'], parent: 'DEV.PROD.HEARING_AIDS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.HEARING_AIDS.ITE', name: 'In-the-ear (ITE / ITC / CIC)', nameHi: 'आईटीई हियरिंग एड', aliases: ['Invisible Hearing Aid', 'CIC'], parent: 'DEV.PROD.HEARING_AIDS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.HEARING_AIDS.RIC', name: 'Receiver-in-canal (RIC)', nameHi: 'आरआईसी हियरिंग एड', aliases: ['RITE Hearing Aid'], parent: 'DEV.PROD.HEARING_AIDS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.HEARING_AIDS.ACCESSORIES', name: 'Batteries & Accessories', nameHi: 'बैटरी एवं एक्सेसरीज़', aliases: ['Hearing Aid Battery', 'Drying Kit'], parent: 'DEV.PROD.HEARING_AIDS', type: 'device', tier: 'T2', kind: 'Product' },

  // ─── §15 Wound & incontinence ───────────────────────────────────────────────
  { code: 'DEV.PROD.WOUND.DRESSINGS', name: 'Wound Dressings', nameHi: 'घाव की पट्टी', aliases: ['Gauze', 'Hydrocolloid Dressing'], parent: 'DEV.PROD.WOUND_INCONTINENCE', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.WOUND.BANDAGES', name: 'Bandages & Crepe', nameHi: 'पट्टी / क्रेप', aliases: ['Crepe Bandage', 'Roller Bandage'], parent: 'DEV.PROD.WOUND_INCONTINENCE', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.WOUND.DIAPERS', name: 'Adult Diapers', nameHi: 'एडल्ट डायपर', aliases: ['Incontinence Briefs', 'Underpads'], parent: 'DEV.PROD.WOUND_INCONTINENCE', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.WOUND.CATHETER', name: 'Catheters & Uro Bag', nameHi: 'कैथेटर / यूरो बैग', aliases: ['Foley Catheter', 'Urine Bag'], parent: 'DEV.PROD.WOUND_INCONTINENCE', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.WOUND.OSTOMY', name: 'Ostomy Care', nameHi: 'ऑस्टोमी केयर', aliases: ['Colostomy Bag', 'Stoma Care'], parent: 'DEV.PROD.WOUND_INCONTINENCE', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.WOUND.BEDSORE', name: 'Bedsore Care', nameHi: 'बेडसोर देखभाल', aliases: ['Air Mattress', 'Pressure Relief Cushion'], parent: 'DEV.PROD.WOUND_INCONTINENCE', type: 'device', tier: 'T2', kind: 'Product' },

  // ─── §15 Home test kits ─────────────────────────────────────────────────────
  { code: 'DEV.PROD.TEST.PREGNANCY', name: 'Pregnancy Test Kit', nameHi: 'गर्भावस्था टेस्ट किट', aliases: ['Home Pregnancy Test', 'UPT Kit'], parent: 'DEV.PROD.HOME_TEST_KITS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.TEST.DENGUE', name: 'Dengue / Malaria Kits', nameHi: 'डेंगू / मलेरिया किट', aliases: ['NS1 Kit', 'Rapid Malaria Test'], parent: 'DEV.PROD.HOME_TEST_KITS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.TEST.COVID', name: 'COVID Antigen Kit', nameHi: 'कोविड किट', aliases: ['Self Test Kit', 'RAT Kit'], parent: 'DEV.PROD.HOME_TEST_KITS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.TEST.OVULATION', name: 'Ovulation Kit', nameHi: 'ओवुलेशन किट', aliases: ['LH Test', 'Fertility Test Kit'], parent: 'DEV.PROD.HOME_TEST_KITS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.TEST.URINALYSIS', name: 'Urinalysis Strips', nameHi: 'यूरिनलिसिस स्ट्रिप', aliases: ['Urine Test Strips'], parent: 'DEV.PROD.HOME_TEST_KITS', type: 'device', tier: 'T2', kind: 'Product' },
  { code: 'DEV.PROD.TEST.HEMOGLOBIN', name: 'Haemoglobin Kit', nameHi: 'हीमोग्लोबिन किट', aliases: ['Hb Meter', 'Anaemia Test'], parent: 'DEV.PROD.HOME_TEST_KITS', type: 'device', tier: 'T2', kind: 'Product' },

  // ─── §16 Community & seasonal events ────────────────────────────────────────
  { code: 'EVENT.COMMUNITY.MH_AWARENESS', name: 'Mental Health Awareness Meet', nameHi: 'मानसिक स्वास्थ्य जागरूकता', aliases: ['MH Stigma-free Meetup'], parent: 'EVENT.COMMUNITY', type: 'event_type', tier: 'T1', isSensitive: true, kind: 'Event' },
  { code: 'EVENT.COMMUNITY.NUTRITION_WORKSHOP', name: 'Nutrition Workshop', nameHi: 'पोषण कार्यशाला', aliases: ['Diet Workshop', 'Cooking Demo'], parent: 'EVENT.COMMUNITY', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.CAREGIVER_TRAINING', name: 'Caregiver Training', nameHi: 'देखभालकर्ता प्रशिक्षण', aliases: ['Family Caregiver Workshop'], parent: 'EVENT.COMMUNITY', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.AWARENESS_DAY', name: 'Health Awareness Day', nameHi: 'स्वास्थ्य जागरूकता दिवस', aliases: ['World Health Day', 'Awareness Week'], parent: 'EVENT.COMMUNITY', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.SEASONAL', name: 'Seasonal Health Alerts', nameHi: 'मौसमी स्वास्थ्य अलर्ट', aliases: ['Outbreak Alerts', 'Weather Health Advisory'], parent: null, type: 'info', tier: 'T2', kind: 'Info' },
  { code: 'EVENT.SEASONAL.DENGUE', name: 'Dengue / Malaria Advisory', nameHi: 'डेंगू / मलेरिया अलर्ट', aliases: ['Mosquito Season Alert'], parent: 'EVENT.SEASONAL', type: 'info', tier: 'T2', kind: 'Info' },
  { code: 'EVENT.SEASONAL.FLU_COVID', name: 'Flu / COVID Wave Alert', nameHi: 'फ्लू / कोविड अलर्ट', aliases: ['Respiratory Wave Advisory'], parent: 'EVENT.SEASONAL', type: 'info', tier: 'T2', kind: 'Info' },
  { code: 'EVENT.SEASONAL.HEATWAVE', name: 'Heatwave Advisory', nameHi: 'लू अलर्ट', aliases: ['Heat Stroke Advisory'], parent: 'EVENT.SEASONAL', type: 'info', tier: 'T2', kind: 'Info' },
  { code: 'EVENT.SEASONAL.AQI', name: 'AQI / Pollution Advisory', nameHi: 'प्रदूषण अलर्ट', aliases: ['Smog Alert', 'Air Quality Advisory'], parent: 'EVENT.SEASONAL', type: 'info', tier: 'T2', kind: 'Info' },
  { code: 'EVENT.SEASONAL.WATERBORNE', name: 'Monsoon Waterborne Advisory', nameHi: 'मानसून जलजनित अलर्ट', aliases: ['Typhoid / Cholera Advisory'], parent: 'EVENT.SEASONAL', type: 'info', tier: 'T2', kind: 'Info' },
  { code: 'EVENT.SEASONAL.COLD_WAVE', name: 'Cold Wave Advisory', nameHi: 'शीत लहर अलर्ट', aliases: ['Winter Hypothermia Advisory'], parent: 'EVENT.SEASONAL', type: 'info', tier: 'T2', kind: 'Info' },

  // ─── §19 Government scheme pages ────────────────────────────────────────────
  { code: 'GOV.INFO.MATERNITY_BENEFIT', name: 'Maternity Benefit Schemes (JSY / PMMVY)', nameHi: 'मातृत्व लाभ योजनाएँ', aliases: ['JSY', 'PMMVY Eligibility'], parent: 'GOV.INFO', type: 'scheme', tier: 'T2', kind: 'Info' },
  { code: 'GOV.INFO.NIKSHAY_TB', name: 'TB Care & Nikshay Poshan', nameHi: 'टीबी देखभाल / निक्षय पोषण', aliases: ['NTEP Programme', 'TB Nutrition Support'], parent: 'GOV.INFO', type: 'scheme', tier: 'T1', isSensitive: true, kind: 'Info' },

  // ─── §20 Insurance policy types ─────────────────────────────────────────────
  { code: 'FIN.INFO.POLICY', name: 'Policy Types', nameHi: 'पॉलिसी प्रकार', aliases: ['Insurance Policy Categories'], parent: null, type: 'insurance_policy', tier: 'T2', kind: 'Info' },
  { code: 'FIN.INFO.POLICY.INDIVIDUAL_FAMILY', name: 'Individual / Family Floater', nameHi: 'व्यक्तिगत / फैमिली फ्लोटर', aliases: ['Family Floater Policy'], parent: 'FIN.INFO.POLICY', type: 'insurance_policy', tier: 'T2', kind: 'Info' },
  { code: 'FIN.INFO.POLICY.SENIOR', name: 'Senior Citizen Policy', nameHi: 'वरिष्ठ नागरिक पॉलिसी', aliases: ['Elder Health Cover'], parent: 'FIN.INFO.POLICY', type: 'insurance_policy', tier: 'T2', kind: 'Info' },
  { code: 'FIN.INFO.POLICY.CRITICAL_ILLNESS', name: 'Critical Illness Cover', nameHi: 'गंभीर बीमारी कवर', aliases: ['Cancer / Cardiac Cover'], parent: 'FIN.INFO.POLICY', type: 'insurance_policy', tier: 'T2', kind: 'Info' },
  { code: 'FIN.INFO.POLICY.TOPUP', name: 'Top-up / Super Top-up', nameHi: 'टॉप-अप पॉलिसी', aliases: ['Deductible Cover'], parent: 'FIN.INFO.POLICY', type: 'insurance_policy', tier: 'T2', kind: 'Info' },
  { code: 'FIN.INFO.POLICY.GROUP_CORPORATE', name: 'Group / Corporate Cover', nameHi: 'समूह / कॉर्पोरेट कवर', aliases: ['Employer Health Cover', 'GMC Policy'], parent: 'FIN.INFO.POLICY', type: 'insurance_policy', tier: 'T2', kind: 'Info' },
  { code: 'FIN.INFO.POLICY.MATERNITY', name: 'Maternity Cover', nameHi: 'मातृत्व कवर', aliases: ['Pregnancy Insurance Cover'], parent: 'FIN.INFO.POLICY', type: 'insurance_policy', tier: 'T2', kind: 'Info' },
  { code: 'FIN.INFO.POLICY.PERSONAL_ACCIDENT', name: 'Personal Accident Cover', nameHi: 'दुर्घटना कवर', aliases: ['PA Policy', 'Disability Cover'], parent: 'FIN.INFO.POLICY', type: 'insurance_policy', tier: 'T2', kind: 'Info' },
  { code: 'FIN.INFO.POLICY.DENTAL_OPTICAL', name: 'Dental & Optical Rider', nameHi: 'डेंटल / ऑप्टिकल राइडर', aliases: ['Add-on Cover', 'Rider Policy'], parent: 'FIN.INFO.POLICY', type: 'insurance_policy', tier: 'T2', kind: 'Info' },
  { code: 'FIN.INFO.POLICY.AYUSH_COVER', name: 'AYUSH Treatment Cover', nameHi: 'आयुष उपचार कवर', aliases: ['AYUSH Insurance Cover'], parent: 'FIN.INFO.POLICY', type: 'insurance_policy', tier: 'T2', kind: 'Info' },
  { code: 'FIN.INFO.POLICY.OPD', name: 'OPD Cover', nameHi: 'ओपीडी कवर', aliases: ['Outpatient Cover', 'Wellness Benefit'], parent: 'FIN.INFO.POLICY', type: 'insurance_policy', tier: 'T2', kind: 'Info' },

  // ─── §20 Claim services ─────────────────────────────────────────────────────
  { code: 'FIN.SERVICE.CLAIM', name: 'Claim Support Services', nameHi: 'क्लेम सहायता सेवाएँ', aliases: ['Insurance Claim Help'], parent: null, type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.CASHLESS', name: 'Cashless Hospitalisation Support', nameHi: 'कैशलेस इलाज सहायता', aliases: ['Cashless Network Help'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.REIMBURSEMENT', name: 'Reimbursement Filing', nameHi: 'प्रतिपूर्ति फाइलिंग', aliases: ['Claim Documents Help'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.PREAUTH', name: 'Pre-authorisation Support', nameHi: 'प्री-ऑथराइजेशन सहायता', aliases: ['Preauth Desk'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.DISCHARGE', name: 'Discharge Claim Assistance', nameHi: 'डिस्चार्ज क्लेम सहायता', aliases: ['Final Bill Processing Help'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.DENIAL_APPEAL', name: 'Denial & Appeal Support', nameHi: 'क्लेम अस्वीकृति अपील', aliases: ['Rejected Claim Help'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.PORTABILITY', name: 'Policy Portability', nameHi: 'पॉलिसी पोर्टेबिलिटी', aliases: ['Insurer Switch Help'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.NOMINEE', name: 'Nominee Claim Filing', nameHi: 'नॉमिनी क्लेम फाइलिंग', aliases: ['Family Claim Support'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },

  // ─── §20 Legal practice areas ───────────────────────────────────────────────
  { code: 'LEGAL.PRO.PRACTICE', name: 'Health-law Practice Areas', nameHi: 'स्वास्थ्य कानून विशेषज्ञता', aliases: ['Healthcare Law Specialisations'], parent: null, type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.NEGLIGENCE', name: 'Medical Negligence', nameHi: 'चिकित्सा लापरवाही', aliases: ['Malpractice Cases'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.CONSUMER', name: 'Consumer Disputes (Healthcare)', nameHi: 'उपभोक्ता विवाद', aliases: ['Deficiency of Service Cases'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.INSURANCE_DISPUTE', name: 'Insurance Disputes', nameHi: 'बीमा विवाद', aliases: ['Rejected Claim Legal Help'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.CONSENT', name: 'Informed Consent Issues', nameHi: 'सूचित सहमति', aliases: ['Consent Violation Cases'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.ELDER_SUCCESSION', name: 'Elder Will & Succession', nameHi: 'वृद्धा वसीयत / उत्तराधिकार', aliases: ['Will Drafting', 'Succession Certificate'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.DISABILITY', name: 'Disability Rights', nameHi: 'दिव्यांग अधिकार', aliases: ['RPWD Act Cases', 'Accessibility Grievance'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.MH_ACT', name: 'Mental Healthcare Act Matters', nameHi: 'मानसिक स्वास्थ्य अधिनियम', aliases: ['MHCA 2017 Cases', 'Advance Directive'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.PCPNDT', name: 'PCPNDT Compliance', nameHi: 'पीसीपीएनडीटी अनुपालन', aliases: ['Sex-selective Ban Compliance'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.TELEHEALTH', name: 'Telehealth Compliance', nameHi: 'टेलीहेल्थ अनुपालन', aliases: ['Telemedicine Rules Advisory'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.DATA_PRIVACY', name: 'Health Data Privacy (DPDP)', nameHi: 'स्वास्थ्य डेटा गोपनीयता', aliases: ['DPDP Act Health Cases', 'Medical Records Privacy'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.REGISTRATION', name: 'Medical Registration & Licensing', nameHi: 'चिकित्सा पंजीकरण / लाइसेंस', aliases: ['NMC Registration Help', 'Clinic Licence'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.PHARMACY_LICENCE', name: 'Pharmacy Licensing', nameHi: 'फार्मेसी लाइसेंस', aliases: ['Drug Licence Help'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },

  // ─── §14 NUT — clinical/hospital diet textures ──────────────────────────────
  { code: 'NUT.DIET.REGULAR', name: 'Regular / General Diet', nameHi: 'सामान्य आहार', aliases: ['Full Diet', 'Normal Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.LOW_SODIUM', name: 'Low-sodium Diet', nameHi: 'कम नमक आहार', aliases: ['Salt-restricted Diet', 'Low Na Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.LOW_RESIDUE', name: 'Low-residue Diet', nameHi: 'कम अवशेष आहार', aliases: ['Low Fibre Diet', 'Low Fiber Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.BLAND', name: 'Bland Diet', nameHi: 'मृदु आहार', aliases: ['Gastritis Diet', 'Bland Food'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.CLEAR_LIQUID', name: 'Clear Liquid Diet', nameHi: 'स्पष्ट द्रव आहार', aliases: ['Clear Fluid Diet', 'Pre-colonoscopy Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.FULL_LIQUID', name: 'Full Liquid Diet', nameHi: 'पूर्ण द्रव आहार', aliases: ['Fluid Diet', 'Liquid Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.SOFT', name: 'Soft Diet', nameHi: 'मृदु भोजन', aliases: ['Soft Food Diet', 'Post-dental Soft Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.PUREED', name: 'Pureed / Dysphagia Diet', nameHi: 'प्यूरी / निगलने आहार', aliases: ['Mashed Diet', 'Swallowing-safe Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.TUBE_ENTERAL', name: 'Tube / Enteral Feeding', nameHi: 'ट्यूब / एंटेरल फीडिंग', aliases: ['Ryles Tube Feed', 'NG Feed Formula'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.NEUTROPENIC', name: 'Neutropenic Diet', nameHi: 'न्यूट्रोपीनिक आहार', aliases: ['Low-microbial Diet', 'Chemo-safe Food'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.WEIGHT_LOSS', name: 'Weight-loss Diet', nameHi: 'वज़न घटाने आहार', aliases: ['Calorie Deficit Diet', 'Slimming Diet'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', adClaimsRestricted: true, kind: 'Filter' },
  { code: 'NUT.DIET.POST_SURGERY', name: 'Post-surgery Diet', nameHi: 'शल्यक्रिया पश्चात आहार', aliases: ['Recovery Diet', 'Post-op Feeding'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.DIET.NPO', name: 'NPO (Nil by Mouth)', nameHi: 'कुछ भी मुंह से नहीं', aliases: ['Fasting Order', 'Nil Per Oral'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },

  // ─── §14 NUT — preference, meal slots, focus, supplements, services ────────
  { code: 'NUT.DIET.HALAL', name: 'Halal Diet', nameHi: 'हलाल आहार', aliases: ['Halal Food', 'Halal-certified'], parent: 'NUT.DIET', type: 'diet', tier: 'T2', kind: 'Filter' },
  { code: 'NUT.MEAL.EARLY_MORNING', name: 'Early-morning Meal', nameHi: 'भोर का भोजन', aliases: ['Pre-breakfast Meal', 'Brahmi-muhurat Meal'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.MID_MORNING', name: 'Mid-morning Snack', nameHi: 'दोपहर से पहले', aliases: ['Mid-morning Meal'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.EVENING_SNACK', name: 'Evening Snack', nameHi: 'शाम का स्नैक', aliases: ['Evening Chaat', 'Tea-time Snack'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.BEDTIME', name: 'Bedtime Meal', nameHi: 'सोने से पहले', aliases: ['Night Meal', 'Pre-sleep Snack'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', kind: 'Product' },
  { code: 'NUT.MEAL.SUPPLEMENT_SLOT', name: 'Supplement Shake / Meal-replacer', nameHi: 'सप्लीमेंट भोजन', aliases: ['Meal Replacement', 'Nutrition Drink'], parent: 'NUT.MEAL', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },
  { code: 'NUT.PRO.FOCUS.PCOS', name: 'PCOS Nutrition', nameHi: 'पीसीओएस पोषण', aliases: ['Hormonal Health Dietitian'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PRO.FOCUS.GUT', name: 'Gut Health Nutrition', nameHi: 'आंत स्वास्थ्य पोषण', aliases: ['GI Nutrition', 'Microbiome Diet'], parent: 'NUT.PRO.FOCUS', type: 'provider_type', tier: 'T2', kind: 'Practitioner' },
  { code: 'NUT.PROD.SUPP.IMMUNITY', name: 'Immunity Supplements', nameHi: 'इम्युनिटी सप्लीमेंट', aliases: ['Immune Booster', 'Vitamin C Zinc'], parent: 'NUT.PROD.SUPPLEMENTS', type: 'product_line', tier: 'T2', adClaimsRestricted: true, kind: 'Product' },
  { code: 'NUT.SERVICE.CALORIE_CONTROLLED', name: 'Calorie-controlled Meal Service', nameHi: 'कैलोरी-नियंत्रित भोजन', aliases: ['Macro-counted Meals'], parent: 'NUT.SERVICE', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'NUT.SERVICE.DIABETIC_MEALS', name: 'Diabetic Meal Delivery', nameHi: 'मधुमेह भोजन डिलीवरी', aliases: ['Sugar-friendly Tiffin'], parent: 'NUT.SERVICE', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'NUT.SERVICE.MEAL_SUBSCRIPTION', name: 'Meal Subscription Plan', nameHi: 'मील सब्सक्रिप्शन', aliases: ['Weekly Meal Subscription', 'Monthly Tiffin Plan'], parent: 'NUT.SERVICE', type: 'service', tier: 'T2', kind: 'Service' },

  // ─── §15 FIT — yoga styles, wellness centres, tracking ─────────────────────
  { code: 'FIT.FAC.YOGA.POWER', name: 'Power Yoga', nameHi: 'पावर योग', aliases: ['Dynamic Yoga', 'Power Vinyasa'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.SENIOR', name: 'Senior Yoga', nameHi: 'वृद्धा योग', aliases: ['Gentle Yoga for Elders', 'Chair Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.KIDS', name: 'Kids Yoga', nameHi: 'बाल योग', aliases: ['Children Yoga Class', 'School Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.CORPORATE', name: 'Corporate Yoga', nameHi: 'कॉर्पोरेट योग', aliases: ['Office Yoga Session', 'Workplace Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.YOGA.RETREATS', name: 'Yoga Retreats & Camps', nameHi: 'योग शिविर', aliases: ['Yoga Camp', 'Wellness Retreat Yoga'], parent: 'FIT.FAC.YOGA', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.WELLNESS', name: 'Wellness Centres', nameHi: 'वेलनेस केंद्र', aliases: ['Wellness Studio'], parent: null, type: 'facility_type', tier: 'T3', kind: 'Facility' },
  { code: 'FIT.FAC.WELLNESS.NATUROPATHY', name: 'Naturopathy Centre', nameHi: 'नेचरोपैथी केंद्र', aliases: ['Nature Cure Centre'], parent: 'FIT.FAC.WELLNESS', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.WELLNESS.AYURVEDIC', name: 'Ayurvedic Wellness Centre', nameHi: 'आयुर्वेदिक वेलनेस केंद्र', aliases: ['Ayurveda Wellness'], parent: 'FIT.FAC.WELLNESS', type: 'facility_type', tier: 'T2', kind: 'Facility' },
  { code: 'FIT.FAC.WELLNESS.DETOX', name: 'Detox Centre', nameHi: 'डिटॉक्स केंद्र', aliases: ['Detox Program Centre'], parent: 'FIT.FAC.WELLNESS', type: 'facility_type', tier: 'T3', adClaimsRestricted: true, kind: 'Facility' },
  { code: 'FIT.FAC.WELLNESS.SPA_MASSAGE', name: 'Spa / Massage (non-clinical)', nameHi: 'स्पा / मालिश', aliases: ['Wellness Massage', 'Day Spa'], parent: 'FIT.FAC.WELLNESS', type: 'facility_type', tier: 'T3', kind: 'Facility' },
  { code: 'FIT.FAC.WELLNESS.SLEEP_PROGRAM', name: 'Sleep Wellness Program', nameHi: 'निद्रा स्वास्थ्य कार्यक्रम', aliases: ['Sleep Improvement Program'], parent: 'FIT.FAC.WELLNESS', type: 'program', tier: 'T2', kind: 'Service' },
  { code: 'FIT.FAC.WELLNESS.STRESS_RELIEF', name: 'Stress-relief Program', nameHi: 'तनाव मुक्ति कार्यक्रम', aliases: ['Relaxation Program'], parent: 'FIT.FAC.WELLNESS', type: 'program', tier: 'T2', kind: 'Service' },
  { code: 'FIT.SERVICE.TRACKING', name: 'Fitness Tracking', nameHi: 'फिटनेस ट्रैकिंग', aliases: ['Activity Tracking', 'Fitness Streaks'], parent: null, type: 'wellness', tier: 'T3', kind: 'Service' },
  { code: 'FIT.SERVICE.TRACKING.STEPS', name: 'Step Counter', nameHi: 'स्टेप काउंटर', aliases: ['Daily Steps', 'Walking Tracker'], parent: 'FIT.SERVICE.TRACKING', type: 'wellness', tier: 'T3', kind: 'Service' },
  { code: 'FIT.SERVICE.TRACKING.WORKOUTS', name: 'Workout Log', nameHi: 'वर्कआउट रिकॉर्ड', aliases: ['Exercise Log', 'Gym Log'], parent: 'FIT.SERVICE.TRACKING', type: 'wellness', tier: 'T3', kind: 'Service' },
  { code: 'FIT.SERVICE.TRACKING.CHALLENGES', name: 'Fitness Challenges', nameHi: 'फिटनेस चुनौती', aliases: ['Step Challenge', 'Fitness Contest'], parent: 'FIT.SERVICE.TRACKING', type: 'event_type', tier: 'T3', kind: 'Service' },
  { code: 'FIT.SERVICE.TRACKING.STREAKS', name: 'Streaks & Rewards', nameHi: 'स्ट्रीक एवं पुरस्कार', aliases: ['Consistency Rewards', 'Loyalty Streaks'], parent: 'FIT.SERVICE.TRACKING', type: 'wellness', tier: 'T3', kind: 'Service' },

  // ─── §8 CENTRE — eye clinical leaves ────────────────────────────────────────
  { code: 'CENTRE.LEAF.CATARACT', name: 'Cataract Surgery', nameHi: 'मोतियाबिंद शल्यक्रिया', aliases: ['Phaco Surgery', 'Cataract Operation'], parent: 'CENTRE.FAC.EYE', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'CENTRE.LEAF.LASIK', name: 'LASIK / Refractive Surgery', nameHi: 'लेसिक शल्यक्रिया', aliases: ['Refractive Surgery', 'Specs Removal'], parent: 'CENTRE.FAC.EYE', type: 'service', tier: 'T2', adClaimsRestricted: true, kind: 'Service' },
  { code: 'CENTRE.LEAF.CORNEA', name: 'Cornea Clinic', nameHi: 'कॉर्निया क्लिनिक', aliases: ['Corneal Transplant', 'Keratoplasty'], parent: 'CENTRE.FAC.EYE', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'CENTRE.LEAF.GLAUCOMA', name: 'Glaucoma Clinic', nameHi: 'ग्लूकोमा क्लिनिक', aliases: ['Eye Pressure Care'], parent: 'CENTRE.FAC.EYE', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'CENTRE.LEAF.SQUINT', name: 'Squint Clinic', nameHi: 'भेंगापन क्लिनिक', aliases: ['Strabismus Care'], parent: 'CENTRE.FAC.EYE', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'CENTRE.LEAF.PAED_EYE', name: 'Paediatric Eye Clinic', nameHi: 'बाल नेत्र क्लिनिक', aliases: ['Child Eye Care'], parent: 'CENTRE.FAC.EYE', type: 'service', tier: 'T2', kind: 'Service' },

  // ─── §18 EVENT — specialty camps, walks, awareness days ────────────────────
  { code: 'EVENT.COMMUNITY.SPECIALTY_CAMP', name: 'Specialty Camp', nameHi: 'विशेषज्ञ शिविर', aliases: ['Super-specialty Camp'], parent: 'EVENT.COMMUNITY', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.SPECIALTY_CAMP.EYE', name: 'Eye Camp (specialty)', nameHi: 'नेत्र शिविर', aliases: ['Cataract Camp'], parent: 'EVENT.COMMUNITY.SPECIALTY_CAMP', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.SPECIALTY_CAMP.DENTAL', name: 'Dental Camp', nameHi: 'दंत शिविर', aliases: ['Dental Checkup Camp'], parent: 'EVENT.COMMUNITY.SPECIALTY_CAMP', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.SPECIALTY_CAMP.DIABETES', name: 'Diabetes Camp', nameHi: 'मधुमेह शिविर', aliases: ['Sugar Screening Camp'], parent: 'EVENT.COMMUNITY.SPECIALTY_CAMP', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.SPECIALTY_CAMP.CARDIAC', name: 'Cardiac Camp', nameHi: 'हृदय शिविर', aliases: ['BP / ECG Camp'], parent: 'EVENT.COMMUNITY.SPECIALTY_CAMP', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.SPECIALTY_CAMP.ORTHO', name: 'Ortho Camp', nameHi: 'अस्थि शिविर', aliases: ['Joint Checkup Camp'], parent: 'EVENT.COMMUNITY.SPECIALTY_CAMP', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.SPECIALTY_CAMP.WOMEN', name: 'Women Health Camp', nameHi: 'महिला स्वास्थ्य शिविर', aliases: ['Gynae Camp'], parent: 'EVENT.COMMUNITY.SPECIALTY_CAMP', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.RUN_WALK', name: 'Walkathon / Fun Run', nameHi: 'वॉकथॉन', aliases: ['Health Run', 'Awareness Walk'], parent: 'EVENT.COMMUNITY', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.CORPORATE_DAY', name: 'Corporate Wellness Day', nameHi: 'कॉर्पोरेट वेलनेस दिवस', aliases: ['Office Health Day'], parent: 'EVENT.COMMUNITY', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.AWARENESS_DAY.HEART', name: 'World Heart Day', nameHi: 'विश्व हृदय दिवस', aliases: ['Heart Awareness Day'], parent: 'EVENT.COMMUNITY.AWARENESS_DAY', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.AWARENESS_DAY.DIABETES', name: 'World Diabetes Day', nameHi: 'विश्व मधुमेह दिवस', aliases: ['Diabetes Awareness Day'], parent: 'EVENT.COMMUNITY.AWARENESS_DAY', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.AWARENESS_DAY.TB', name: 'World TB Day', nameHi: 'विश्व क्षय रोग दिवस', aliases: ['TB Awareness Day'], parent: 'EVENT.COMMUNITY.AWARENESS_DAY', type: 'event_type', tier: 'T1', isSensitive: true, kind: 'Event' },
  { code: 'EVENT.COMMUNITY.AWARENESS_DAY.CANCER', name: 'World Cancer Day', nameHi: 'विश्व कैंसर दिवस', aliases: ['Cancer Awareness Day'], parent: 'EVENT.COMMUNITY.AWARENESS_DAY', type: 'event_type', tier: 'T2', kind: 'Event' },
  { code: 'EVENT.COMMUNITY.AWARENESS_DAY.MH', name: 'World Mental Health Day', nameHi: 'विश्व मानसिक स्वास्थ्य दिवस', aliases: ['MH Awareness Day'], parent: 'EVENT.COMMUNITY.AWARENESS_DAY', type: 'event_type', tier: 'T1', isSensitive: true, kind: 'Event' },

  // ─── §20 FIN claim types & LEGAL practice areas (doc remainder) ─────────────
  { code: 'FIN.SERVICE.CLAIM.DAYCARE', name: 'Day-care Procedure Claim', nameHi: 'डे-केयर प्रक्रिया क्लेम', aliases: ['Daycare Cover Help'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.OPD', name: 'OPD Claim Support', nameHi: 'ओपीडी क्लेम सहायता', aliases: ['Outpatient Claim Help'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.PRE_POST_HOSP', name: 'Pre / Post-hospitalisation Claim', nameHi: 'भर्ती पूर्व / पश्चात क्लेम', aliases: ['Pre-post Expenses Filing'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.AMBULANCE_COVER', name: 'Ambulance Cover Claim', nameHi: 'एम्बुलेंस कवर क्लेम', aliases: ['Ambulance Expense Claim'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'FIN.SERVICE.CLAIM.AYUSH', name: 'AYUSH Treatment Claim', nameHi: 'आयुष उपचार क्लेम', aliases: ['AYUSH Cover Claim Help'], parent: 'FIN.SERVICE.CLAIM', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'LEGAL.PRO.PRACTICE.CRIMINAL', name: 'Criminal (Medical Negligence)', nameHi: 'आपराधिक (चिकित्सा लापरवाही)', aliases: ['Criminal Negligence Cases', '304A Matters'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.CEA_LICENSING', name: 'Clinical Establishments Act', nameHi: 'क्लिनिकल स्थापना अधिनियम', aliases: ['CEA Registration', 'Hospital Compliance'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.ORGAN_DONATION', name: 'Organ-donation Legalities', nameHi: 'अंगदान कानून', aliases: ['THOA Compliance', 'Transplant Legal Clearance'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.LABOUR', name: 'Labour & Medical Staff Matters', nameHi: 'श्रम / चिकित्सा कर्मी विवाद', aliases: ['Healthcare Employment Disputes'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T2', kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.POCSO', name: 'Child-protection (POCSO)', nameHi: 'बाल संरक्षण (पॉक्सो)', aliases: ['POCSO Act Cases'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'LEGAL.PRO.PRACTICE.DV_ACT', name: "Women's Protection (DV Act)", nameHi: 'महिला संरक्षण (डीवी अधिनियम)', aliases: ['Domestic Violence Act Cases'], parent: 'LEGAL.PRO.PRACTICE', type: 'legal_practice_area', tier: 'T1', isSensitive: true, kind: 'Practitioner' },

  // ─── §22 HOME services (doc remainder) ──────────────────────────────────────
  { code: 'HOME.SERVICE.DIETITIAN', name: 'Home Dietitian Visit', nameHi: 'घर आहार विशेषज्ञ', aliases: ['Home Nutrition Visit'], parent: 'HOME.SERVICE', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'HOME.SERVICE.YOGA_TRAINER', name: 'Home Yoga / Fitness Trainer', nameHi: 'घर योग / फिटनेस ट्रेनर', aliases: ['Home Personal Training'], parent: 'HOME.SERVICE', type: 'service', tier: 'T2', kind: 'Service' },
  { code: 'HOME.SERVICE.EQUIPMENT_SETUP', name: 'Home Oxygen / Equipment Setup', nameHi: 'घर ऑक्सीजन / उपकरण सेटअप', aliases: ['Home ICU Equipment Install', 'Home ICU Setup'], parent: 'HOME.SERVICE', type: 'service', tier: 'T1', kind: 'Service' },
  { code: 'HOME.SERVICE.PALLIATIVE', name: 'Home Palliative Care', nameHi: 'घर उपशामक देखभाल', aliases: ['Hospice at Home'], parent: 'HOME.SERVICE', type: 'service', tier: 'T1', isSensitive: true, kind: 'Service' },

  // ─── §25 Organ / eye / body-donation pledge (sensitive) ─────────────────────
  { code: 'GOV.INFO.ORGAN_DONATION', name: 'Organ / Eye / Body-donation Pledge', nameHi: 'अंगदान / नेत्रदान प्रतिज्ञा', aliases: ['NOTTO Pledge', 'Eye Donation Pledge'], parent: 'GOV.INFO', type: 'scheme', tier: 'T1', isSensitive: true, kind: 'Info' },
]);

export default DEPTH_CATEGORY_NODES;
