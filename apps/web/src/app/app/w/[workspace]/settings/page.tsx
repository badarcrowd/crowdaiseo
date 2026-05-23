import Link from "next/link";
import {
  Building2,
  Users,
  KeyRound,
  CreditCard,
  Bell,
  Webhook,
  ChevronRight,
} from "lucide-react";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const SECTIONS = [
  { href: "general", label: "General", icon: Building2, description: "Workspace name, slug, region" },
  { href: "members", label: "Members", icon: Users, description: "Invite teammates, manage roles" },
  { href: "api-keys", label: "API keys", icon: KeyRound, description: "Programmatic access to AIV" },
  { href: "billing", label: "Billing", icon: CreditCard, description: "Plan, usage, invoices" },
  { href: "notifications", label: "Notifications", icon: Bell, description: "Alerts, digests, channels" },
  { href: "webhooks", label: "Webhooks", icon: Webhook, description: "Stream events to your stack" },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your workspace and integrations."
      />
      <PageContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <Card className="h-fit">
            <CardContent className="p-2">
              <nav className="space-y-0.5">
                {SECTIONS.map((s) => (
                  <Link
                    key={s.href}
                    href={`#${s.href}`}
                    className="hover:bg-secondary group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors"
                  >
                    <s.icon className="text-muted-foreground group-hover:text-foreground h-4 w-4" />
                    <span className="font-medium">{s.label}</span>
                    <ChevronRight className="text-muted-foreground ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </nav>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card id="general">
              <CardHeader>
                <CardTitle>General</CardTitle>
                <CardDescription>
                  Update workspace identity. Slug appears in URLs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Workspace name" defaultValue="Acme, Inc." />
                  <Field label="URL slug" defaultValue="acme" prefix="/w/" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Default region" defaultValue="US" />
                  <Field label="Reporting timezone" defaultValue="America/New_York" />
                </div>
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm">
                    Discard
                  </Button>
                  <Button size="sm">Save changes</Button>
                </div>
              </CardContent>
            </Card>

            <Card id="billing">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Plan & usage</CardTitle>
                    <CardDescription>
                      Pro plan · renews on May 31, 2026
                    </CardDescription>
                  </div>
                  <Badge variant="info">Pro</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { label: "AI queries", used: 12_430, limit: 50_000 },
                  { label: "Tracked keywords", used: 1_284, limit: 5_000 },
                  { label: "Competitors", used: 5, limit: 25 },
                  { label: "Team seats", used: 8, limit: 15 },
                ].map((u) => {
                  const pct = (u.used / u.limit) * 100;
                  return (
                    <div key={u.label} className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-medium">{u.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {u.used.toLocaleString()} / {u.limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-muted relative h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-foreground h-full rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card id="notifications">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Choose how you receive alerts and digests.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: "Critical alerts",
                    description: "Threshold breaches and ranking drops",
                    on: true,
                  },
                  {
                    label: "Weekly digest",
                    description: "Summary email every Monday",
                    on: true,
                  },
                  {
                    label: "Competitor activity",
                    description: "When a competitor moves significantly",
                    on: false,
                  },
                  {
                    label: "Product updates",
                    description: "New features and best practices",
                    on: true,
                  },
                ].map((n) => (
                  <div
                    key={n.label}
                    className="hover:bg-secondary/40 -mx-2 flex items-center justify-between rounded-md px-2 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{n.label}</div>
                      <div className="text-muted-foreground text-xs">
                        {n.description}
                      </div>
                    </div>
                    <Toggle defaultOn={n.on} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  );
}

function Field({
  label,
  defaultValue,
  prefix,
}: Readonly<{ label: string; defaultValue?: string; prefix?: string }>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {prefix ? (
        <div className="flex">
          <span className="border-input bg-muted text-muted-foreground flex items-center rounded-l-md border border-r-0 px-3 text-sm">
            {prefix}
          </span>
          <Input defaultValue={defaultValue} className="rounded-l-none" />
        </div>
      ) : (
        <Input defaultValue={defaultValue} />
      )}
    </label>
  );
}

function Toggle({ defaultOn }: Readonly<{ defaultOn?: boolean }>) {
  return (
    <button
      type="button"
      data-state={defaultOn ? "on" : "off"}
      className="data-[state=on]:bg-foreground bg-muted relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors"
      aria-pressed={defaultOn}
    >
      <span
        className={`bg-background pointer-events-none block h-4 w-4 translate-x-0.5 transform rounded-full shadow-sm transition-transform ${defaultOn ? "translate-x-4" : ""}`}
      />
    </button>
  );
}
