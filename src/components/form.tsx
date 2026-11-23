import type { ReactNode } from "react";

// Shared form controls for the capture wizards, modelled on the arecanut wizard's
// Field / YesNo / MultiChip components.

export function Field({ label, required, error, hint, children, wide }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    // A div, not a label: a label wrapping button groups would "click" the first button when its text is clicked.
    <div className={`block ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="block text-xs font-semibold text-ink mb-1">
        {label} {required && <span className="text-bad">*</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-[11px] text-muted mt-1">{hint}</span>}
      {error && <span className="block text-[11px] font-semibold text-bad mt-1">{error}</span>}
    </div>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}

export function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-gt-purple border-b border-border pb-1.5">{title}</h3>
      {children}
    </section>
  );
}

export function YesNo({ value, onChange }: { value: "Yes" | "No"; onChange: (v: "Yes" | "No") => void }) {
  return (
    <div className="flex gap-2">
      {(["Yes", "No"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${value === v ? "bg-gt-purple text-white border-gt-purple" : "bg-white text-ink border-border hover:border-gt-purple/40"}`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export function MultiChip({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${value.includes(o) ? "bg-gt-purple text-white border-gt-purple" : "bg-white text-muted border-border hover:border-gt-purple/40"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[] | { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.value} value={o.value}>{o.label}</option>
        )
      )}
    </select>
  );
}

// ---------- Validation helpers (same rules as the arecanut wizard) ----------

export const isBlank = (s: string) => s.trim() === "";
export const decimals = (s: string) => (s.includes(".") ? s.split(".")[1].length : 0);

export function checkNumber(s: string, { required = false, min, max, maxDecimals, whole }: { required?: boolean; min?: number; max?: number; maxDecimals?: number; whole?: boolean } = {}): string | undefined {
  if (isBlank(s)) return required ? "Required." : undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) return "Enter a number.";
  if (min !== undefined && n < min) return `Must be at least ${min}.`;
  if (max !== undefined && n > max) return `Must be at most ${max}.`;
  if (whole && !Number.isInteger(n)) return "Whole numbers only, no decimals.";
  if (maxDecimals !== undefined && decimals(s) > maxDecimals) return `Maximum ${maxDecimals} decimal place${maxDecimals === 1 ? "" : "s"}.`;
  return undefined;
}

// Client-side image compression (longest side 1024 px, JPEG quality 0.7), as in the arecanut app.
export function compressImage(file: File, maxSide = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("This file is not an image."));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
