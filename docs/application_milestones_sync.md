# MSc & Erasmus Mundus Application Sync

**Purpose:** This document is meant to bridge context between research workspaces and the Polaris project. It contains a list of critical academic deadlines and milestones that need to be ingested into the Polaris `milestones` table.

## Context for Polaris Agent
Anindita is preparing applications for European MSc programs (TU Delft) and several Erasmus Mundus Joint Master Degrees (EMJMD) for the September 2027 intake. She is also currently writing two papers to boost her application profile:
1. A Solar PV Survey Paper (focused on agricultural applications)
2. An EMI/EMC Conference Paper (SiC converter simulation)

**Agent Action Required:**
Please parse the deadlines below and insert them into the `milestones` table for Anindita. Ensure you use the correct Supabase client configuration and match the schema (`title`, `deadline`, `status`, `note`).

## Application Deadlines (2027 Intake)

| Title | Deadline | Note |
| :--- | :--- | :--- |
| STEPS - Erasmus Mundus Application | 2026-12-31 | Sustainable Transportation and Electrical Power Systems. Earliest deadline. |
| TU Delft MSc EE - Application | 2027-01-15 | Electrical Power Engineering track. Ranked batch admission for non-EU. |
| TU Delft MSc IPD - Application | 2027-01-15 | Integrated Product Design. |
| SUSTAGRI - Erasmus Mundus Application | 2027-01-15 | Cutting-Edge Technologies for Sustainable Agriculture. Strong narrative fit. |
| DREAM - Erasmus Mundus Application | 2027-01-31 | Dynamics of Renewables-based Power Systems. |
| EU-CORE - Erasmus Mundus Application | 2027-01-31 | European Master on Control of Renewable Energy. Includes entrepreneurship. |
| Semiconductor Chips - Erasmus Mundus | 2027-01-31 | New program. Exact deadline TBD; monitor catalogue. |
| EMIMEP - Erasmus Mundus Application | 2027-03-13 | Microwave Electronics and Photonics. Safety net program. |

## Prep Milestones

| Title | Deadline | Note |
| :--- | :--- | :--- |
| IELTS Retake | 2026-09-30 | Target: 7.0+ overall. Needed for all European MSc applications. |
| EMI/EMC Paper - Submit to Conference | 2026-10-31 | SiC converter EMI simulation paper with Dr. Vignesh Kumar. Target: under review status. |
| MSc Application Materials Ready | 2026-12-15 | CV, motivation letters, 2-3 recommendation letters, transcripts. Must be ready before STEPS. |

## Reference SQL for Insertion
```sql
INSERT INTO milestones (user_id, title, deadline, status, note) VALUES
  (auth.uid(), 'STEPS - Erasmus Mundus Application', '2026-12-31', 'pending', 'Sustainable Transportation and Electrical Power Systems. Earliest deadline.'),
  (auth.uid(), 'TU Delft MSc EE - Application', '2027-01-15', 'pending', 'Electrical Power Engineering track. Ranked batch admission for non-EU.'),
  (auth.uid(), 'TU Delft MSc IPD - Application', '2027-01-15', 'pending', 'Integrated Product Design.'),
  (auth.uid(), 'SUSTAGRI - Erasmus Mundus Application', '2027-01-15', 'pending', 'Cutting-Edge Technologies for Sustainable Agriculture. Strong narrative fit.'),
  (auth.uid(), 'DREAM - Erasmus Mundus Application', '2027-01-31', 'pending', 'Dynamics of Renewables-based Power Systems.'),
  (auth.uid(), 'EU-CORE - Erasmus Mundus Application', '2027-01-31', 'pending', 'European Master on Control of Renewable Energy. Includes entrepreneurship.'),
  (auth.uid(), 'Semiconductor Chips - Erasmus Mundus', '2027-01-31', 'pending', 'New program. Exact deadline TBD; monitor catalogue.'),
  (auth.uid(), 'EMIMEP - Erasmus Mundus Application', '2027-03-13', 'pending', 'Microwave Electronics and Photonics. Safety net program.'),
  (auth.uid(), 'IELTS Retake', '2026-09-30', 'pending', 'Target: 7.0+ overall. Needed for all European MSc applications.'),
  (auth.uid(), 'EMI/EMC Paper - Submit to Conference', '2026-10-31', 'pending', 'SiC converter EMI simulation paper with Dr. Vignesh Kumar. Target: under review status.'),
  (auth.uid(), 'MSc Application Materials Ready', '2026-12-15', 'pending', 'CV, motivation letters, 2-3 recommendation letters, transcripts. Must be ready before STEPS.');
```
