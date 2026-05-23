import { cn } from "@/lib/utils/cn";

export function Avatar({
  name,
  className,
}: Readonly<{ name: string; className?: string }>) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium",
        className,
      )}
    >
      {initials}
    </div>
  );
}
