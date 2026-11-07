# Reach Out Personal CRM & Nudges

## Overview
Reach Out is a personal relationship management system designed around concentric intimacy rings (Dunbar-inspired circles). It prevents social drift by highlighting contacts when reach-out intervals become overdue.

## Core Capabilities

### 1. Intimacy Tiers & Cadence
Contacts are organized across four intimacy rings, each with a default check-in cadence:
- **Hearth (Weekly)**: Core family, closest partners, and daily confidents.
- **Parlour (Bi-weekly / Monthly)**: Close friends and active collaborators.
- **Porch (Quarterly)**: Good friends, extended network, and past peers.
- **Yard (Biannual / Yearly)**: Professional contacts, mentors, and acquaintances.

### 2. Overdue Cadence Alerts
- **Dynamic Last-Contact Calculation**:
  - Compares the timestamp of the last logged interaction against the tier cadence threshold.
  - Highlights contacts overdue for connection with subtle amber tags.
- **Interaction History**:
  - Log discrete touchpoints (calls, messages, coffee, emails) with brief summary notes.

### 3. Service Worker Push Nudges
- **Custom Push Notifications**:
  - Web Push API integration running through `src/sw.js`.
  - Configurable gentle reminders for hydration, movement breaks, or reaching out to close contacts.
- **Non-Intrusive Prompting**:
  - Background notifications fire without requiring the app tab to remain actively focused in the foreground.

