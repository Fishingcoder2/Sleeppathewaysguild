# BRPT-First Source and Reading Crosswalk Specification

**Document status:** Version 0.1  
**Governing rule:** BRPT-recommended and official controlling sources come first. Supplemental materials may deepen learning but may not silently override the current blueprint, candidate handbook, scoring rules, or official guidance.

## 1. Source hierarchy

### Level 1 — Exam and scoring authority

1. Current BRPT RPSGT Exam Blueprint
2. Current BRPT Candidate Handbook
3. Current AASM Manual for the Scoring of Sleep and Associated Events
4. Current official professional guidance applicable to the task
5. Current diagnostic terminology from the applicable ICSD edition

### Level 2 — BRPT suggested primary references

The current BRPT reference catalog must be verified before publication. The working primary-reference list includes:

- *Fundamentals of Sleep Technology*, current BRPT-listed edition
- *Polysomnography for the Sleep Technologist: Instrumentation, Monitoring and Related Procedures*
- *Pediatric Sleep Pearls*
- *A Clinical Guide to Pediatric Sleep: Diagnosis and Management of Sleep Problems*, current BRPT-listed edition
- *Sleep Medicine Pearls*, current BRPT-listed edition
- ICSD and AASM guidance identified by BRPT

### Level 3 — Supplemental Sleep Pathways Guild resources

Examples include:

- sleep and PSG atlases;
- pediatric specialty texts;
- ECG/EKG references;
- respiratory, PAP, neonatal, and infant references;
- AAST technical guidelines not explicitly listed as BRPT primary texts;
- peer-reviewed articles;
- *Fundamentals of Sleep Medicine* and related workbook material;
- other review books and educational resources.

Supplemental sources must be visibly labeled as supplemental, extended learning, atlas support, or clinical enrichment.

## 2. Crosswalk chain

Every learner-facing educational unit should support this traceable path:

```text
BRPT domain
→ BRPT task
→ knowledge area
→ learning objective
→ controlling official source
→ BRPT suggested primary reading
→ supplemental reading
→ original lesson
→ original practice question
→ skill lab
→ report recommendation
```

## 3. Master source record

Each book, manual, guideline, article, or official webpage receives one permanent source record.

```json
{
  "sourceId": "BRPT-TEXT-FST3",
  "sourceType": "textbook",
  "hierarchyLevel": "BRPT suggested primary reference",
  "brptListed": true,
  "title": "Title",
  "authorsOrOrganization": ["Author or organization"],
  "edition": "3",
  "publicationYear": 2020,
  "publisher": "Publisher",
  "isbn10": null,
  "isbn13": null,
  "doi": null,
  "apaCitation": "Complete APA 7 citation",
  "officialUrl": null,
  "freeFullTextUrl": null,
  "publisherUrl": null,
  "amazonAffiliateUrl": null,
  "affiliate": false,
  "active": true,
  "startDate": "2026-07-23",
  "endDate": null,
  "lastVerified": "2026-07-23",
  "nextReviewDue": "2026-10-23",
  "supersededBy": null,
  "notes": ""
}
```

## 4. Reading locator record

A source may have many reading assignments. Each assignment must identify exactly where the learner should read.

```json
{
  "readingId": "D2-SIGNALS-001",
  "sourceId": "BRPT-TEXT-FST3",
  "domain": "D2",
  "taskId": "exact-current-task-id",
  "knowledgeArea": "Signal acquisition and troubleshooting",
  "chapterNumber": "8",
  "chapterTitle": "Exact chapter title",
  "sectionHeading": "Exact section heading",
  "subsectionHeading": null,
  "printedPages": "214–221",
  "pdfPages": null,
  "ebookLocation": null,
  "paragraphLocator": null,
  "recommendationNumber": null,
  "tableNumber": null,
  "figureNumber": "Figure 8-4",
  "originalSummary": "Original explanation of why this reading matters.",
  "learningObjectives": [
    "Recognize common signal failures",
    "Choose an appropriate troubleshooting response"
  ],
  "active": true,
  "startDate": "2026-07-23",
  "endDate": null,
  "lastReviewed": "2026-07-23"
}
```

## 5. Outline requirements by source type

### Textbooks

Outline at this level:

```text
Book
→ part
→ chapter
→ section
→ subsection
→ key concepts
→ important figures/tables
→ BRPT domain and task
→ lesson/lab/question connections
→ page or location range
```

The app may provide original summaries and reading directions. It must not reproduce textbook chapters, proprietary tables, substantial passages, or copyrighted question banks.

### Practice guidelines and official statements

Record:

- issuing organization;
- publication and update dates;
- population and clinical question;
- recommendation number;
- original summary of the recommendation;
- recommendation strength;
- evidence quality or certainty, when stated;
- remarks, implementation points, exceptions, and cautions;
- page, section, table, and paragraph locator;
- official URL;
- last verification date;
- mapped BRPT domains and tasks.

### Research and review articles

Record:

- purpose;
- population or topic;
- article type;
- methods in brief;
- findings in original language;
- clinical or technologist relevance;
- limitations;
- page, section, table, figure, or paragraph locator;
- DOI, publisher, and lawful free-full-text links;
- mapped BRPT domains and tasks.

Research articles may expand understanding but do not automatically control an exam answer.

## 6. Learner-facing APA citation and destination policy

### Commercial textbooks

Display the APA-style citation first. The link destination must be disclosed before the click.

Example:

> Author, A. A. (Year). *Book title* (3rd ed.). Publisher.  
> **Recommended reading:** Chapter 6, pp. 142–167.  
> **View this edition on Amazon — paid affiliate link**

Use exact-edition or ISBN-specific Amazon links whenever possible and append the affiliate tag `spg_rpsgt-20`.

The required disclosure must appear near recommendation groups:

> **As an Amazon Associate I earn from qualifying purchases.**

A textbook citation must not appear to be a neutral academic hyperlink while secretly redirecting to an affiliate destination.

### Official manuals, articles, and free guidelines

Use the official source whenever available. Link labels should identify the destination:

- Read the official guideline free
- Open the professional-society source
- View the publisher article
- Open the DOI record
- View the official manual information page

## 7. Question-to-source relationship

Every approved question must identify:

- the controlling source;
- one BRPT suggested primary reference when applicable;
- optional supplemental references;
- the exact reading records supporting review;
- whether the question is an original Sleep Pathways Guild item;
- the blueprint and candidate-handbook versions used;
- the last review date.

```json
{
  "questionId": "D3-RESP-001",
  "authoritySourceId": "AASM-SCORING-CURRENT",
  "primaryReadingIds": ["D3-RESP-FST-001"],
  "supplementalReadingIds": ["D3-RESP-ARTICLE-004"],
  "questionOrigin": "Original Sleep Pathways Guild question",
  "containsActualExamContent": false
}
```

## 8. Conflict rule

When sources disagree, use this order:

```text
Current BRPT blueprint or handbook
→ current controlling AASM rule or applicable official guideline
→ BRPT suggested primary reference
→ supplemental text or article
```

The conflict and resolution should be documented internally. The app must not silently harmonize incompatible sources.

## 9. Version and obsolescence controls

Every source, reading assignment, question, lesson, report recommendation, and blueprint mapping must have:

- active/inactive status;
- start date;
- optional end date;
- last-reviewed date;
- next-review date;
- superseded-by field;
- retirement reason;
- source version or edition.

When a controlling source changes, related items must be marked **review needed** and removed from active practice and mock-exam pools until approved again.

## 10. First catalog deliverable

The first completed catalog should list every current BRPT-recommended source with:

- exact APA 7 citation;
- exact edition;
- ISBN or DOI;
- BRPT listing status;
- source hierarchy level;
- lawful official or full-text URL;
- Amazon affiliate destination when appropriate;
- disclosure status;
- table of contents or section outline;
- BRPT domain/task mapping;
- active dates and review dates.
