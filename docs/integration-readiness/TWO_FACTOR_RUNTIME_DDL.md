# Two-factor runtime DDL removal

Migration `017_optional_two_factor.sql` owns `users.two_factor_enabled`. The new additive migration `047_two_factor_otp_challenges.sql` owns `auth_otp_challenges` and `idx_auth_otp_user_created`; no earlier migration or current schema inventory contained those objects.

The two-factor route and OTP helper no longer create or alter schema during requests. The migration enables RLS and revokes direct table access from `PUBLIC`, `anon`, and `authenticated`; the existing backend database owner/service path remains responsible for OTP operations. OTP expiry (10 minutes), five-attempt limit, single-use `consumed_at`, HMAC hashing and timing-safe comparison remain unchanged. Verification now locks the challenge row in a transaction, rolls back all early-return paths, and releases the client in `finally`, preventing two concurrent sessions from consuming the same OTP or returning an open transaction to the pool. Missing schema now fails through the normal database operation instead of silently repairing it.

The migration is numbered 047 to avoid collision with the guarded forward-plan range 044–046. It must be applied only after the approved migration ledger sequence and after verifying the `users` table exists. Rollback is a code revert plus an approved schema rollback plan; the migration is additive and no destructive rollback is proposed.
