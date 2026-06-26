# Productivity Monitoring Architecture

## Goal

Build a simple productivity monitoring system that records how long a user spends
using each desktop application or website.

This project must evolve incrementally. The current phase prepares the product
foundation only. It must not include a desktop executable, background agent, or
local collector implementation yet.

## Current Stack

- Frontend and full-stack runtime: TanStack Start, React, Vite, TypeScript.
- Database and auth foundation: Lovable Cloud, using the configuration already
  generated in this project.
- UI primitives: Radix UI components and local shared components.

## Architectural Boundaries

The product should be split into clear responsibilities:

- `src/routes`: route-level screens and loaders.
- `src/components`: reusable UI components only.
- `src/features/productivity`: future productivity domain modules.
- `src/integrations/lovable`: Lovable Cloud integration glue.
- Backend schema/configuration: should follow the Lovable Cloud workflow already
  configured for this project.

The future collector must be treated as an external data producer. It should send
usage records to the backend through an authenticated API path, but its runtime,
packaging, and operating-system integration are out of scope for now.

## Initial Domain Model

The first database model should represent these concepts:

- Organization or company: existing tenant boundary already present in the
  current schema.
- User profile: existing authenticated user representation.
- Device: a computer associated with a user and company.
- Usage source: an application or website being tracked.
- Usage interval: a period of time spent on one usage source from one device.

Recommended naming for future tables:

- `monitored_devices`
- `usage_sources`
- `usage_intervals`

## Lovable Cloud Rules

Backend changes should use Lovable Cloud as the source of truth for data and
authentication. Do not introduce a separate Supabase development workflow unless
the project scope changes again.

Data access should stay scoped by company and user ownership. Any schema or auth
change should be reviewed against the existing Lovable Cloud configuration before
being pushed.

## Non-Goals For Now

- No `.exe`.
- No desktop agent.
- No browser extension.
- No real-time activity collection.
- No dashboard implementation.
- No large rewrite of the existing Lovable-generated UI.

## Next Recommended Step

Map the existing Lovable Cloud configuration and decide where the initial
productivity entities should live before adding database-backed features.
