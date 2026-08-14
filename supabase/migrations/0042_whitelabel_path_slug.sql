-- whitelabel:exclude-file
-- Path-based tenant routing: DYOR's own app proxies dyor.studio/{slug}/*
-- through to the tenant's actual deployment (see app/[slug]/[[...path]]/
-- route.ts). Nullable + unique — only set for tenants who choose a path
-- slug during onboarding instead of (or alongside) their own domain.

alter table public.whitelabel_tenants add column path_slug text unique;
