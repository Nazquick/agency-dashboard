"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isValidPathSlug } from "@/lib/whitelabel/reserved-slugs";

function slugifyBusinessName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const LAYOUTS = [
  { value: "top-nav", label: "Top nav", description: "A horizontal bar across the top — today's default DYOR look." },
  { value: "sidebar", label: "Sidebar", description: "A fixed left-hand rail with the same navigation." },
  { value: "compact", label: "Compact", description: "Tighter spacing and smaller rows for dense screens." },
  { value: "minimal", label: "Minimal", description: "Flatter, monochrome, quieter visual style." },
] as const;

type LayoutVariant = (typeof LAYOUTS)[number]["value"];

type FormState = {
  businessName: string;
  contactName: string;
  contactEmail: string;
  logoUrl: string | null;
  layoutVariant: LayoutVariant;
  brandPrimaryColor: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  schemaConfirmed: boolean;
  customDomain: string;
  pathSlug: string;
};

const STEPS = ["Business", "Logo", "Layout", "Supabase", "Review"] as const;

type ProvisionResult = {
  tenantId: string;
  vercelDeployUrl: string;
  envChecklist: { name: string; value: string }[];
  tenantAdminCredentials: { email: string; password: string };
  sqlScriptHref: string;
  pathSlug: string;
};

export function OnboardingForm({ token }: { token: string }) {
  const [step, setStep] = useState(0);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    businessName: "",
    contactName: "",
    contactEmail: "",
    logoUrl: null,
    layoutVariant: "top-nav",
    brandPrimaryColor: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseServiceRoleKey: "",
    schemaConfirmed: false,
    customDomain: "",
    pathSlug: "",
  });
  const [slugTouched, setSlugTouched] = useState(false);

  const suggestedSlug = slugifyBusinessName(form.businessName);
  const effectiveSlug = slugTouched ? form.pathSlug : suggestedSlug;
  const slugValid = effectiveSlug.length === 0 || isValidPathSlug(effectiveSlug);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return !!form.businessName.trim() && !!form.contactEmail.trim();
      case 1:
        return true; // logo is optional
      case 2:
        return true;
      case 3:
        return (
          !!form.supabaseUrl.trim() &&
          !!form.supabaseAnonKey.trim() &&
          !!form.supabaseServiceRoleKey.trim() &&
          form.schemaConfirmed &&
          effectiveSlug.length > 0 &&
          slugValid
        );
      default:
        return true;
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/onboard/${token}/logo`, { method: "POST", body });
    const json = await res.json();
    setUploadingLogo(false);

    if (!res.ok) {
      toast.error(json.error ?? "Logo upload failed");
      return;
    }
    update("logoUrl", json.url);
    toast.success("Logo uploaded");
  }

  async function handleSubmit() {
    setSubmitting(true);
    const res = await fetch(`/api/onboard/${token}/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: form.businessName,
        contact_name: form.contactName,
        contact_email: form.contactEmail,
        logo_url: form.logoUrl,
        layout_variant: form.layoutVariant,
        brand_primary_color: form.brandPrimaryColor || null,
        supabase_url: form.supabaseUrl,
        supabase_anon_key: form.supabaseAnonKey,
        supabase_service_role_key: form.supabaseServiceRoleKey,
        custom_domain: form.customDomain || null,
        path_slug: effectiveSlug,
      }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      toast.error(json.error ?? "Setup failed");
      return;
    }
    setResult(json as ProvisionResult);
  }

  if (result) {
    return <ProvisionSuccess result={result} />;
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={cn(
                "flex items-center gap-2",
                i === step && "font-medium text-foreground"
              )}
            >
              {i > 0 && <span className="text-muted-foreground/40">→</span>}
              {label}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business name</Label>
              <Input
                id="business-name"
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-name">Your name</Label>
              <Input
                id="contact-name"
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Your admin email</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This email will have full admin access to your dashboard — roles, salaries,
                quotas, everything.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Label>Logo (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="block text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
            {uploadingLogo && <p className="text-xs text-muted-foreground">Uploading…</p>}
            {form.logoUrl && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logoUrl} alt="Logo preview" className="h-10 w-10 rounded object-contain" />
                <p className="text-xs text-muted-foreground">Uploaded</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="brand-color">Brand primary color (optional)</Label>
              <Input
                id="brand-color"
                placeholder="e.g. #1a3d2b"
                value={form.brandPrimaryColor}
                onChange={(e) => update("brandPrimaryColor", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Label>Choose a layout</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {LAYOUTS.map((layout) => (
                <button
                  key={layout.value}
                  type="button"
                  onClick={() => update("layoutVariant", layout.value)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors hover:bg-muted/60",
                    form.layoutVariant === layout.value && "border-foreground bg-muted/60"
                  )}
                >
                  <p className="text-sm font-medium">{layout.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{layout.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Create a free project at{" "}
              <a
                href="https://supabase.com/dashboard/new"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                supabase.com
              </a>{" "}
              if you haven&apos;t already, then paste its connection details below.
            </p>
            <div className="space-y-2">
              <Label htmlFor="supabase-url">Supabase project URL</Label>
              <Input
                id="supabase-url"
                placeholder="https://xxxx.supabase.co"
                value={form.supabaseUrl}
                onChange={(e) => update("supabaseUrl", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supabase-anon-key">Anon (public) key</Label>
              <Textarea
                id="supabase-anon-key"
                rows={2}
                value={form.supabaseAnonKey}
                onChange={(e) => update("supabaseAnonKey", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supabase-service-role-key">Service role key</Label>
              <Textarea
                id="supabase-service-role-key"
                rows={2}
                value={form.supabaseServiceRoleKey}
                onChange={(e) => update("supabaseServiceRoleKey", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used once, right now, to set up your first two logins. It is never stored.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="path-slug">Your dashboard address</Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">dyor.studio/</span>
                <Input
                  id="path-slug"
                  className="max-w-48"
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update("pathSlug", e.target.value.toLowerCase());
                  }}
                />
              </div>
              {!slugValid && (
                <p className="text-xs text-destructive">
                  Lowercase letters, numbers, and hyphens only — and not already taken.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-domain">Own domain instead? (optional)</Label>
              <Input
                id="custom-domain"
                placeholder="dashboard.yourbusiness.com"
                value={form.customDomain}
                onChange={(e) => update("customDomain", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You can always add this later from your Vercel project&apos;s Domains settings.
              </p>
            </div>
            <div className="rounded-lg border border-dashed p-3">
              <a
                href="/whitelabel/tenant-schema.sql"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline"
              >
                Download the setup SQL script
              </a>
              <p className="mt-1 text-xs text-muted-foreground">
                Run it once, in full, in your Supabase project&apos;s SQL Editor before continuing.
              </p>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <Checkbox
                  checked={form.schemaConfirmed}
                  onCheckedChange={(checked) => update("schemaConfirmed", checked === true)}
                />
                I&apos;ve already run the setup SQL script in my Supabase project
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <ReviewRow label="Business" value={form.businessName} />
              <ReviewRow label="Admin email" value={form.contactEmail} />
              <ReviewRow label="Layout" value={LAYOUTS.find((l) => l.value === form.layoutVariant)?.label ?? ""} />
              <ReviewRow label="Logo" value={form.logoUrl ? "Uploaded" : "None"} />
              <ReviewRow label="Dashboard address" value={`dyor.studio/${effectiveSlug}`} />
              <ReviewRow label="Custom domain" value={form.customDomain || "Not set"} />
            </div>
            <Button className="w-full" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Setting up…" : "Set up my dashboard"}
            </Button>
          </div>
        )}

        <div className="flex justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEPS.length - 1 && (
            <Button
              type="button"
              disabled={!canAdvance()}
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ProvisionSuccess({ result }: { result: ProvisionResult }) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold">You&apos;re almost live</h2>
          <p className="text-sm text-muted-foreground">
            Your first login, then click Deploy to finish setting up your own hosted dashboard.
          </p>
        </div>

        <div className="space-y-1 rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Your login</p>
          <p className="text-sm">
            <span className="font-medium">{result.tenantAdminCredentials.email}</span>
            {" · "}
            <span className="font-mono">{result.tenantAdminCredentials.password}</span>
          </p>
          <p className="text-xs text-muted-foreground">Change this password after your first sign-in.</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">1. Deploy your dashboard</p>
          <a href={result.vercelDeployUrl} target="_blank" rel="noopener noreferrer">
            <Button className="w-full">Deploy to Vercel</Button>
          </a>
          <p className="text-xs text-muted-foreground">
            You&apos;ll log into your own Vercel (and GitHub) account. When prompted for
            environment variables, paste the values below.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">2. Paste these values into Vercel</p>
          <div className="space-y-1 rounded-lg border p-3 text-xs">
            {result.envChecklist.map((item) => (
              <div key={item.name} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="truncate font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Your address</p>
          <p className="text-sm font-medium">dyor.studio/{result.pathSlug}</p>
          <p className="text-xs text-muted-foreground">
            Goes live once DYOR confirms your deploy succeeded — usually within a day.
          </p>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">A few notes</p>
          <p>Use your OWN Anthropic/Resend accounts for AI and email features — don&apos;t reuse DYOR&apos;s.</p>
          <p>Once deployed, add your custom domain from your Vercel project&apos;s Domains settings.</p>
        </div>
      </CardContent>
    </Card>
  );
}
