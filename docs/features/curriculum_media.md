# Curriculum & Media Log

## Overview
The Curriculum and Media Log system acts as Polaris's personal knowledge repository. It tracks structured multi-week learning curricula, mock test scores, reading materials, research papers, and cultural consumption.

## Core Capabilities

### 1. Curriculum Engine
- **Disciplines & Tracks**:
  - Foundational Tracks (Core theory, mathematics, systems).
  - Applied Skills (Hardware design, software architecture, specialized topics).
- **Topic Progression**:
  - Structured modules with status indicators (`todo`, `in_progress`, `done`).
  - Active side quest flags (`[NEXT]`) that feed directly into daily task suggestions.
- **Practice Score Tracker**:
  - Logs structured test attempts with component scores, bands, test dates, and official review links.
  - Generates executive summary cards and historical score progression curves.

### 2. Media Log & Link Resolution
- **Sub-View Filtering**:
  - Papers (research papers, arXiv preprints, technical articles).
  - Books (technical manuals, design philosophy, non-fiction).
  - Visual Media (courses, documentaries, video resources).
- **Automated Metadata Fetcher**:
  - Resolves arXiv preprints directly using the official arXiv XML API to populate title, authors, summary, and categories.
  - Resolves DOIs and scholarly URLs via Crossref and OpenAlex.
  - Scrapes OpenGraph tags for general web articles.
- **Review & Rating**:
  - 5-star rating scale, status toggles, key takeaway notes, and personal review tags.

