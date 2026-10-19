# Monthly Usage Simulation

No measured per-tenant byte rate is available yet, so the following are scenario formulas, not claims about Smart Manage usage.

`monthly_GB = (daily_MB × active_days × clients) / 1024`.

| Scenario | Assumption | Formula |
|---|---|---|
| Light | 5 MB/day/client, 22 days | 0.108 GB/client/month |
| Normal | 25 MB/day/client, 22 days | 0.537 GB/client/month |
| Intensive | 150 MB/day/client, 22 days | 3.223 GB/client/month |
| 10 normal clients | 25 MB/day/client, 22 days | 5.371 GB/month |
| 50 normal clients | 25 MB/day/client, 22 days | 26.855 GB/month |
| 100 normal clients | 25 MB/day/client, 22 days | 53.711 GB/month |

These assumptions must be replaced by measured request, Storage, Realtime, and shared-service bytes. A 1–5 GB target cannot be presented as a guarantee until those sources are attributed.
