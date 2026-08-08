# Regulated employment matching: research basis and operating standard

Last legal-source review: **August 8, 2026**

## Purpose

Achieve DXP's matcher is a screening and navigation aid. It must not tell a person that a broad offense category makes an entire industry legally impossible. Reliable screening requires the nature and gravity of the exact offense, time elapsed, actual job duties, jurisdiction, license, facility or employer type, current agency records, and any restoration, waiver, consent, or appeal.

The engine therefore distinguishes:

1. **Likely regulated restriction** — available facts closely match a specific federal rule. The job stays visible, is ranked as challenging, and the user receives the controlling source and verification step.
2. **Approval or waiver path** — a regulator or sponsoring employer may authorize the work. This is not presented as a permanent ban.
3. **Agency verification needed** — state licensing, provider coverage, or an official list must be checked before relying on the match.
4. **Individualized review** — the record may be considered, but no occupation-specific bar was identified from available facts.
5. **No record-aware screening** — the user did not opt into specialized guidance.

## Baseline fairness rule

The EEOC advises employers to use a targeted screen based on the nature and gravity of the conduct, time elapsed, and nature of the job, followed in most cases by individualized assessment. Blanket exclusion of everyone with a criminal record is not job related and consistent with business necessity unless federal law requires it.

Primary source: [EEOC Enforcement Guidance on Arrest and Conviction Records](https://www.eeoc.gov/laws/guidance/enforcement-guidance-consideration-arrest-and-conviction-records-employment-decisions).

## Researched regulated contexts

| Work context | What the authoritative rule actually says | Matcher treatment |
|---|---|---|
| Federally assisted child care | 42 U.S.C. § 9858f lists registry status and specified felonies; felony drug offenses use a five-year window. Covered providers must conduct fingerprint and registry checks. | Likely restriction only when supplied facts match the list; otherwise state/provider verification. |
| K–12 schools | Background-check, school-employment, and educator-license restrictions are primarily state- and role-specific. A school job is not treated as a universal federal ban. | Challenging pending state education agency and district verification. |
| Healthcare and medical work | HHS-OIG mandatory exclusions cover program-related offenses, patient abuse/neglect, specified healthcare-related financial felonies, and healthcare-related controlled-substance felonies. A broad violent conviction does not create a universal federal ban on all medical work. State licenses and facility rules vary. | Check exact offense, state board, facility duties, and the HHS-OIG LEIE. Current verified exclusion is a likely restriction for federally reimbursed work. |
| Armed/firearm duties | 18 U.S.C. § 922(g) generally prohibits firearm possession by a person convicted of a crime punishable by more than one year, subject to definitions, restoration, and exceptions. | Felony + actual firearm possession duty ranks as a likely restriction unless effective restoration is known. |
| FDIC-insured banking | Section 19 covers dishonesty, breach of trust, and money laundering, but the Fair Hiring in Banking Act added older-offense, age-at-offense, de minimis, and other exceptions. FDIC consent remains a path in covered cases. | Recent covered offense: consent/approval path. Older cases: individualized review, not lifetime exclusion. |
| FINRA-regulated securities | All felony convictions within ten years are statutory disqualifications for association with a FINRA member, but Rule 9520 eligibility proceedings can authorize association under supervision. | Approval path, not permanent ban. |
| Business of insurance | 18 U.S.C. § 1033(e) restricts participation after a felony involving dishonesty or breach of trust unless written consent is obtained from the appropriate insurance regulator. | Written-consent path with state regulator. |
| Commercial driving | 49 C.F.R. § 383.51 generally imposes a one-year CDL disqualification for a first covered DUI, three years in specified hazmat circumstances, and potentially lifetime consequences for subsequent incidents. | Current license/status verification; never describe every DUI as a permanent driving ban. |
| Airport secure-area access | 49 C.F.R. §§ 1542.209 and 1544.229 use an enumerated offense list and ten-year lookback for covered functions and unescorted secure access. | Likely restriction only when category/details match the list and timing. |
| TWIC/HazMat endorsement | 49 C.F.R. § 1572.103 separates permanent and interim disqualifying offenses. Interim rules generally use seven years from conviction or five years from release. Appeal and waiver paths exist for many cases. | Exact-offense TSA review with appeal/waiver direction. |
| Federal employment | OPM states that a felony does not automatically make someone unsuitable for most federal jobs. Agencies consider job conflict, seriousness, circumstances, recency, and rehabilitation, subject to position-specific statutes. | Individualized review; federal employer alone never triggers an automatic rejection. |
| Security clearances | SEAD 4 uses whole-person adjudication. A past record is a concern to evaluate, not an automatic denial by itself. | Individualized review; clearance wording is not treated as a blanket exclusion. |
| State occupational licenses | License requirements and criminal-record rules vary by occupation and state and change over time. | Link to the state licensing authority through DOL CareerOneStop and require current verification. |

## Offense-category treatment

These categories are routing labels, not legal conclusions. The exact statute and elements always control.

| Profile category | High-value checks performed | What the engine must not claim |
|---|---|---|
| Drug possession-related | Five-year felony drug rule for covered child care; ten-year airport rule when the offense was felony possession punishable by more than one year; state pharmacy/health license review; commercial-driving status when the underlying incident affects the CDL. | Not automatically excluded from schools, healthcare, federal work, or all transportation. HHS-OIG controlled-substance exclusions are not inferred from simple possession alone. |
| Drug distribution-related | Covered child-care timing; HHS-OIG only when the offense meets healthcare-related criteria; airport and TWIC/HME lists; pharmacy/medication duty conflict; CDL lifetime rule only when a vehicle was used in the specified felony conduct. | Not automatically excluded from every healthcare, logistics, or driving role. |
| Violence-related | Exact covered child-care offenses; enumerated airport/TSA offenses; state school, direct-care, security, and occupational-license review; actual firearm duties. | Not a universal federal ban on medical work, school work, federal employment, or security clearance. |
| Registry-related | Covered child-care prohibition; exact state restrictions for schools, youth settings, residences, care settings, and location/access conditions. | Not assumed to produce the same restriction in every state or every off-site/remote duty. |
| Property or theft-related | Direct cash/property duty relevance; FDIC Section 19 only if the offense meets dishonesty/breach-of-trust criteria and no exception applies; airport ten-year list for felony theft; insurance consent when § 1033 elements are met. | Not automatically excluded from all retail, finance, warehouse, or inventory work. |
| Burglary-related | Unsupervised residential-access duty relevance; airport ten-year list for felony burglary; exact state license/employer review. | Not a categorical legal ban from property maintenance or all in-home work without a governing rule. |
| Financial fraud-related | FDIC time limits and consent; FINRA ten-year rule for felonies; insurance § 1033 consent; healthcare only when program/healthcare-related; airport secure-access list. | Not a lifetime ban from the entire finance industry or all roles that touch data. |
| Weapons-related | Federal firearm possession for felony-classified offenses and actual firearm duties; airport and TWIC/HME lists; state armed/unarmed security licensing. | Not automatically excluded from every unarmed security, manufacturing, or federal job. |
| DUI/DWI-related | Current CDL disqualification period, number of incidents, vehicle type, hazmat status, and reinstatement; FINRA only if the DUI was a felony within ten years. | Not a permanent ban from all commercial or ordinary driving after one offense. |
| Other conviction | Exact offense-name matching for enumerated federal lists, plus targeted duty and state-license review. | No categorical conclusion from “other.” Missing facts must be shown to the user. |

## Primary authority registry

- Child care: [42 U.S.C. § 9858f](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section9858f)
- Firearms: [ATF prohibited-person guidance](https://www.atf.gov/firearms/tools-services-law-enforcement/identify-prohibited-persons)
- Healthcare exclusions: [HHS-OIG exclusion authorities](https://oig.hhs.gov/exclusions/background-information-exclusion-authorities/) and [LEIE search](https://exclusions.oig.hhs.gov/)
- Banking: [FDIC Fair Hiring in Banking Act summary](https://www.fdic.gov/news/financial-institution-letters/2023/fil23009.html)
- Securities: [FINRA eligibility requirements](https://www.finra.org/rules-guidance/guidance/eligibility-requirements)
- Insurance: [18 U.S.C. § 1033](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title18-section1033)
- Commercial driving: [49 C.F.R. § 383.51](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-383/subpart-D/section-383.51)
- Airport access: [49 C.F.R. § 1544.229](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-XII/subchapter-C/part-1544/subpart-C/section-1544.229)
- TWIC/HME: [49 C.F.R. § 1572.103](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-XII/subchapter-D/part-1572/subpart-B/section-1572.103)
- Federal employment: [OPM suitability guidance](https://www.opm.gov/frequently-asked-questions/suitability-executive-agent-faq/suitability-adjudications/what-if-someone-has-a-criminal-record-or-other-problems-in-their-past/)
- Security eligibility: [DCSA whole-person adjudication](https://www.dcsa.mil/Trust-Decision-Adjudications/)
- State licenses: [U.S. DOL CareerOneStop License Finder](https://www.careeronestop.org/Toolkit/Training/find-licenses.aspx)

## Data-quality requirements

The matcher now accepts the exact offense name/statute, conviction jurisdiction, conviction year, release year, sentence-completion year, felony/misdemeanor/infraction classification, registry status, verified HHS-OIG exclusion status, and legally effective firearm-rights restoration. If facts needed by a rule are missing, the UI explicitly lists them and lowers confidence.

Conviction date may not equal offense date. Where a statute uses the offense date and only conviction year is available, the product labels the calculation as an estimate and requires verification.

## Maintenance and legal-review policy

- Recheck every cited federal authority at least quarterly.
- Do not add a state categorical rule without a current primary source, effective date, offense elements, lookback calculation, covered employer/license, exceptions, and relief process.
- Version every rule and retain its source and last-reviewed date.
- Never silently infer an HHS-OIG exclusion, firearm disability restoration, sealed-record effect, or occupational-license denial from a broad offense category.
- Keep restricted jobs visible with an explanation and lawful review/waiver path; do not simply hide them.
- Conduct attorney review before marketing results as legal eligibility determinations or adding comprehensive 50-state categorical conclusions.
