-- Onboarding (docs/ONBOARDING.md): what a member answered on their first
-- open, as they gave it, and when they opened and finished it. The member
-- writes it (a profile field); the owner reads it on the member's page and in
-- Activity, and clears it with Reset onboarding.
alter table accounts add column if not exists onboarding jsonb;
