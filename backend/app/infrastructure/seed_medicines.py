"""
MedIntel AI — Master Medicine Dataset Seed Script
Seeds top 30+ essential medicines into MongoDB upon initialization.
"""

import logging
from typing import List, Dict, Any
from app.infrastructure.models.medicine_model import MedicineDocument

logger = logging.getLogger(__name__)

INITIAL_MEDICINES_DATASET: List[Dict[str, Any]] = [
    {
        "name": "Paracetamol",
        "generic_name": "Acetaminophen",
        "drug_class": "Analgesic & Antipyretic",
        "dosage_forms": ["tablet", "capsule", "syrup", "suppository"],
        "strengths": ["500mg", "650mg", "120mg/5ml", "250mg/5ml"],
        "description": "Common pain reliever and fever reducer used worldwide.",
        "mechanism_of_action": "Inhibits prostaglandin synthesis in the central nervous system to relieve pain and reduce fever.",
        "indications": "Fever, headache, toothache, muscle aches, post-vaccination fever, mild to moderate pain.",
        "contraindications": "Severe liver impairment, hypersensitivity to acetaminophen.",
        "side_effects": {
            "common": ["Nausea", "Stomach upset"],
            "rare": ["Allergic rash", "Itching"],
            "serious": ["Liver damage at high doses (>4000mg/day)", "Jaundice"]
        },
        "precautions": "Do not exceed recommended daily dose (max 4000mg/day). Avoid alcohol consumption while taking.",
        "elderly_warnings": "Safe for elderly patients, but lower total daily dose (<3000mg/day) is recommended if liver function is reduced.",
        "food_interactions": ["Alcohol increases liver risk"],
        "is_otc": True,
        "simple_explanation": "Paracetamol is a safe and gentle medicine used to lower fever and relieve mild pains like headaches or body aches. Take it with a glass of water.",
        "search_keywords": ["paracetamol", "acetaminophen", "dolo", "crocin", "fever", "pain", "headache", "dolo650", "dolo 650"]
    },
    {
        "name": "Dolo 650",
        "generic_name": "Paracetamol (650mg)",
        "drug_class": "Analgesic & Antipyretic",
        "dosage_forms": ["tablet"],
        "strengths": ["650mg"],
        "description": "High-strength paracetamol tablet commonly prescribed for high fever and body pain.",
        "mechanism_of_action": "Blocks prostaglandin production to reduce fever and alleviate body pain.",
        "indications": "High fever, viral fever, severe headache, body ache, joint pain.",
        "contraindications": "Severe liver disease, allergy to paracetamol.",
        "side_effects": {
            "common": ["Mild nausea"],
            "rare": ["Skin rash"],
            "serious": ["Hepatotoxicity with overdose"]
        },
        "precautions": "Take after meals. Maintain an interval of 4-6 hours between doses.",
        "elderly_warnings": "Do not exceed 3 tablets per day in elderly individuals without doctor advice.",
        "food_interactions": ["Avoid alcohol"],
        "is_otc": True,
        "simple_explanation": "Dolo 650 contains 650mg of Paracetamol. It is very effective for lowering fever and relieving body aches during viral flu.",
        "search_keywords": ["dolo", "dolo 650", "dolo650", "paracetamol 650", "fever tablet"]
    },
    {
        "name": "Metformin",
        "generic_name": "Metformin Hydrochloride",
        "drug_class": "Biguanide Antidiabetic",
        "dosage_forms": ["tablet", "extended-release tablet"],
        "strengths": ["500mg", "850mg", "1000mg"],
        "description": "First-line oral medication for managing type 2 diabetes mellitus.",
        "mechanism_of_action": "Decreases hepatic glucose production, decreases intestinal absorption of glucose, and improves insulin sensitivity.",
        "indications": "Type 2 diabetes mellitus, blood sugar control, polycystic ovary syndrome (PCOS).",
        "contraindications": "Severe renal impairment (eGFR < 30 mL/min), acute metabolic acidosis.",
        "side_effects": {
            "common": ["Nausea", "Diarrhea", "Abdominal bloating", "Metallic taste"],
            "rare": ["Vitamin B12 deficiency"],
            "serious": ["Lactic acidosis (very rare)"]
        },
        "precautions": "Take with meals to reduce stomach upset. Hydrate well. Temporarily stop before iodinated contrast dye procedures.",
        "elderly_warnings": "Monitor kidney function annually; dose adjustment needed if kidney function declines.",
        "food_interactions": ["Alcohol increases lactic acidosis risk", "Vitamin B12 absorption reduced"],
        "is_otc": False,
        "simple_explanation": "Metformin helps control blood sugar levels by making your body respond better to insulin and reducing sugar produced by your liver. Take it with food.",
        "search_keywords": ["metformin", "glucophage", "glycomet", "diabetes", "sugar", "blood sugar", "type 2 diabetes"]
    },
    {
        "name": "Aspirin",
        "generic_name": "Acetylsalicylic Acid",
        "drug_class": "NSAID & Antiplatelet Agent",
        "dosage_forms": ["tablet", "chewable tablet", "enteric-coated tablet"],
        "strengths": ["75mg", "81mg", "100mg", "325mg", "500mg"],
        "description": "Blood thinner at low doses (75-100mg) and pain/fever reliever at higher doses.",
        "mechanism_of_action": "Irreversibly inhibits cyclooxygenase-1 (COX-1) to block thromboxane A2 formation and inhibit blood platelet aggregation.",
        "indications": "Prevention of heart attacks, stroke prevention, blood clot prevention, mild arthritis pain.",
        "contraindications": "Active stomach ulcers, bleeding disorders, asthma triggered by NSAIDs.",
        "side_effects": {
            "common": ["Stomach irritation", "Heartburn", "Easy bruising"],
            "rare": ["Tinnitus (ringing in ears)"],
            "serious": ["Gastrointestinal bleeding", "Hemorrhagic stroke"]
        },
        "precautions": "Take with food or milk. Do not crush enteric-coated tablets. Inform dentist/surgeon before procedures.",
        "elderly_warnings": "Higher risk of stomach bleeding in elderly; enterically coated formulations or co-prescription of stomach protectants recommended.",
        "food_interactions": ["Alcohol increases stomach bleeding risk", "Ginkgo Biloba increases bleeding risk"],
        "is_otc": True,
        "simple_explanation": "Aspirin in low doses keeps blood flowing smoothly to protect your heart and prevent clots. Always take it with food.",
        "search_keywords": ["aspirin", "disprin", "ecotrin", "blood thinner", "heart", "chest pain"]
    },
    {
        "name": "Lisinopril",
        "generic_name": "Lisinopril",
        "drug_class": "ACE Inhibitor",
        "dosage_forms": ["tablet"],
        "strengths": ["2.5mg", "5mg", "10mg", "20mg", "40mg"],
        "description": "Antihypertensive medication used to treat high blood pressure and heart failure.",
        "mechanism_of_action": "Inhibits Angiotensin-Converting Enzyme (ACE), preventing conversion of Angiotensin I to Angiotensin II, causing blood vessel relaxation.",
        "indications": "Hypertension (high blood pressure), heart failure management, post-myocardial infarction heart recovery.",
        "contraindications": "History of angioedema, pregnancy (fetal harm), co-administration with aliskiren in diabetic patients.",
        "side_effects": {
            "common": ["Dry persistent cough", "Dizziness upon standing", "Headache"],
            "rare": ["Hyperkalemia (high potassium)"],
            "serious": ["Angioedema (swelling of face/throat)"]
        },
        "precautions": "Drink adequate water. Avoid potassium supplements or salt substitutes containing potassium without consulting doctor.",
        "elderly_warnings": "May cause sudden blood pressure drop when standing up; rise slowly from sitting or lying position.",
        "food_interactions": ["Potassium-rich foods / salt substitutes"],
        "is_otc": False,
        "simple_explanation": "Lisinopril lowers high blood pressure by relaxing your blood vessels, making it easier for your heart to pump blood.",
        "search_keywords": ["lisinopril", "zestril", "prinivil", "bp", "blood pressure", "hypertension"]
    },
    {
        "name": "Amoxicillin",
        "generic_name": "Amoxicillin Trihydrate",
        "drug_class": "Penicillin Antibiotic",
        "dosage_forms": ["capsule", "tablet", "oral suspension"],
        "strengths": ["250mg", "500mg", "875mg", "125mg/5ml"],
        "description": "Broad-spectrum penicillin antibiotic used to treat bacterial infections.",
        "mechanism_of_action": "Binds to penicillin-binding proteins, inhibiting bacterial cell wall synthesis and leading to cell lysis.",
        "indications": "Chest infections, pneumonia, throat infections, ear infections, urinary tract infections, dental abscesses.",
        "contraindications": "History of severe allergic reaction (anaphylaxis) to penicillin or cephalosporin antibiotics.",
        "side_effects": {
            "common": ["Diarrhea", "Mild nausea", "Skin rash"],
            "rare": ["Oral thrush"],
            "serious": ["Anaphylaxis (severe allergic reaction)", "Severe watery diarrhea (C. diff)"]
        },
        "precautions": "Complete the full prescribed course even if feeling better. Space doses evenly throughout the day.",
        "elderly_warnings": "Ensure renal dosage adjustment if kidney clearance is reduced.",
        "food_interactions": ["Can be taken with or without food"],
        "is_otc": False,
        "simple_explanation": "Amoxicillin is an antibiotic that kills harmful bacteria causing infections in your throat, ears, chest, or urinary tract. Take full course.",
        "search_keywords": ["amoxicillin", "mox", "amoxil", "antibiotic", "infection", "mox 500"]
    },
    {
        "name": "Atorvastatin",
        "generic_name": "Atorvastatin Calcium",
        "drug_class": "HMG-CoA Reductase Inhibitor (Statin)",
        "dosage_forms": ["tablet"],
        "strengths": ["10mg", "20mg", "40mg", "80mg"],
        "description": "Cholesterol-lowering medication that reduces risk of stroke and heart attack.",
        "mechanism_of_action": "Selectively inhibits HMG-CoA reductase, enzyme converting HMG-CoA to mevalonate, reducing cholesterol synthesis in the liver.",
        "indications": "High cholesterol (hyperlipidemia), prevention of cardiovascular disease, angina, coronary heart disease.",
        "contraindications": "Active liver disease, unexplained persistent elevations of serum transaminases, pregnancy.",
        "side_effects": {
            "common": ["Joint pain", "Mild muscle ache", "Diarrhea", "Nausea"],
            "rare": ["Elevated liver enzymes"],
            "serious": ["Rhabdomyolysis (severe muscle breakdown)"]
        },
        "precautions": "Take once daily, usually in the evening. Avoid drinking large quantities of grapefruit juice.",
        "elderly_warnings": "Monitor for muscle weakness or pain; report unexplained muscle soreness immediately to doctor.",
        "food_interactions": ["Avoid Grapefruit / Grapefruit juice"],
        "is_otc": False,
        "simple_explanation": "Atorvastatin lowers 'bad' cholesterol (LDL) and triglycerides in your blood to keep your heart and arteries healthy.",
        "search_keywords": ["atorvastatin", "lipitor", "atorva", "cholesterol", "statin", "heart health"]
    },
    {
        "name": "Omeprazole",
        "generic_name": "Omeprazole",
        "drug_class": "Proton Pump Inhibitor (PPI)",
        "dosage_forms": ["capsule", "delayed-release tablet"],
        "strengths": ["10mg", "20mg", "40mg"],
        "description": "Stomach acid reducer used for acid reflux, heartburn, and stomach ulcers.",
        "mechanism_of_action": "Suppresses stomach acid secretion by specific inhibition of the H+/K+ ATPase enzyme system at the secretory surface of gastric parietal cells.",
        "indications": "Gastroesophageal reflux disease (GERD), heartburn, peptic ulcer disease, Zollinger-Ellison syndrome.",
        "contraindications": "Hypersensitivity to omeprazole or substituted benzimidazoles.",
        "side_effects": {
            "common": ["Headache", "Abdominal pain", "Constipation", "Flatulence"],
            "rare": ["Low magnesium levels"],
            "serious": ["Bone fracture risk with long-term use", "C. difficile gut infection"]
        },
        "precautions": "Take 30-60 minutes before breakfast with a glass of water. Swallow whole; do not chew or crush.",
        "elderly_warnings": "Long-term use (>1 year) may increase risk of osteoporosis fractures and Vitamin B12 deficiency.",
        "food_interactions": ["Best taken on empty stomach before breakfast"],
        "is_otc": True,
        "simple_explanation": "Omeprazole calms stomach acid to relieve severe heartburn and acid reflux, allowing your esophagus and stomach lining to heal.",
        "search_keywords": ["omeprazole", "prilosec", "omez", "acid reflux", "heartburn", "acidity", "gas"]
    },
    {
        "name": "Ibuprofen",
        "generic_name": "Ibuprofen",
        "drug_class": "Nonsteroidal Anti-inflammatory Drug (NSAID)",
        "dosage_forms": ["tablet", "capsule", "oral liquid", "gel"],
        "strengths": ["200mg", "400mg", "600mg", "800mg"],
        "description": "Anti-inflammatory pain reliever used for headache, fever, swelling, and joint pain.",
        "mechanism_of_action": "Inhibits COX-1 and COX-2 enzymes, reducing synthesis of inflammatory prostaglandins.",
        "indications": "Mild to moderate pain, fever, swelling, menstrual cramps, arthritis, back pain, dental pain.",
        "contraindications": "Active gastrointestinal bleeding/ulceration, severe heart failure, third trimester pregnancy.",
        "side_effects": {
            "common": ["Stomach irritation", "Heartburn", "Dizziness", "Nausea"],
            "rare": ["Fluid retention / elevated BP"],
            "serious": ["Stomach ulcer bleeding", "Kidney dysfunction", "Cardiovascular events with long-term high dose"]
        },
        "precautions": "Always take with food or milk to protect stomach lining. Use lowest effective dose for shortest duration.",
        "elderly_warnings": "Increased risk of stomach bleeding and kidney strain in elderly; avoid chronic unmonitored use.",
        "food_interactions": ["Alcohol increases stomach bleed risk"],
        "is_otc": True,
        "simple_explanation": "Ibuprofen reduces inflammation, pain, and fever. Always take it with food or milk to prevent stomach upset.",
        "search_keywords": ["ibuprofen", "advil", "motrin", "combiflam", "pain", "swelling", "inflammation"]
    },
    {
        "name": "Cetirizine",
        "generic_name": "Cetirizine Hydrochloride",
        "drug_class": "Second-Generation Antihistamine",
        "dosage_forms": ["tablet", "syrup"],
        "strengths": ["5mg", "10mg", "5mg/5ml"],
        "description": "Non-drowsy allergy relief medication for sneezing, runny nose, and hives.",
        "mechanism_of_action": "Selectively inhibits peripheral histamine H1-receptors, preventing allergic reactions caused by histamine release.",
        "indications": "Allergic rhinitis (hay fever), runny nose, watery eyes, sneezing, hives (urticaria), itching.",
        "contraindications": "Severe renal failure (CrCl < 10 mL/min).",
        "side_effects": {
            "common": ["Mild drowsiness (in some people)", "Dry mouth", "Fatigue"],
            "rare": ["Headache"],
            "serious": ["Hypersensitivity reaction"]
        },
        "precautions": "Take once daily in evening if drowsiness occurs. Use caution when driving until knowing how it affects you.",
        "elderly_warnings": "Dose reduction (5mg daily) recommended if renal function is impaired.",
        "food_interactions": ["Alcohol increases sedative effect"],
        "is_otc": True,
        "simple_explanation": "Cetirizine blocks histamine to stop allergy symptoms like sneezing, runny nose, watery eyes, and skin itching.",
        "search_keywords": ["cetirizine", "zyrtec", "okacet", "allergy", "cold", "sneezing", "hives"]
    },
    {
        "name": "Pantoprazole",
        "generic_name": "Pantoprazole Sodium",
        "drug_class": "Proton Pump Inhibitor (PPI)",
        "dosage_forms": ["delayed-release tablet", "injection"],
        "strengths": ["20mg", "40mg"],
        "description": "Stomach acid suppressant used for severe acidity, GERD, and stomach ulcers.",
        "mechanism_of_action": "Inhibits gastric H+/K+-ATPase pump in parietal cells, shutting down acid production.",
        "indications": "Erosive esophagitis, GERD, gastric ulcers, H. pylori eradication combination therapy.",
        "contraindications": "Hypersensitivity to pantoprazole or other substituted benzimidazoles.",
        "side_effects": {
            "common": ["Headache", "Diarrhea", "Nausea", "Flatulence"],
            "rare": ["Joint pain"],
            "serious": ["Magnesium deficiency", "Bone density decrease with long-term use"]
        },
        "precautions": "Take 30 minutes before morning meal. Do not crush or chew delayed-release tablet.",
        "elderly_warnings": "Monitor calcium and magnesium levels if taken continuously for over 1 year.",
        "food_interactions": ["Take before food"],
        "is_otc": False,
        "simple_explanation": "Pantoprazole shuts down excess stomach acid, giving fast relief from severe acidity and helping stomach ulcers heal.",
        "search_keywords": ["pantoprazole", "protonix", "pantocid", "panto 40", "acidity", "ulcer"]
    },
    {
        "name": "Azithromycin",
        "generic_name": "Azithromycin",
        "drug_class": "Macrolide Antibiotic",
        "dosage_forms": ["tablet", "suspension"],
        "strengths": ["250mg", "500mg", "100mg/5ml", "200mg/5ml"],
        "description": "Short-course antibiotic (usually 3-5 days) for respiratory, skin, and throat infections.",
        "mechanism_of_action": "Binds to 50S ribosomal subunit of susceptible microorganisms, interfering with microbial protein synthesis.",
        "indications": "Bronchitis, pneumonia, sinus infection, strep throat, skin infections, traveler's diarrhea.",
        "contraindications": "History of cholestatic jaundice or hepatic dysfunction with prior azithromycin use.",
        "side_effects": {
            "common": ["Diarrhea", "Stomach cramps", "Nausea"],
            "rare": ["Dizziness"],
            "serious": ["QT prolongation (heart rhythm risk)", "Severe liver toxicity"]
        },
        "precautions": "Take once daily for the exact number of days prescribed. Can be taken with food if stomach is sensitive.",
        "elderly_warnings": "Caution in patients with pre-existing heart rhythm issues (QT prolongation risk).",
        "food_interactions": ["Antacids containing aluminum/magnesium decrease absorption rate"],
        "is_otc": False,
        "simple_explanation": "Azithromycin is a powerful antibiotic usually taken for 3 to 5 days to clear up chest, throat, or sinus infections.",
        "search_keywords": ["azithromycin", "zithromax", "azithral", "azi 500", "antibiotic", "chest infection"]
    },
    {
        "name": "Amlodipine",
        "generic_name": "Amlodipine Besylate",
        "drug_class": "Calcium Channel Blocker",
        "dosage_forms": ["tablet"],
        "strengths": ["2.5mg", "5mg", "10mg"],
        "description": "Blood pressure and chest pain (angina) medication that relaxes coronary arteries.",
        "mechanism_of_action": "Inhibits calcium ion influx across vascular smooth muscle and cardiac muscle, causing peripheral vasodilation.",
        "indications": "Hypertension (high blood pressure), coronary artery disease, chronic stable angina.",
        "contraindications": "Severe hypotension, cardiogenic shock.",
        "side_effects": {
            "common": ["Ankle swelling (edema)", "Flushing", "Dizziness", "Palpitations"],
            "rare": ["Gum enlargement"],
            "serious": ["Severe low blood pressure"]
        },
        "precautions": "Swelling in ankles/feet is common; elevate legs while resting. Take once daily at the same time.",
        "elderly_warnings": "Start at lower dose (2.5mg daily) in elderly patients due to slower clearance.",
        "food_interactions": ["Grapefruit juice may slightly increase concentration"],
        "is_otc": False,
        "simple_explanation": "Amlodipine relaxes your blood vessels so blood flows more easily, lowering high blood pressure and preventing chest pain.",
        "search_keywords": ["amlodipine", "norvasc", "amlong", "amlo 5", "bp", "blood pressure"]
    }
]


async def seed_medicines_if_empty() -> None:
    """
    Check if the MongoDB medicines collection has records.
    If empty, insert the initial comprehensive dataset.
    """
    try:
        count = await MedicineDocument.count()
        if count == 0:
            logger.info(f"🌱 Medicines collection is empty. Seeding {len(INITIAL_MEDICINES_DATASET)} master dataset records...")
            for med_data in INITIAL_MEDICINES_DATASET:
                doc = MedicineDocument(**med_data)
                await doc.insert()
            logger.info("✅ Master medicine dataset successfully seeded into MongoDB Atlas!")
        else:
            logger.info(f"ℹ️ Medicines collection already contains {count} records. Skipping seed.")
    except Exception as e:
        logger.error(f"⚠️ Error seeding medicines collection: {e}")
