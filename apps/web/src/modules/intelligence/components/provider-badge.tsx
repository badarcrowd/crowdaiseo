import { cn } from "@/lib/utils/cn";

type Provider = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "PERPLEXITY" | string;

const PROVIDER_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  OPENAI: {
    label: "ChatGPT",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
  ANTHROPIC: {
    label: "Claude",
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/20",
  },
  GOOGLE: {
    label: "Gemini",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
  },
  PERPLEXITY: {
    label: "Perplexity",
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
  },
};

const PROVIDER_COLORS: Record<string, string> = {
  OPENAI: "hsl(142 65% 50%)",
  ANTHROPIC: "hsl(25 90% 55%)",
  GOOGLE: "hsl(217 91% 65%)",
  PERPLEXITY: "hsl(271 76% 65%)",
};

export function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? "hsl(var(--muted-foreground))";
}

type Props = {
  provider: Provider;
  className?: string;
  size?: "xs" | "sm";
};

export function ProviderBadge({ provider, className, size = "sm" }: Readonly<Props>) {
  const cfg = PROVIDER_CONFIG[provider] ?? {
    label: provider,
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        cfg.bg,
        cfg.color,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
