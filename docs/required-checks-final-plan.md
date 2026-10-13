# Required checks: isolated preparation, not activated

Base: PR120 deecbd78cf7b6ecadbb7e0f2364750b0ad34a01e.
No existing PR, repository setting, production secret or deployment is changed.

## Observed problem

Quality (`test`) has no path filter but limits target branches. Portal Acceptance,
Kanban, Clean Install, Deployment Safety and EGRESS-2 have event-level path filters.
Making those job names required can leave unmatched pull requests pending forever.
Existing filters also omit shared dependencies such as apiUrl/auth changes.

## Proposed wiring (not activated in this branch)

1. Remove event path filters from the five workflows; run pull_request on all target
   branches so the named checks always exist. Keep Quality always executing.
2. Add a lightweight relevance job: checkout the trusted base policy, fetch exact
   base/head SHA and calculate the complete NUL-delimited merge-base diff locally.
   Never rely on a truncated GitHub file list. Fetch/diff/parse failures fail closed.
   A policy/workflow/package change must execute all suites.
3. Rename the expensive jobs to unique internal names. Run them conditionally from
   the detector outputs. Add always-running gate jobs with the original six check
   names and `if: always()`, depending on detector and suite. Required means success
   only: skipped/cancelled/failure cannot pass. Docs-only means an explicit validated
   not-applicable summary, not a claim that the suite executed. Detector must pass.
4. The supplied policy conservatively requires every suite for every non-Markdown
   change. Only README/CONTRIBUTING/CHANGELOG and docs Markdown may avoid expensive
   suites. Quality still runs. Narrower feature-specific dependency maps require
   a separate verified dependency analysis; do not guess exclusions.
5. Validate wiring using docs-only, functional, unknown, mixed, failed-suite and
   cancelled-suite PRs on an isolated branch. Do not install required checks in
   Rulesets before those CI proofs exist. This branch supplies policy unit tests,
   not proof that the workflow wiring is already deployed.

## Configuration proposal requiring owner approval

Main ruleset: Active; target refs/heads/main; empty bypass list; pull request required;
two approvals; dismiss stale approvals; approval of latest push by another person;
resolve conversations; block deletion and non-fast-forward; required checks test,
portal-acceptance, kanban-postgres-e2e, clean-install, local-safety, benchmark;
strict up-to-date checks, with GitHub Actions as expected source. Auto-merge off.

Production: selected branch main only; independent required reviewer; prevent
self-review true; admin bypass false. Only environment-scoped migration secrets.
Keep MANUAL_MIGRATIONS_ENABLED absent/0 until separately approved activation.

The collaborator inventory currently exposes only fso0c1ety (admin). Two independent
PR reviewers and a separate Production reviewer are not currently available.
Invitations/access grants require personal approval; do not reduce review requirements.

## Deployment and credentials sequence

Before any main integration: record current production deployment ID, Git connection
and settings. With separate approval, disconnect the Git repository temporarily for
the strongest stop of Git-triggered deployments. This also stops Git previews.
Ignored Build Step 'Don't build anything' is less disruptive and skips Git builds,
but is not an authorization boundary against manual deployments/CLI/API.
Neither protects against already queued deployments: inspect the queue first.
Do not pause the serving project or delete the existing deployment.

Inventory variable names/scopes without revealing values. Preserve Production values,
then prepare separate Preview and Development credentials/projects in a secure channel.
Scope production DATABASE_URL/service-role/Firebase/mail/AI credentials to Production
only, replacing All Environments only after the isolated replacements are complete.
Check public Supabase URL/key and Realtime project consistency. Offline identity audit
is not a live database verification. No database connections are authorized here.

Restoring Git connection may enable immediate production builds: reconnect only after
approved application SHA, database compatibility and deployment approval; retain a
build block until a controlled deployment is authorized. Confirm no unintended queued
deployment and explicitly select the reviewed SHA. Migration approval is separate.

## Integration proposal, not executed

PR119 already includes 114 + 115/118 + 117. 116 is included in 115. Later approve
120 into the isolated 119 branch, resolve verified overlaps, then run all six suites
on the new combined SHA. Before production eligibility also manually test Driver EXE
and Android. Only after settings verification ask separately for 119 into main.
Do not merge 116/118 again or close original PRs without approval.
