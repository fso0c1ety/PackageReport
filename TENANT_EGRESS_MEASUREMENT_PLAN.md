# Tenant Egress Measurement Plan

## Principle

Record metadata only: tenant/workspace identifier hashed or pseudonymized, route category, method, status, request/response byte counts, duration, cache result, Realtime message byte count, and a time bucket. Never record tokens, passwords, payloads, message bodies, names, or personal data.

## Low-overhead design

1. Add server-side request instrumentation that samples and aggregates counters in memory per short bucket; flush batched aggregates through an approved internal channel.
2. Use response `Content-Length` when trustworthy and otherwise measure serialized bytes at the server boundary. Label browser transfer and Supabase egress as different measures.
3. Add a client network observer only in isolated test builds, not continuous Production polling.
4. Attribute shared jobs, pooler traffic, admin actions, and Realtime separately from tenant traffic.
5. Include `source=browser|server|job|storage|realtime`, route category, workspace pseudonym, and confidence level.

## Acceptance

- BASE and HEAD use the same fixture, user roles, duration, browser, cache state, and network conditions.
- Idle scenarios run with no extra polling introduced by instrumentation.
- Production reads, if later approved, are passive and bounded; no statistics reset.
- Monthly forecasts are estimates and show assumptions and confidence intervals.
