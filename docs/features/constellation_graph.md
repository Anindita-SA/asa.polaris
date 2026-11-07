# Constellation Graph

## Overview
The Constellation Graph is Polaris's high-level interactive visual map of life domains, projects, and goals. It visualizes life architecture as an interactive starfield with connected nodes, allowing the user to navigate between high-level vision and granular, actionable tasks.

## Key Capabilities
- **Hierarchical Node Structure**:
  - **Root Node**: Polaris (core north star and long-term vision).
  - **Primary Domain Nodes**: Broad operational areas such as Career, Academic, and Self.
  - **Subnodes**: Concrete initiatives, projects, or focus areas nested under each domain.
- **Interactive Canvas**:
  - Fluid 2D and 3D celestial canvas rendering using D3-force simulation and Canvas APIs.
  - Draggable nodes with spring-physics simulation.
  - Zoom and pan capabilities with smooth reset to focal view.
- **AI Task Breakdown**:
  - Contextual action planning integrated directly into node details.
  - Generates small, sequential steps (5-15 minute increments) to overcome inertia and kickstart stalled projects.
- **Node Management**:
  - Create, update, re-position, and delete nodes with coordinates saved to Supabase and cached locally.

