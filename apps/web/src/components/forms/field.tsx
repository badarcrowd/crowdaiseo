import { cn } from "@/lib/utils/cn";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: Readonly<{
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="flex items-center gap-1 text-sm font-medium">
        {label}
        {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {error ? (
        <span className="text-destructive text-xs">{error}</span>
      ) : hint ? (
        <span className="text-muted-foreground text-xs">{hint}</span>
      ) : null}
    </label>
  );
}

export function TagInput({
  values,
  onChange,
  placeholder,
  max,
}: Readonly<{
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
}>) {
  const remove = (i: number) =>
    onChange(values.filter((_, idx) => idx !== i));
  const add = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    if (values.includes(cleaned)) return;
    if (max !== undefined && values.length >= max) return;
    onChange([...values, cleaned]);
  };

  return (
    <div className="border-input bg-background focus-within:ring-ring flex min-h-[40px] flex-wrap items-center gap-1 rounded-md border px-2 py-1.5 focus-within:ring-2 focus-within:ring-offset-1">
      {values.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs"
        >
          {v}
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${v}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={values.length === 0 ? placeholder : ""}
        className="placeholder:text-muted-foreground min-w-[120px] flex-1 bg-transparent text-sm focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add((e.currentTarget as HTMLInputElement).value);
            (e.currentTarget as HTMLInputElement).value = "";
          } else if (
            e.key === "Backspace" &&
            (e.currentTarget as HTMLInputElement).value === "" &&
            values.length > 0
          ) {
            remove(values.length - 1);
          }
        }}
        onBlur={(e) => {
          add(e.currentTarget.value);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
