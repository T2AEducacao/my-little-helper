# Productivity Monitoring Architecture

## Goal

Build a simple productivity monitoring system that records how long a user spends
using each desktop application or website.

This project must evolve incrementally. The current phase prepares the product
foundation only. It must not include a desktop executable, background agent, or
local collector implementation yet.

## Current Stack

- Frontend and full-stack runtime: TanStack Start, React, Vite, TypeScript.
- Database and auth foundation: Supabase.
- UI primitives: Radix UI components and local shared components.

## Architectural Boundaries

The product should be split into clear responsibilities:

- `src/routes`: route-level screens and loaders.
- `src/components`: reusable UI components only.
- `src/features/productivity`: future productivity domain modules.
- `src/integrations/supabase`: Supabase clients, generated types, and auth glue.
- `supabase/migrations`: versioned database schema changes.

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

## Supabase Rules

New tables in the public schema must use row level security from the start.
Policies should be explicit and scoped by company/user ownership. Avoid policies
that only check `to authenticated` without an ownership predicate.

Migrations should be created under `supabase/migrations` and reviewed before
being pushed. Generated Supabase types should be updated only after a schema
migration is validated.

## Non-Goals For Now

- No `.exe`.
- No desktop agent.
- No browser extension.
- No real-time activity collection.
- No dashboard implementation.
- No large rewrite of the existing Lovable-generated UI.

## Next Recommended Step

Create a small Supabase migration for the initial productivity tables:
`monitored_devices`, `usage_sources`, and `usage_intervals`.
