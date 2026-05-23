"use client";

import { useTransition, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { updateWhiteLabelAction } from "./actions";

type WhiteLabelConfig = {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  footerText: string | null;
  shareDomain: string | null;
};

type Props = {
  workspaceId: string;
  initial: WhiteLabelConfig | null;
};

export function WhiteLabelForm({ workspaceId, initial }: Props) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brandName, setBrandName] = useState(initial?.brandName ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    initial?.primaryColor ?? "#0f172a",
  );
  const [accentColor, setAccentColor] = useState(
    initial?.accentColor ?? "#6366f1",
  );
  const [footerText, setFooterText] = useState(initial?.footerText ?? "");
  const [shareDomain, setShareDomain] = useState(initial?.shareDomain ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setError("Brand name is required.");
      return;
    }
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateWhiteLabelAction({
        workspaceId,
        brandName: brandName.trim(),
        logoUrl: logoUrl.trim() || null,
        primaryColor,
        accentColor,
        footerText: footerText.trim() || null,
        shareDomain: shareDomain.trim() || null,
      });
      if (res.ok && res.data.ok) {
        setSaved(true);
      } else {
        setError(!res.ok ? res.error.message : "Failed to save settings.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Brand identity */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Brand identity</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="brand-name" className="text-sm font-medium">
              Brand name
            </label>
            <Input
              id="brand-name"
              placeholder="Acme, Inc."
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              maxLength={120}
              required
            />
            <p className="text-muted-foreground text-xs">
              Appears in PDF headers and share pages.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="logo-url" className="text-sm font-medium">
              Logo URL{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <Input
              id="logo-url"
              type="url"
              placeholder="https://cdn.example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Colors */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Colors</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="primary-color" className="text-sm font-medium">
              Primary color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                pattern="^#[0-9A-Fa-f]{6}$"
                placeholder="#0f172a"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="accent-color" className="text-sm font-medium">
              Accent color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="accent-color"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                pattern="^#[0-9A-Fa-f]{6}$"
                placeholder="#6366f1"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Color preview */}
        <div
          className="flex h-16 items-center rounded-lg px-5"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-6 w-6 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            <span
              className="text-sm font-semibold"
              style={{ color: "#ffffff" }}
            >
              {brandName || "Brand preview"}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Footer + domain */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Footer &amp; sharing</h3>
        <div className="space-y-1.5">
          <label htmlFor="footer-text" className="text-sm font-medium">
            Footer text{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="footer-text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Confidential — prepared exclusively for Acme, Inc."
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="share-domain" className="text-sm font-medium">
            Custom share domain{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            id="share-domain"
            placeholder="reports.example.com"
            value={shareDomain}
            onChange={(e) => setShareDomain(e.target.value)}
            maxLength={120}
          />
          <p className="text-muted-foreground text-xs">
            Requires DNS CNAME configuration. Leave blank to use the default
            domain.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
          {pending ? "Saving…" : saved ? "Saved" : "Save settings"}
        </Button>
        {saved && (
          <p className="text-muted-foreground text-sm">Changes applied.</p>
        )}
      </div>
    </form>
  );
}
