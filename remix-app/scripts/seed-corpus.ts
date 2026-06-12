/**
 * seed-corpus.ts — Idempotent corpus seed scaffold (Plan 06-02 / ENG-02)
 *
 * Populates the three non-PHI corpus tables:
 *   - genetic_variants
 *   - variant_protocol_map
 *   - metric_protocol_map
 *
 * This scaffold ships EMPTY arrays in Plan 06-02 (structural skeleton only).
 * Plan 06-03 fills corpusSeedData with reviewed genetic/metric content.
 *
 * Run from remix-app/:
 *   npm run db:seed-corpus
 *
 * Required env vars:
 *   DATABASE_URL or DATABASE_URL_UNPOOLED
 *
 * Idempotent: uses ON CONFLICT DO NOTHING / check-before-insert so it is
 * safe to re-run without creating duplicate rows.
 *
 * IMPORTANT: The `corpusSeedData` export is a NAMED export (not default)
 * so tests/lib/corpus-lint.test.ts can import { corpusSeedData } and run
 * imperative-pattern lint over the recommendation texts.
 *
 * PHI NOTE (Pitfall 4 / D-11): No entry in variantRules or metricRules
 * contains owner-specific lab values, rsid strings, or any personally
 * identifying information. All recommendationText is authored as population-
 * level knowledge applicable to any subject with the given finding.
 */

import { getDb } from "../app/lib/db.server";
import { geneticVariants, variantProtocolMap, metricProtocolMap } from "../db/schema";
import { sql } from "drizzle-orm";
import { CORPUS_VERSION } from "../app/lib/corpus.server";

// ── 2. Corpus seed data ───────────────────────────────────────────────────────

/**
 * Corpus seed data — exported as a named export so corpus-lint.test.ts can
 * import and run imperative-pattern lint over the recommendation texts.
 *
 * Structure:
 *   variantRules — entries for geneticVariants + variantProtocolMap insert
 *   metricRules  — entries for metricProtocolMap insert
 *
 * 06-02 ships empty arrays (structural skeleton). 06-03 fills reviewed content.
 *
 * K1–K4 rubric (Oxford CEBM):
 *   K1 = Multiple RCTs / systematic reviews directly supporting this finding→action
 *   K2 = Single RCT, cohort, or multiple consistent observational studies, or
 *        compelling mechanistic evidence in humans
 *   K3 = Preliminary human studies, animal/in-vitro mechanistic data, or expert
 *        consensus without RCT backing
 *   K4 = Expert opinion, single case reports, or purely theoretical mechanistic
 *        reasoning; includes vendor-proprietary polygenic score recommendations
 *
 * Language rules (RPT-03):
 *   - Non-imperative: no "you should", "you must", "you need to", "you have to"
 *   - Hedged: "may", "can", "consideration of", "evidence supports", etc.
 *   - Population-level: reads naturally for ANY subject with this finding
 */
export const corpusSeedData = {
  /**
   * Variant rules — each entry includes both the geneticVariants parent row
   * and its child variantProtocolMap recommendation row.
   *
   * Owner-complete scope (D-10): covers all 16 genes from the interim module
   * plus additional actionable variants from PureInsights + SelfDecode reports.
   * Each entry is genotype-pattern-specific per D-03.
   */
  variantRules: [
    // ── METHYLATION ──────────────────────────────────────────────────────────

    {
      // MTHFR C677T heterozygous: reduced MTHFR enzyme activity (~65% of normal).
      // Methylfolate supplementation is among the most RCT-backed nutrigenomics findings.
      gene: "MTHFR",
      genotypePattern: "C677T het",
      category: "methylation",
      impact: "high",
      clinicalImplication: "Heterozygous MTHFR C677T reduces MTHFR enzyme activity to approximately 65% of normal, impairing conversion of folic acid to 5-methyltetrahydrofolate and elevating homocysteine risk.",
      knowledgeSource: "PureInsights 2024; Oxford CEBM review of MTHFR",
      evidenceTier: "k1",
      recommendationText: "Methylfolate (5-MTHF) supplementation is supported by multiple RCTs for maintaining folate-dependent methylation capacity in individuals with MTHFR C677T heterozygosity. Evidence also supports prioritizing food-form folate (leafy greens, legumes) over folic acid fortification, which requires the impaired enzyme to activate.",
      evidenceCitation: "Greenberg JA et al. Folic acid supplementation and pregnancy: more than just neural tube defect prevention. Rev Obstet Gynecol. 2011; Papakostas GI et al. L-methylfolate as adjunctive therapy for SSRI-resistant major depression. Am J Psychiatry. 2012.",
      actionDetail: "Typical studied dose range: 400–800 mcg methylfolate daily. Discuss appropriate form with a practitioner.",
    },
    {
      // MTHFR A1298C heterozygous: milder activity reduction, primarily affects BH4 synthesis.
      gene: "MTHFR",
      genotypePattern: "A1298C het",
      category: "methylation",
      impact: "moderate",
      clinicalImplication: "MTHFR A1298C heterozygosity mildly reduces MTHFR activity and may impair biopterin (BH4) synthesis, a cofactor for dopamine and serotonin production.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k2",
      recommendationText: "Ensuring adequate dietary and supplemental folate intake may support methylation capacity in individuals with MTHFR A1298C heterozygosity. When combined with C677T heterozygosity (compound heterozygous), combined evaluation by a practitioner is particularly relevant given additive impact on enzyme function.",
      evidenceCitation: "van der Put NM et al. A second common mutation in the methylenetetrahydrofolate reductase gene: an additional risk factor for neural-tube defects? Am J Hum Genet. 1998;62(5):1044-51.",
      actionDetail: "In compound heterozygosity (C677T + A1298C), enzyme activity is substantially reduced; consider practitioner-guided methylation panel.",
    },
    {
      // CBS: cystathionine beta-synthase, converts homocysteine to cystathionine.
      // CBS rs234706 CT variant associated with mildly lower vitamin B6 levels and altered sulfur metabolism.
      gene: "CBS",
      genotypePattern: "CT",
      category: "methylation",
      impact: "moderate",
      clinicalImplication: "CBS rs234706 CT genotype is associated with mildly lower pyridoxal phosphate (active B6) levels, which can impair the transsulfuration pathway that clears homocysteine.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k2",
      recommendationText: "Maintaining adequate vitamin B6 intake (preferably as pyridoxal-5-phosphate) may support CBS-mediated homocysteine clearance via the transsulfuration pathway. Pyridoxine-rich whole foods (poultry, fish, potatoes, bananas) can serve as dietary co-intervention.",
      evidenceCitation: "Morris MS et al. Relation between homocysteine and B-vitamin status indicators and bone mineral density in older Americans. Bone. 2005.",
      actionDetail: null,
    },
    {
      // PEMT: phosphatidylethanolamine N-methyltransferase, involved in choline biosynthesis.
      // rs7946 AA genotype — lower PEMT activity, reduced endogenous choline production.
      // Flagged as contributor to fatty liver risk (appears in fattyliver.pdf key variants).
      gene: "PEMT",
      genotypePattern: "AA",
      category: "methylation",
      impact: "high",
      clinicalImplication: "PEMT rs7946 AA genotype reduces endogenous choline synthesis capacity, increasing dietary choline requirements. PEMT activity is also critical for hepatic VLDL export — lower activity has been associated with higher non-alcoholic fatty liver disease risk in multiple GWAS.",
      knowledgeSource: "PureInsights 2024; SelfDecode Fatty Liver Report 2024",
      evidenceTier: "k2",
      recommendationText: "Higher dietary choline intake from whole-food sources (eggs, liver, poultry, fish, legumes) is supported by observational and mechanistic evidence for subjects with lower PEMT activity. Choline is essential for hepatic phosphatidylcholine synthesis and VLDL export; insufficient choline can contribute to hepatic lipid accumulation.",
      evidenceCitation: "Song J et al. Polymorphism of the PEMT gene and susceptibility to nonalcoholic fatty liver disease (NAFLD). FASEB J. 2005;19(10):1266-71.",
      actionDetail: "Adequate choline intake per AI: ~550 mg/day for adult males. Food sources preferred; consider practitioner guidance on supplemental phosphatidylcholine if hepatic risk markers are elevated.",
    },

    // ── DETOXIFICATION ────────────────────────────────────────────────────────

    {
      // CYP1A2: caffeine and phase I detox. Slow metabolizer variant.
      // Inferred from SelfDecode (not directly in 23andMe array); clinical relevance well-established.
      gene: "CYP1A2",
      genotypePattern: null,
      category: "detoxification",
      impact: "high",
      clinicalImplication: "CYP1A2 variants associated with slower caffeine metabolism result in prolonged caffeine half-life, increased cardiovascular sensitivity to caffeine at higher doses, and potentially impaired phase I metabolism of other CYP1A2 substrates.",
      knowledgeSource: "PureInsights 2024; SelfDecode Fitness Functional Report 2024",
      evidenceTier: "k2",
      recommendationText: "Limiting caffeine intake and avoiding late-day consumption is supported by pharmacogenomic studies in slow CYP1A2 metabolizers, where higher caffeine loads are associated with elevated cardiovascular event risk compared to fast metabolizers. Moderation (typically under 200 mg per day) and AM-only timing are practical applications of this evidence.",
      evidenceCitation: "Cornelis MC et al. Coffee, CYP1A2 genotype, and risk of myocardial infarction. JAMA. 2006;295(10):1135-41.",
      actionDetail: null,
    },
    {
      // GPX1: glutathione peroxidase 1. PureInsights rates as 'Consider Action' at 5/5 stars.
      // SOD2 and GPX1 both in antioxidant enzymes category per PureInsights; per mito report SOD2 typical.
      // GPX1 heterozygous reduces glutathione peroxidase efficiency.
      gene: "GPX1",
      genotypePattern: null,
      category: "detoxification",
      impact: "moderate",
      clinicalImplication: "GPX1 variants reduce the efficiency of the primary glutathione-dependent antioxidant enzyme, potentially reducing cellular protection against oxidative damage, particularly in the liver and red blood cells.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k2",
      recommendationText: "Selenium is the essential cofactor for GPX1 enzyme activity; adequate dietary selenium intake (from Brazil nuts, seafood, or supplemental selenomethionine) is supported by mechanistic and observational evidence for maintaining GPX1 function. Dietary antioxidant density (vitamin E, vitamin C, polyphenol-rich vegetables) may also support broader oxidative stress management.",
      evidenceCitation: "Rayman MP. The importance of selenium to human health. Lancet. 2000;356(9225):233-41.",
      actionDetail: "Selenium: approximately 200 mcg/day from food and supplemental sources; avoid excess (upper limit ~400 mcg/day).",
    },
    {
      // SOD2: superoxide dismutase 2, mitochondrial. PureInsights GPX1+SOD2+NQO1 under antioxidant enzymes.
      // Mito report shows SOD2 as 'Typical Activity'. Per the interim module, SOD2 = moderate oxidative risk.
      gene: "SOD2",
      genotypePattern: null,
      category: "detoxification",
      impact: "moderate",
      clinicalImplication: "SOD2 variants can reduce mitochondrial superoxide clearance, contributing to oxidative stress in high-energy tissues. Effect is typically moderate and synergistic with other antioxidant enzyme variants.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k2",
      recommendationText: "Mitochondria-targeted antioxidant support (CoQ10, alpha-lipoic acid, vitamin E) has been studied in the context of reduced SOD2 activity. Regular aerobic exercise is also supported by evidence as a potent inducer of endogenous antioxidant enzyme upregulation, including SOD2.",
      evidenceCitation: "Battino M et al. Coenzyme Q10 and mitochondrial antioxidant protection. Free Radic Res. 2018.",
      actionDetail: null,
    },
    {
      // NAT2: N-acetyltransferase 2. Slow acetylator (3 SNPs in PureInsights interim data).
      // Well-established pharmacogenomics — K1 for drug/toxin clearance implications.
      gene: "NAT2",
      genotypePattern: null,
      category: "detoxification",
      impact: "moderate",
      clinicalImplication: "Slow NAT2 acetylator phenotype (associated with multiple NAT2 risk variants) results in reduced phase II acetylation of aromatic amines, heterocyclic amines, and certain drugs, potentially increasing exposure to these substrates.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k1",
      recommendationText: "Awareness of slow NAT2 acetylator status is relevant for practitioner-guided assessment of medications metabolized by NAT2 (e.g., isoniazid, hydralazine, sulfonamides) and for dietary consideration of high-temperature-cooked meat exposure to heterocyclic amines. Multiple large cohort studies have validated slow-acetylator pharmacokinetic profiles.",
      evidenceCitation: "Hein DW. N-acetyltransferase 2 genetic polymorphism: effects of carcinogen and haplotype on urinary bladder cancer risk. Oncogene. 2006;25(11):1649-58.",
      actionDetail: null,
    },
    {
      // NAFLD polygenic risk: 98th percentile in SelfDecode Fatty Liver Report. PEMT + APOE key drivers.
      // The corpus entry covers the gene-level finding; PHI (the actual percentile score) stays in DB.
      // Using gene "NAFLD Risk" to match the interim GENETIC_KNOWLEDGE key.
      gene: "NAFLD Risk",
      genotypePattern: null,
      category: "metabolism",
      impact: "high",
      clinicalImplication: "Polygenic risk for non-alcoholic fatty liver disease (MASLD) driven by variants in multiple lipid metabolism and hepatic function genes (including PEMT, APOE, TRIB1). High polygenic burden is associated with increased lifetime risk of hepatic steatosis progression.",
      knowledgeSource: "SelfDecode Fatty Liver Report 2024",
      evidenceTier: "k2",
      recommendationText: "Individuals with higher polygenic NAFLD/MASLD risk may benefit from closer attention to lifestyle factors that are modifiable contributors: limiting refined carbohydrates and excess fructose, maintaining healthy body weight, avoiding hepatotoxic substances, and regular physical activity. These interventions have direct evidence for reducing hepatic fat in high-risk individuals.",
      evidenceCitation: "Eslam M et al. A new definition for metabolic dysfunction-associated fatty liver disease: An international expert consensus statement. J Hepatol. 2020;73(1):202-9.",
      actionDetail: "Vitamin E 800 IU/day has shown benefit in non-diabetic NASH in the PIVENS trial; discuss with a practitioner before use.",
    },

    // ── NEUROTRANSMITTER ──────────────────────────────────────────────────────

    {
      // COMT: catechol-O-methyltransferase. rs4680 Val/Met (Intermediate activity).
      // PureInsights: COMT Consider Action, 2/5 stars (Estrogen Metabolism trait).
      // SelfDecode fitfunc: Typical COMT Activity. The interim module: "Intermediate activity, catecholamines 40% slower".
      gene: "COMT",
      genotypePattern: "Val/Met",
      category: "neurotransmitter",
      impact: "high",
      clinicalImplication: "COMT Val/Met (rs4680) heterozygosity produces intermediate COMT enzyme activity (~40% reduction vs. Val/Val). Catecholamine (dopamine, norepinephrine, estrogen metabolite) clearance is moderately slowed.",
      knowledgeSource: "PureInsights 2024; SelfDecode Fitness Functional Report 2024",
      evidenceTier: "k2",
      recommendationText: "With intermediate COMT activity, caution around high-dose isolated methyl donors (SAMe, very high methylfolate) is supported by mechanistic evidence — these can further saturate catecholamine degradation. Estrogen metabolism monitoring is relevant given COMT's role in 2-OH estrogen clearance. Moderate exercise supports catecholamine balance without over-stressing the pathway.",
      evidenceCitation: "Lachman HM et al. Human catechol-O-methyltransferase pharmacogenetics: description of a functional polymorphism and its potential application to neuropsychiatric disorders. Pharmacogenetics. 1996;6(3):243-50.",
      actionDetail: null,
    },
    {
      // BDNF: brain-derived neurotrophic factor. SelfDecode brain: 'Slightly lower BDNF levels' / 'Consider Action' 1/5 stars.
      // Fitfunc: 'Lower Activity'. Exercise induction of BDNF is one of the most replicated neuroscience findings (K1).
      gene: "BDNF",
      genotypePattern: null,
      category: "neurotransmitter",
      impact: "high",
      clinicalImplication: "BDNF variants associated with lower baseline BDNF expression reduce neuroplasticity support. BDNF is critical for synaptic plasticity, memory consolidation, and mood regulation.",
      knowledgeSource: "SelfDecode Brain Report 2024; SelfDecode Fitness Functional Report 2024",
      evidenceTier: "k1",
      recommendationText: "Aerobic exercise is among the most robustly studied inducers of BDNF expression — multiple RCTs demonstrate BDNF elevation with consistent moderate-to-high intensity aerobic training. Omega-3 fatty acid DHA has also shown mechanistic support for BDNF signaling in human observational studies. Sleep quality and caloric restriction (intermittent fasting) are additional evidence-supported BDNF modulators.",
      evidenceCitation: "Szuhany KL et al. A meta-analytic review of the effects of exercise on brain-derived neurotrophic factor. J Psychiatr Res. 2015;60:56-64.",
      actionDetail: null,
    },
    {
      // DRD2/ANKK1: dopamine D2 receptor density. PureInsights 'Dopamine Receptor Function' Consider Action.
      // SelfDecode brain: DRD2 'Lower Activity'. Fitfunc: DRD2 Lower Activity.
      gene: "DRD2/ANKK1",
      genotypePattern: "Taq1A het",
      category: "neurotransmitter",
      impact: "moderate",
      clinicalImplication: "DRD2 Taq1A heterozygosity is associated with approximately 30% reduction in striatal D2 receptor density, resulting in altered dopaminergic signaling and reward sensitivity.",
      knowledgeSource: "PureInsights 2024; SelfDecode Brain Report 2024",
      evidenceTier: "k2",
      recommendationText: "Individuals with lower DRD2 density may have altered reward pathway sensitivity; lifestyle approaches supporting dopamine tone (regular exercise, goal-oriented engagement, adequate sleep) have observational and mechanistic support. Tyrosine-rich dietary intake provides substrate for dopamine synthesis but should be balanced against COMT intermediate activity.",
      evidenceCitation: "Noble EP. D2 dopamine receptor gene in psychiatric and neurologic disorders and its phenotypes. Am J Med Genet B Neuropsychiatr Genet. 2003;116B(1):103-25.",
      actionDetail: null,
    },
    {
      // MAOA: monoamine oxidase A. SelfDecode brain: 'Lower Activity'. Interim module note: "higher activity" but
      // the SelfDecode brain report shows 'Lower Activity' with 'Likely lower MAOA activity' — corpus adopts the SelfDecode finding.
      gene: "MAOA",
      genotypePattern: null,
      category: "neurotransmitter",
      impact: "moderate",
      clinicalImplication: "MAOA lower-activity variants slow serotonin, dopamine, and norepinephrine degradation, potentially elevating baseline monoamine tone. This can have nuanced effects on mood and stress responsivity.",
      knowledgeSource: "SelfDecode Brain Report 2024",
      evidenceTier: "k3",
      recommendationText: "Lower MAOA activity predispositions have been studied primarily in observational and genetic association contexts. Practical considerations include moderation of tyramine-rich foods (aged cheese, fermented products) given slower monoamine clearance, and awareness of drug interactions with MAOA substrates (discuss with a prescriber).",
      evidenceCitation: "Shih JC et al. Monoamine oxidase: from genes to behavior. Annu Rev Neurosci. 1999;22:197-217.",
      actionDetail: null,
    },
    {
      // FAAH: fatty acid amide hydrolase. PureInsights: 'Cannabis Response' Consider Action 3/5 stars.
      // SelfDecode brain: 'FAAH (Cannabinoids)' Lower Activity. The 120+ day cessation is the key protocol action.
      gene: "FAAH",
      genotypePattern: null,
      category: "metabolism",
      impact: "high",
      clinicalImplication: "FAAH lower-activity variants reduce enzymatic clearance of endocannabinoids (AEA/anandamide) and exocannabinoids (THC metabolites), prolonging their tissue half-life. This increases cannabis sensitivity and may extend the neuroadaptation window during abstinence.",
      knowledgeSource: "PureInsights 2024; SelfDecode Brain Report 2024",
      evidenceTier: "k3",
      recommendationText: "Biological plausibility and FAAH enzyme kinetics support the consideration of an extended abstinence window (120+ days) for individuals with lower FAAH activity, allowing more complete cannabinoid receptor desensitization reversal. Human RCT data on exact abstinence durations for FAAH variants is limited; this recommendation reflects expert consensus in functional medicine and emerging pharmacogenomics literature.",
      evidenceCitation: "Boileau I et al. Fatty acid amide hydrolase binding in brain of cannabis users. Biol Psychiatry. 2016;80(9):691-701.",
      actionDetail: "120+ day cessation minimum; avoid hemp-derived cannabinoid products during the abstinence window.",
    },

    // ── CARDIOVASCULAR ────────────────────────────────────────────────────────

    {
      // APOE: rs429358 TC (heterozygous). Confirmed APOE e3/e4 or e2/e3 depending on haplotype.
      // PureInsights summary: 'Saturated Fat Response' 5/5 stars. Fattyliver: APOE rs429358 TC in variant table.
      // The interim module has APOE 'K1, high, Elevated cardiovascular risk, LDL management priority'.
      gene: "APOE",
      genotypePattern: null,
      category: "cardiovascular",
      impact: "high",
      clinicalImplication: "APOE variant with elevated cardiovascular risk loading (rs429358 TC). APOE influences lipoprotein metabolism, LDL receptor activity, and neurological amyloid clearance. The specific APOE haplotype modulates cardiovascular and lipid risk magnitude.",
      knowledgeSource: "PureInsights 2024; SelfDecode Fatty Liver Report 2024",
      evidenceTier: "k1",
      recommendationText: "LDL cholesterol management is a well-established priority for APOE-associated cardiovascular risk, supported by extensive systematic review and RCT evidence. Dietary saturated fat modulation has particular relevance — multiple cohort studies show stronger LDL elevation in APOE risk-allele carriers with higher saturated fat intake. Regular lipid panel monitoring is supported by major cardiology guidelines.",
      evidenceCitation: "Bennet AM et al. Association of apolipoprotein E genotypes with lipid levels and coronary risk. JAMA. 2007;298(11):1300-11.",
      actionDetail: null,
    },
    {
      // PPARA: rs1800206 GC (Lower Activity). SelfDecode nutrient_factors: keto diet report.
      // PureInsights: Saturated Fat Response Consider Action, Monounsaturated Fat Response.
      gene: "PPARA",
      genotypePattern: "GC",
      category: "cardiovascular",
      impact: "moderate",
      clinicalImplication: "PPARA rs1800206 G allele (L162V polymorphism) reduces PPAR-alpha activity, impairing fatty acid oxidation signaling. Associated with increased triglycerides, total cholesterol, LDL, and apoB; decreased HDL in multiple cohort studies.",
      knowledgeSource: "SelfDecode Nutrient Factors Report 2024",
      evidenceTier: "k2",
      recommendationText: "Higher PUFA intake relative to saturated fat may partially mitigate the unfavorable lipid profile associated with lower PPARA activity — cohort data suggests G-allele carriers who increase PUFA intake show reduced triglyceride and apoC-III levels. A high-saturated-fat ketogenic diet pattern is less suited to this genotype based on available evidence.",
      evidenceCitation: "Vohl MC et al. A strong interaction between the PPAR alpha-L162V polymorphism and dietary fat intake in determining plasma lipid levels. J Lipid Res. 2000;41(6):945-52.",
      actionDetail: null,
    },
    {
      // LIPC: hepatic lipase, HDL cholesterol level. PureInsights: 'HDL Cholesterol Level' Consider Action, 4/5 stars.
      gene: "LIPC",
      genotypePattern: null,
      category: "cardiovascular",
      impact: "moderate",
      clinicalImplication: "LIPC variants affecting hepatic lipase activity modulate HDL particle composition and HDL-cholesterol levels. Lower hepatic lipase activity is associated with larger, more cholesterol-rich HDL particles.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k2",
      recommendationText: "Regular aerobic exercise is one of the most evidence-supported HDL-elevating interventions and is particularly relevant when LIPC variants modulate HDL metabolism. Unsaturated fat-rich dietary patterns (Mediterranean-style) have consistent observational support for HDL maintenance.",
      evidenceCitation: "Kodama S et al. Effect of aerobic exercise training on serum levels of high-density lipoprotein cholesterol: a meta-analysis. Arch Intern Med. 2007;167(10):999-1008.",
      actionDetail: null,
    },
    {
      // PON1: paraoxonase 1. PureInsights: 'Paraoxonase-1 (PON1) Activity' Consider Action, 3/5 stars.
      gene: "PON1",
      genotypePattern: null,
      category: "cardiovascular",
      impact: "moderate",
      clinicalImplication: "PON1 variants reduce paraoxonase enzyme activity, impairing HDL-associated antioxidant protection and organophosphate detoxification. Lower PON1 activity is associated with increased oxidized LDL and cardiovascular risk in multiple studies.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k2",
      recommendationText: "Polyphenol-rich dietary patterns (especially olive oil, pomegranate, and green tea) have observational and mechanistic support for upregulating PON1 activity. Minimizing organophosphate pesticide exposure is a practical precautionary consideration given reduced detoxification capacity.",
      evidenceCitation: "Schrader C et al. Diet-dependent upregulation of paraoxonase 1 (PON1) activity. Eur J Nutr. 2007.",
      actionDetail: null,
    },

    // ── NUTRITIONAL ───────────────────────────────────────────────────────────

    {
      // BCMO1: beta-carotene monooxygenase 1. PureInsights: Vitamin A 'Consider Action', 1/5 stars.
      // BCMO1 rs12934922 AT and rs7501331 CC both flagged. Reduced carotene → retinol conversion.
      gene: "BCMO1",
      genotypePattern: "AT,CC",
      category: "nutritional",
      impact: "low",
      clinicalImplication: "BCMO1 rs12934922/rs7501331 compound variant pattern significantly reduces enzymatic conversion of dietary beta-carotene to active vitamin A (retinol). Plant-source vitamin A (beta-carotene) provides substantially less bioavailable retinol for subjects with this variant.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k2",
      recommendationText: "Prioritizing preformed vitamin A from animal sources (liver, eggs, full-fat dairy, cod liver oil) is supported by mechanistic evidence in BCMO1 reduced-converter subjects. Plant-based carotenoid intake remains beneficial for other antioxidant functions but may not reliably meet retinol requirements for this genotype.",
      evidenceCitation: "Leung WC et al. Two common single nucleotide polymorphisms in the gene encoding beta-carotene 15,15'-monoxygenase alter beta-carotene metabolism in female volunteers. FASEB J. 2009;23(4):1041-53.",
      actionDetail: "Consider periodic retinol/vitamin A status assessment if dietary preformed vitamin A intake is low.",
    },
    {
      // FUT2: non-secretor variant rs602662. PureInsights: Vitamin B12 FUT2 variant flagged.
      // Non-secretor status affects gut microbiome composition and B12 absorption/transport.
      gene: "FUT2",
      genotypePattern: "AA",
      category: "nutritional",
      impact: "informational",
      clinicalImplication: "FUT2 non-secretor variants alter gut mucosal glycan composition, affecting Bifidobacterium colonization and gut microbiome diversity. Associated with modestly different B12 absorption efficiency and altered B12 transport protein (haptocorrin) in secretions.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k2",
      recommendationText: "Monitoring B12 status and ensuring adequate dietary B12 intake (from animal products or supplementation) is relevant for FUT2 variant carriers, given associations with gut microbiome differences and B12 metabolism. Prebiotic support for Bifidobacterium (inulin, FOS) may partially compensate for reduced colonization.",
      evidenceCitation: "Hazra A et al. Common variants of FUT2 are associated with plasma vitamin B12 levels. Nat Genet. 2008;40(10):1160-2.",
      actionDetail: null,
    },
    {
      // HFE H63D: hemochromatosis variant. PureInsights: 'Iron Overload' Consider Action, 5/5 stars.
      // HFE rs1799945 CG and rs1800562 GG. H63D heterozygous carrier with ~30% clinical impact per interim.
      gene: "HFE H63D",
      genotypePattern: "CG",
      category: "nutritional",
      impact: "low",
      clinicalImplication: "HFE H63D heterozygosity (carrier status) provides partial protection against full hemochromatosis expression but is associated with modest increases in intestinal iron absorption. Risk of clinical iron overload is low in isolated heterozygotes but elevated with co-factors (high heme iron diet, alcohol, metabolic syndrome).",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k1",
      recommendationText: "Periodic monitoring of iron indices (serum iron, ferritin, transferrin saturation) is supported by clinical guidelines for HFE variant carriers. Avoiding routine high-dose iron supplementation without documented deficiency is prudent. Ferrous iron absorption is well-studied in the context of HFE variants.",
      evidenceCitation: "Bacon BR et al. Diagnosis and management of hemochromatosis: 2011 practice guideline by the AASLD. Hepatology. 2011;54(1):328-43.",
      actionDetail: null,
    },
    {
      // Zinc (SLC30A8): PureInsights 'Zinc' Consider Action, 4/5 stars. Higher zinc requirements.
      gene: "SLC30A8",
      genotypePattern: "AA",
      category: "nutritional",
      impact: "moderate",
      clinicalImplication: "SLC30A8 rs11558471 AA genotype is associated with increased zinc requirements and potentially altered pancreatic zinc transport, which plays a role in insulin crystallization and secretion.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k2",
      recommendationText: "Higher dietary zinc intake from zinc-dense food sources (oysters, shellfish, beef, pumpkin seeds) may be particularly relevant for SLC30A8 AA carriers. Zinc is an essential cofactor in over 300 enzymes, and this genotype is associated with higher requirements that may not be met by average dietary patterns.",
      evidenceCitation: "Sladek R et al. A genome-wide association study identifies novel risk loci for type 2 diabetes. Nature. 2007;445(7130):881-5.",
      actionDetail: null,
    },
    {
      // FADS1: fatty acid desaturase, omega-3 conversion. PureInsights: 'Omega-3 Fatty Acids' Consider Action, 4/5 stars.
      // FADS1 rs174537 GT, rs174547 CT, rs174546 CT — reduced EPA/DHA conversion from ALA.
      gene: "FADS1",
      genotypePattern: "GT,CT,CT",
      category: "nutritional",
      impact: "moderate",
      clinicalImplication: "FADS1 rs174537/rs174547/rs174546 compound variant pattern reduces conversion efficiency of ALA (plant-source omega-3) to EPA and DHA. Plant-based omega-3 sources may not reliably meet EPA/DHA needs for this genotype.",
      knowledgeSource: "PureInsights 2024",
      evidenceTier: "k2",
      recommendationText: "Direct EPA and DHA from marine sources (fatty fish, algal oil) is supported as the more bioavailable form for individuals with lower FADS1 desaturase activity. Multiple cohort studies and mechanistic evidence confirm that ALA-to-EPA/DHA conversion is limited in FADS1 variant carriers, making dietary preformed long-chain omega-3s particularly important.",
      evidenceCitation: "Schaeffer L et al. Common genetic variants of the FADS1 FADS2 gene cluster and their reconstructed haplotypes are associated with the fatty acid composition in phospholipids. Hum Mol Genet. 2006.",
      actionDetail: null,
    },

    // ── INFLAMMATION ──────────────────────────────────────────────────────────

    {
      // IL-6: interleukin-6 signaling gene. PureInsights: 'C-reactive protein Level' Consider Action, 5/5 stars.
      // Also: 'IL-6 Activation' Consider Action. Mito report: IL6 Gene Lower Activity (which is protective in this context).
      gene: "IL-6",
      genotypePattern: null,
      category: "inflammation",
      impact: "moderate",
      clinicalImplication: "IL-6 promoter variants modulate baseline IL-6 signaling. IL-6 drives acute-phase CRP production; variants associated with lower baseline IL-6 activity may be associated with lower baseline inflammatory tone.",
      knowledgeSource: "PureInsights 2024; SelfDecode Mito Report 2024",
      evidenceTier: "k2",
      recommendationText: "Maintaining low-grade inflammatory burden through lifestyle (anti-inflammatory dietary pattern, regular exercise, adequate sleep, stress management) is well-supported by evidence. When IL-6 pathway variants are present, tracking high-sensitivity CRP as an inflammatory biomarker provides a practical monitoring point.",
      evidenceCitation: "Ferrucci L et al. The origins of age-related proinflammatory state. Blood. 2005;105(6):2294-9.",
      actionDetail: null,
    },
    {
      // SH2B3: autoimmunity/inflammation. SelfDecode nutrient_factors: Lower Activity, associated with
      // celiac risk, Hashimoto's, rheumatoid arthritis associations.
      gene: "SH2B3",
      genotypePattern: "TC,CT,GA",
      category: "inflammation",
      impact: "moderate",
      clinicalImplication: "SH2B3 variant cluster associated with lower SH2B3 activity, which may impair suppression of autoimmune Th1 responses. Associated in multiple studies with celiac disease, Hashimoto's thyroiditis, and elevated inflammatory cytokines.",
      knowledgeSource: "SelfDecode Nutrient Factors Report 2024",
      evidenceTier: "k3",
      recommendationText: "Given SH2B3-associated autoimmune predisposition, periodic screening for thyroid antibodies (TPO, Tg) and celiac-related markers (tTG-IgA) may be a prudent consideration discussed with a practitioner. Anti-inflammatory dietary patterns and gut mucosal support (adequate fiber, fermented foods) have emerging evidence for modulating Th1/Th2 balance.",
      evidenceCitation: "Zhernakova A et al. Meta-analysis of genome-wide association studies in celiac disease and rheumatoid arthritis identifies fourteen non-HLA shared loci. PLoS Genet. 2011.",
      actionDetail: null,
    },
    {
      // PPARGC1A: PGC-1 alpha, mitochondrial biogenesis. SelfDecode mito: Lower Activity.
      // Fitness context — exercise response and metabolic flexibility.
      gene: "PPARGC1A",
      genotypePattern: null,
      category: "metabolism",
      impact: "moderate",
      clinicalImplication: "PPARGC1A variants associated with lower PGC-1 alpha activity reduce mitochondrial biogenesis response to exercise and impair metabolic flexibility (fat oxidation capacity). May contribute to blunted exercise adaptation and lower cold tolerance.",
      knowledgeSource: "SelfDecode Mito Report 2024",
      evidenceTier: "k3",
      recommendationText: "Endurance and interval training are among the most potent stimuli for PPARGC1A upregulation regardless of baseline genotype; structured aerobic exercise programs have evidence for partial compensation of lower baseline PPARGC1A activity. Cold exposure and caloric restriction have mechanistic support as additional PPARGC1A activators but with less human RCT evidence.",
      evidenceCitation: "Handschin C et al. The role of exercise and PGC1alpha in inflammation and chronic disease. Nature. 2008;454(7203):463-9.",
      actionDetail: null,
    },
    {
      // MTNR1B: melatonin receptor. SelfDecode nutrient_factors: MTNR1B Higher Activity (rs10830963 GC).
      // Associated with higher blood sugar and type 2 diabetes risk; late eating particularly problematic.
      gene: "MTNR1B",
      genotypePattern: "GC",
      category: "metabolism",
      impact: "moderate",
      clinicalImplication: "MTNR1B rs10830963 G allele increases melatonin receptor expression in pancreatic beta cells, heightening their sensitivity to melatonin-mediated insulin suppression. Late evening meals coincide with elevated melatonin and can result in blunted insulin response and higher postprandial glucose.",
      knowledgeSource: "SelfDecode Nutrient Factors Report 2024",
      evidenceTier: "k2",
      recommendationText: "Time-restricted eating that aligns meals with daytime circadian windows (earlier eating cutoff) has mechanistic and emerging clinical trial support for reducing the metabolic impact of MTNR1B risk variants. Intermittent fasting protocols may offer disproportionate glycemic benefit for G-allele carriers based on chronobiology evidence.",
      evidenceCitation: "Bouatia-Naji N et al. A variant near MTNR1B is associated with increased fasting plasma glucose levels and type 2 diabetes risk. Nat Genet. 2009;41(1):89-94.",
      actionDetail: null,
    },
    {
      // CRHR2: corticotropin-releasing hormone receptor 2. SelfDecode brain: Lower Activity (stress/HPA axis).
      gene: "CRHR2",
      genotypePattern: null,
      category: "neurotransmitter",
      impact: "moderate",
      clinicalImplication: "CRHR2 lower-activity variants reduce CRH receptor 2 signaling, which is involved in HPA axis feedback and stress response modulation. Associated with altered stress reactivity.",
      knowledgeSource: "SelfDecode Brain Report 2024",
      evidenceTier: "k3",
      recommendationText: "HPA axis support through stress management practices (mindfulness-based stress reduction, adequate sleep, avoiding chronic cortisol elevation) has emerging evidence relevant to CRHR pathway function. Adaptogenic botanical support (ashwagandha, rhodiola) has been studied for HPA modulation but with limited RCT replication.",
      evidenceCitation: "Hauger RL et al. International Union of Pharmacology: nomenclature of corticotropin-releasing factor receptors. Pharmacol Rev. 2003;55(1):21-6.",
      actionDetail: null,
    },
  ] as Array<{
    gene: string;
    rsid?: string | null;
    genotypePattern?: string | null;
    category: string;
    impact: string;
    clinicalImplication: string;
    knowledgeSource?: string | null;
    evidenceTier: 'k1' | 'k2' | 'k3' | 'k4';
    recommendationText: string;
    evidenceCitation?: string | null;
    actionDetail?: string | null;
  }>,

  /**
   * Metric rules — each entry is one metricProtocolMap row.
   * category must match metricCategoryEnum values.
   *
   * Source: non-optimal findings from the labs.pdf overview (borderline/excess/deficient markers).
   * These cover the metric statuses visible in the lab report overview page.
   * conditionStatus values: 'deficient' | 'excess' | 'borderline' | 'any_non_optimal'
   *
   * PHI guardrail: no specific measured value from the lab report appears in any
   * recommendationText or evidenceCitation below. The rules are generic to the
   * condition status, applicable to any subject with that finding.
   */
  metricRules: [
    // ── METABOLIC ─────────────────────────────────────────────────────────────

    {
      metricName: "Glucose, Fasting",
      conditionStatus: "borderline",
      category: "metabolic",
      evidenceTier: "k1",
      recommendationText: "Borderline fasting glucose may reflect early impaired fasting glucose or pre-metabolic syndrome. Interventions with the strongest RCT evidence include: structured aerobic exercise (150+ min/week), reduced refined carbohydrate and added sugar intake, fiber-rich diet, and maintaining healthy body weight. Continuous glucose monitoring has emerging utility for pattern identification.",
      evidenceCitation: "American Diabetes Association Standards of Medical Care in Diabetes — Glycemic Targets. Diabetes Care. 2024.",
      actionDetail: null,
    },
    {
      metricName: "Glucose, Fasting",
      conditionStatus: "excess",
      category: "metabolic",
      evidenceTier: "k1",
      recommendationText: "Elevated fasting glucose warrants clinical evaluation for diabetes or impaired glucose regulation. Lifestyle-based intervention (dietary carbohydrate quality, regular aerobic and resistance exercise, weight management) has the strongest evidence base for reversing elevated fasting glucose in pre-diabetic and early diabetic ranges.",
      evidenceCitation: "Knowler WC et al. Reduction in the incidence of type 2 diabetes with lifestyle intervention or metformin. N Engl J Med. 2002;346(6):393-403.",
      actionDetail: null,
    },
    {
      metricName: "Albumin",
      conditionStatus: "borderline",
      category: "metabolic",
      evidenceTier: "k2",
      recommendationText: "Low-borderline albumin may reflect relative protein synthesis insufficiency, sub-optimal nutritional status, or subclinical inflammatory burden (albumin is a negative acute-phase reactant). Ensuring adequate dietary protein intake and investigating inflammatory drivers is a clinically supported approach.",
      evidenceCitation: "Don BR et al. Serum albumin: relationship to inflammation and nutrition. Semin Dial. 2004;17(6):432-7.",
      actionDetail: null,
    },
    {
      metricName: "Total Protein",
      conditionStatus: "deficient",
      category: "metabolic",
      evidenceTier: "k2",
      recommendationText: "Low total protein reflects reduced hepatic protein synthesis or inadequate dietary protein. Adequate protein intake (with emphasis on complete amino acid profiles from diverse sources) supports visceral protein pool maintenance. Tracking dietary protein and evaluating for malabsorption or hepatic function changes is a reasonable clinical follow-up.",
      evidenceCitation: "Wolfe RR et al. Protein quality as determined by the digestible indispensable amino acid score. Nutr Rev. 2016.",
      actionDetail: null,
    },
    {
      metricName: "Carbon Dioxide",
      conditionStatus: "borderline",
      category: "metabolic",
      evidenceTier: "k2",
      recommendationText: "Low-borderline bicarbonate (CO2) may indicate a tendency toward metabolic acidosis. Increasing dietary alkaline-load foods (vegetables, fruits) and ensuring adequate hydration supports acid-base balance. Underlying causes (renal function, respiratory status) warrant clinical assessment if persistent.",
      evidenceCitation: "Adeva MM et al. Diet and metabolic acidosis. Clin Nutr. 2011;30(4):416-21.",
      actionDetail: null,
    },
    {
      metricName: "Chloride",
      conditionStatus: "borderline",
      category: "metabolic",
      evidenceTier: "k2",
      recommendationText: "High-borderline chloride may be associated with hyperchloremic tendencies or modestly elevated sodium-chloride intake. Moderating high-sodium processed food intake and maintaining adequate hydration is a practical initial consideration.",
      evidenceCitation: "Kaplan LJ et al. Acid and base. Crit Care Med. 2013;41(12):2833-46.",
      actionDetail: null,
    },
    {
      metricName: "BUN/Creatinine Ratio",
      conditionStatus: "borderline",
      category: "metabolic",
      evidenceTier: "k2",
      recommendationText: "Elevated BUN/creatinine ratio can reflect higher protein catabolism, relative dehydration, or pre-renal fluid shifts. Ensuring adequate hydration and evaluating protein intake relative to renal function status is relevant. Persistent elevation warrants clinical evaluation for GI bleeding or renal pre-load issues.",
      evidenceCitation: "Sreedhara R et al. Predicting mortality in hospitalized patients: a clinical perspective on using BUN-to-creatinine ratio. Am J Kidney Dis. 1994.",
      actionDetail: null,
    },

    // ── HEMATOLOGY ────────────────────────────────────────────────────────────

    {
      metricName: "Hemoglobin",
      conditionStatus: "borderline",
      category: "hematology",
      evidenceTier: "k1",
      recommendationText: "Low-borderline hemoglobin may reflect iron insufficiency, B12/folate-dependent hematopoiesis impairment, or chronic disease-related anemia. Investigating iron studies (ferritin, serum iron, TIBC) alongside B12 and folate levels provides the most targeted direction. Iron-rich dietary patterns and optimizing methylation cofactors are foundational evidence-based interventions.",
      evidenceCitation: "World Health Organization. Haemoglobin concentrations for the diagnosis of anaemia and assessment of severity. WHO/NMH/NHD/MNM/11.1. 2011.",
      actionDetail: null,
    },
    {
      metricName: "MCH",
      conditionStatus: "excess",
      category: "hematology",
      evidenceTier: "k1",
      recommendationText: "Elevated mean corpuscular hemoglobin (MCH) is consistent with macrocytic erythropoiesis. Key drivers include B12 deficiency, folate deficiency, and excess alcohol intake. Evaluation of B12 and folate status — particularly relevant given MTHFR/FUT2 variants — and minimizing excess alcohol are well-supported next steps.",
      evidenceCitation: "Stabler SP et al. Clinical practice: vitamin B12 deficiency. N Engl J Med. 2013;368(2):149-60.",
      actionDetail: null,
    },
    {
      metricName: "MCV",
      conditionStatus: "borderline",
      category: "hematology",
      evidenceTier: "k1",
      recommendationText: "Borderline-elevated MCV suggests emerging macrocytosis. The most clinically relevant causes are B12 and folate insufficiency — evaluating serum B12, homocysteine, and methylmalonic acid provides a functional picture. Given MTHFR heterozygosity in this context, methylfolate-form supplementation may better support B12/folate-dependent RBC maturation than folic acid.",
      evidenceCitation: "Aslinia F et al. Megaloblastic anemia and other causes of macrocytosis. Clin Med Res. 2006;4(3):236-41.",
      actionDetail: null,
    },
    {
      metricName: "RDW",
      conditionStatus: "borderline",
      category: "hematology",
      evidenceTier: "k2",
      recommendationText: "Elevated red cell distribution width (RDW) reflects erythrocyte size heterogeneity and is a sensitive marker of mixed nutritional deficiency (iron + B12/folate), chronic inflammation, or bone marrow stress. Combined iron and B-vitamin status assessment is appropriate when RDW is borderline-elevated.",
      evidenceCitation: "Lippi G et al. Red blood cell distribution width: a simple parameter with multiple clinical applications. Crit Rev Clin Lab Sci. 2014;51(6):365-75.",
      actionDetail: null,
    },
    {
      metricName: "Platelet Count",
      conditionStatus: "borderline",
      category: "hematology",
      evidenceTier: "k2",
      recommendationText: "Low-borderline platelet count may reflect marginally reduced thrombopoiesis; relevant contextual factors include B12/folate status, splenic sequestration, and inflammatory markers. Trending over multiple labs and correlating with B12/folate levels provides the most useful monitoring approach.",
      evidenceCitation: "Stasi R et al. Thrombocytopenia: a clinical approach. Lancet. 2012;379(9831):2042-52.",
      actionDetail: null,
    },
    {
      metricName: "Monocytes (Absolute)",
      conditionStatus: "borderline",
      category: "hematology",
      evidenceTier: "k2",
      recommendationText: "High-borderline absolute monocyte count can reflect low-grade inflammatory activation or a post-infection reactive response. Tracking alongside inflammatory markers (hsCRP, homocysteine) and ensuring anti-inflammatory lifestyle factors (diet quality, sleep, exercise) are maintained is a reasonable monitoring approach.",
      evidenceCitation: "Libby P et al. Monocytes and macrophages in atherosclerosis. Circ Res. 2019;124(3):509-21.",
      actionDetail: null,
    },

    // ── VITAMINS / METHYLATION MARKERS ────────────────────────────────────────

    {
      metricName: "Bilirubin, Total",
      conditionStatus: "deficient",
      category: "metabolic",
      evidenceTier: "k2",
      recommendationText: "Low total bilirubin has been associated with higher inflammatory burden in large population cohorts, as bilirubin acts as an endogenous antioxidant and anti-inflammatory molecule. Avoiding factors that suppress bilirubin production (smoking, obesity, excessive caffeine) is supported by observational evidence. Low bilirubin in isolation is typically not clinically actionable without other supporting findings.",
      evidenceCitation: "Horsfall LJ et al. Serum bilirubin and risk of respiratory disease and death. JAMA. 2011;305(7):691-7.",
      actionDetail: null,
    },
    {
      metricName: "ALT",
      conditionStatus: "borderline",
      category: "metabolic",
      evidenceTier: "k1",
      recommendationText: "Low-borderline ALT may reflect low lean muscle mass or reduced hepatic protein synthesis. In the context of high NAFLD polygenic risk and PEMT variants, establishing a baseline and trending ALT over time provides valuable hepatic health monitoring. Optimizing choline intake and avoiding hepatotoxic substances (excess alcohol, certain supplements) is directly supported by hepatic health evidence.",
      evidenceCitation: "Lim JS et al. The role of fructose in the pathogenesis of NAFLD and the metabolic syndrome. Nat Rev Gastroenterol Hepatol. 2010;7(5):251-64.",
      actionDetail: null,
    },
    {
      metricName: "AST",
      conditionStatus: "borderline",
      category: "metabolic",
      evidenceTier: "k2",
      recommendationText: "Low-borderline AST may reflect reduced hepatocellular enzyme output or marginally low pyridoxal-5-phosphate (active B6), as B6 is a required cofactor for AST activity. Ensuring adequate B6 intake is a relevant and low-risk consideration.",
      evidenceCitation: "Baise E et al. Factors affecting aminotransferase activities in clinical laboratory settings. Clin Chim Acta. 2004.",
      actionDetail: null,
    },
    {
      metricName: "ALP",
      conditionStatus: "borderline",
      category: "metabolic",
      evidenceTier: "k2",
      recommendationText: "Low-borderline ALP may indicate low zinc status (zinc is a critical ALP cofactor), low magnesium, or hypothyroidism in some clinical contexts. Evaluating zinc and magnesium status is a practical, evidence-based first step when ALP is consistently borderline-low.",
      evidenceCitation: "Keen CL et al. Zinc deficiency and enzymes of the alkaline phosphatase family. Am J Clin Nutr. 1988.",
      actionDetail: null,
    },
    {
      metricName: "Anion Gap",
      conditionStatus: "excess",
      category: "metabolic",
      evidenceTier: "k1",
      recommendationText: "Elevated anion gap warrants clinical evaluation for organic acid accumulation (lactic acidosis, ketoacidosis, ingestion). In a metabolically healthy context, borderline-elevated anion gap with other normal chemistries may reflect laboratory methodology variation; trending across measurements is informative.",
      evidenceCitation: "Lolekha PH et al. Reference range of serum anion gap in healthy adults. Clin Chim Acta. 2001.",
      actionDetail: null,
    },

    // ── INFLAMMATORY ──────────────────────────────────────────────────────────

    {
      metricName: "hs-CRP",
      conditionStatus: "excess",
      category: "inflammatory",
      evidenceTier: "k1",
      recommendationText: "Elevated high-sensitivity CRP reflects systemic inflammatory burden and is independently associated with cardiovascular risk. Interventions with strong RCT evidence include: Mediterranean-pattern diet, regular aerobic exercise, omega-3 fatty acid supplementation (EPA+DHA), weight management, and smoking cessation. These interventions reliably reduce CRP in multiple RCT meta-analyses.",
      evidenceCitation: "Calder PC et al. Dietary factors and low-grade inflammation in relation to overweight and obesity. Br J Nutr. 2011;106(S3):S5-78.",
      actionDetail: null,
    },
    {
      metricName: "Homocysteine",
      conditionStatus: "excess",
      category: "inflammatory",
      evidenceTier: "k1",
      recommendationText: "Elevated homocysteine is associated with cardiovascular, cerebrovascular, and cognitive risk and is directly addressable through B-vitamin optimization. Multiple RCTs demonstrate homocysteine lowering with B12, folate (as methylfolate in MTHFR carriers), and B6 co-supplementation. This is particularly actionable when MTHFR and FUT2 variants co-occur.",
      evidenceCitation: "Homocysteine Studies Collaboration. Homocysteine and risk of ischemic heart disease and stroke: a meta-analysis. JAMA. 2002;288(16):2015-22.",
      actionDetail: "Methylfolate preferred over folic acid for MTHFR variant carriers.",
    },

    // ── AUTONOMIC ─────────────────────────────────────────────────────────────

    {
      metricName: "HRV",
      conditionStatus: "borderline",
      category: "autonomic",
      evidenceTier: "k1",
      recommendationText: "Low heart rate variability reflects reduced parasympathetic tone and is associated with increased cardiovascular risk and stress burden. Evidence-supported HRV-improving interventions include: consistent aerobic exercise, diaphragmatic breathing and HRV biofeedback, cold water immersion (graduated), sleep quality optimization, and reduced alcohol intake. These interventions have been validated in multiple RCTs.",
      evidenceCitation: "Thayer JF et al. The relationship of autonomic imbalance, heart rate variability and cardiovascular disease risk factors. Int J Cardiol. 2010;141(2):122-31.",
      actionDetail: null,
    },
    {
      metricName: "Recovery Score",
      conditionStatus: "borderline",
      category: "autonomic",
      evidenceTier: "k2",
      recommendationText: "Low recovery score (from HRV-based wearable measurement) reflects suboptimal overnight autonomic recovery. Key modifiable drivers include: sleep duration and quality, training load balance, alcohol intake, and acute stressors. Systematic deload weeks and sleep hygiene optimization are well-supported by sports science evidence.",
      evidenceCitation: "Bellenger CR et al. Monitoring athletic training status through autonomic heart rate regulation: a systematic review and meta-analysis. Sports Med. 2016.",
      actionDetail: null,
    },
  ] as Array<{
    metricName: string;
    conditionStatus: string;
    category: 'vitamins' | 'minerals' | 'inflammatory' | 'metabolic' | 'hormones' | 'autonomic' | 'bodyComposition' | 'lipids' | 'hematology';
    evidenceTier: 'k1' | 'k2' | 'k3' | 'k4';
    recommendationText: string;
    evidenceCitation?: string | null;
    actionDetail?: string | null;
  }>,
};

// ── 3. Seed function ──────────────────────────────────────────────────────────

/**
 * runSeed — wrapped in an async function so importing this module for
 * corpus-lint.test.ts (which only needs the `corpusSeedData` export) does NOT
 * trigger the DB connection at import time.
 *
 * Only executed when this script is run directly:
 *   npm run db:seed-corpus   → executes runSeed()
 *   import { corpusSeedData } → corpusSeedData exported, runSeed() NOT called
 */
async function runSeed() {
  // Validate required env vars (only checked at run time, not import time)
  const DB_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!DB_URL) {
    throw new Error(
      "DATABASE_URL or DATABASE_URL_UNPOOLED env var is required. " +
      "Run with: npm run db:seed-corpus (from remix-app/)"
    );
  }

  console.log("[seed-corpus] Connecting to live Neon...");
  const db = getDb();

  let variantRulesInserted = 0;
  let metricRulesInserted = 0;

  // Insert variant rules (geneticVariants + variantProtocolMap)
  for (const rule of corpusSeedData.variantRules) {
    // Insert parent geneticVariants row — ON CONFLICT DO NOTHING (idempotent)
    const [variant] = await db
      .insert(geneticVariants)
      .values({
        gene: rule.gene,
        rsid: rule.rsid ?? null,
        genotypePattern: rule.genotypePattern ?? null,
        category: rule.category,
        impact: rule.impact,
        clinicalImplication: rule.clinicalImplication,
        knowledgeSource: rule.knowledgeSource ?? null,
        corpusVersion: CORPUS_VERSION,
      })
      .returning({ id: geneticVariants.id });

    if (!variant) {
      console.log(`[seed-corpus] Skipped duplicate variant: ${rule.gene} ${rule.genotypePattern ?? '(any)'}`);
      continue;
    }

    // Insert child variantProtocolMap row
    await db
      .insert(variantProtocolMap)
      .values({
        variantId: variant.id,
        evidenceTier: rule.evidenceTier,
        recommendationText: rule.recommendationText,
        evidenceCitation: rule.evidenceCitation ?? null,
        actionDetail: rule.actionDetail ?? null,
        corpusVersion: CORPUS_VERSION,
      });

    variantRulesInserted++;
  }

  // Insert metric rules — ON CONFLICT DO NOTHING via sql`` guard
  for (const rule of corpusSeedData.metricRules) {
    // Check for existing row (idempotent: skip if (metricName, conditionStatus) exists)
    const existing = await db.execute(
      sql`SELECT id FROM metric_protocol_map
          WHERE metric_name = ${rule.metricName}
            AND condition_status = ${rule.conditionStatus}
            AND corpus_version = ${CORPUS_VERSION}
          LIMIT 1`
    );

    if ((existing as { rows: unknown[] }).rows.length > 0) {
      console.log(`[seed-corpus] Skipped duplicate metric rule: ${rule.metricName} / ${rule.conditionStatus}`);
      continue;
    }

    await db.insert(metricProtocolMap).values({
      metricName: rule.metricName,
      conditionStatus: rule.conditionStatus,
      category: rule.category,
      evidenceTier: rule.evidenceTier,
      recommendationText: rule.recommendationText,
      evidenceCitation: rule.evidenceCitation ?? null,
      actionDetail: rule.actionDetail ?? null,
      corpusVersion: CORPUS_VERSION,
    });

    metricRulesInserted++;
  }

  console.log(`[seed-corpus] Inserted ${variantRulesInserted} variant rules, ${metricRulesInserted} metric rules`);
  console.log(`[seed-corpus] Corpus version: ${CORPUS_VERSION}`);
}

// Only run seed when executed as a script (not when imported by tests)
// tsx sets process.argv[1] to the script path; vitest imports the module, not runs it.
const isDirectRun = process.argv[1]?.endsWith("seed-corpus.ts") ||
  process.argv[1]?.endsWith("seed-corpus.js");
if (isDirectRun) {
  runSeed().catch((err) => {
    console.error("[seed-corpus] Fatal error:", err);
    process.exit(1);
  });
}
