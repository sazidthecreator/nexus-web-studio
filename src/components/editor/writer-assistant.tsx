import { useMemo, useState } from "react";
import { analyzeText } from "@/lib/writer";
import { rewriteHeadline } from "@/lib/writer/headlines";
import { checkSpelling, type SpellSuggestion } from "@/lib/writer/spelling";
import { slugify } from "@/lib/writer/slug";
import { Sparkles, AlertTriangle, BookOpen, Tags, Wand2, Eye, Copy, Check, Link2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

type ApplyFix = (next: string) => void;

/**
 * Self-contained, offline writer assistant. Drop in anywhere a string of
 * content needs analysis. Works with empty content and never throws.
 *
 * If `onApplyFix` is provided, the issues panel shows an inline preview
 * of the text with clickable, one-click replacements.
 */
export function WriterAssistant({
  text,
  onApplyMeta,
  onApplyHeadline,
  onApplyFix,
}: {
  text: string;
  onApplyMeta?: (value: string) => void;
  onApplyHeadline?: (value: string) => void;
  /** Called with the full corrected text when user accepts a fix. */
  onApplyFix?: ApplyFix;
}) {
  const result = useMemo(() => analyzeText(text || ""), [text]);
  const headlines = useMemo(() => {
    const firstLine = (text || "").split(/\n/)[0]?.trim() || "";
    return firstLine.length >= 6 ? rewriteHeadline(firstLine) : [];
  }, [text]);

  const [showInline, setShowInline] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const slug = useMemo(() => {
    const firstLine = (text || "").split(/\n/)[0]?.trim() || "";
    return firstLine ? slugify(firstLine) : "";
  }, [text]);

  function copyToClipboard(value: string, key: string) {
    if (!value) return;
    try {
      navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  if (!result.ok) {
    return <div className="text-xs text-muted-foreground">Couldn’t analyze this content.</div>;
  }

  const r = result.readability;
  const dominantTone = result.tone.dominant;
  const issues = result.issues;

  function applyAllFixes() {
    if (!onApplyFix) return;
    // Recompute from the live text so offsets are stable, then splice
    // from end → start so earlier indices stay valid.
    const fresh = checkSpelling(text);
    if (!fresh.length) return;
    let next = text;
    for (let i = fresh.length - 1; i >= 0; i--) {
      const f = fresh[i];
      next = next.slice(0, f.start) + f.suggestion + next.slice(f.end);
    }
    onApplyFix(next);
  }

  function applyOne(s: SpellSuggestion) {
    if (!onApplyFix) return;
    const next = text.slice(0, s.start) + s.suggestion + text.slice(s.end);
    onApplyFix(next);
  }

  return (
    <div className="space-y-4 text-sm">
      <Section icon={BookOpen} label="Readability">
        <div className="flex items-center justify-between">
          <span className="font-medium">{r.fleschReadingEase}/100</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{r.level}</span>
        </div>
        <Bar value={Math.max(0, Math.min(100, r.fleschReadingEase))} />
        <p className="text-xs text-muted-foreground mt-1">{r.hint}</p>
        <div className="grid grid-cols-3 gap-2 text-xs mt-2 text-muted-foreground">
          <Stat label="Words" value={r.words} />
          <Stat label="Sentences" value={r.sentences} />
          <Stat label="Grade" value={r.fleschKincaidGrade} />
        </div>
      </Section>

      <Section icon={Tags} label="Tone">
        {dominantTone ? (
          <div className="flex items-center justify-between">
            <span className="capitalize font-medium">{dominantTone}</span>
            <span className="text-xs text-muted-foreground">{result.tone.hint}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{result.tone.hint}</p>
        )}
      </Section>

      <Section icon={Sparkles} label="Suggested meta description">
        <p className="text-xs">{result.meta || <span className="text-muted-foreground">Add more content for a suggestion.</span>}</p>
        {result.meta && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className={`text-[10px] uppercase tracking-wide ${
                result.meta.length > 160 ? "text-amber-600" : "text-muted-foreground"
              }`}
            >
              {result.meta.length}/160 chars
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => copyToClipboard(result.meta, "meta")}
                className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                aria-label="Copy meta description"
              >
                {copied === "meta" ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied === "meta" ? "Copied" : "Copy"}
              </button>
              {onApplyMeta && (
                <button
                  type="button"
                  onClick={() => onApplyMeta(result.meta)}
                  className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-primary"
                >
                  Use this
                </button>
              )}
            </div>
          </div>
        )}
      </Section>

      {slug && (
        <Section icon={Link2} label="URL slug suggestion">
          <div className="flex items-center justify-between gap-2">
            <code className="text-xs font-mono text-foreground/90 truncate">/{slug}</code>
            <button
              type="button"
              onClick={() => copyToClipboard(slug, "slug")}
              className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-primary inline-flex items-center gap-1 shrink-0"
              aria-label="Copy slug"
            >
              {copied === "slug" ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied === "slug" ? "Copied" : "Copy"}
            </button>
          </div>
        </Section>
      )}

      {headlines.length > 0 && (
        <Section icon={Sparkles} label="Headline variants">
          <ul className="space-y-1">
            {headlines.map((h) => (
              <li key={h.style} className="flex items-start gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-14 shrink-0 mt-1">{h.style}</span>
                <span className="flex-1 text-xs">{h.text}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(h.text, `h-${h.style}`)}
                  className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  aria-label={`Copy ${h.style} headline`}
                >
                  {copied === `h-${h.style}` ? <Check className="size-3" /> : <Copy className="size-3" />}
                </button>
                {onApplyHeadline && (
                  <button
                    type="button"
                    onClick={() => onApplyHeadline(h.text)}
                    className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-primary"
                  >
                    Use
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {issues.length > 0 && (
        <Section icon={AlertTriangle} label={`Issues (${issues.length})`}>
          <div className="flex items-center gap-2 mb-2">
            {onApplyFix && (
              <button
                type="button"
                onClick={applyAllFixes}
                className="text-[11px] inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 hover:border-primary/40"
              >
                <Wand2 className="size-3" /> Apply all
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowInline((v) => !v)}
              className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Eye className="size-3" /> {showInline ? "Hide preview" : "Show preview"}
            </button>
          </div>

          {showInline && onApplyFix && (
            <InlinePreview text={text} issues={issues} onAccept={applyOne} />
          )}

          <ul className="space-y-1 max-h-40 overflow-auto mt-2">
            {issues.slice(0, 25).map((s, i) => (
              <li key={`${s.start}-${i}`} className="text-xs flex items-center gap-2">
                <span className="line-through text-muted-foreground">{s.original}</span>
                <span aria-hidden>→</span>
                <span className="font-medium">{s.suggestion}</span>
                {onApplyFix && (
                  <button
                    type="button"
                    onClick={() => applyOne(s)}
                    className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground hover:text-primary"
                  >
                    Fix
                  </button>
                )}
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.reason}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

/** Renders the source text with each issue wrapped in a clickable popover. */
function InlinePreview({
  text,
  issues,
  onAccept,
}: {
  text: string;
  issues: SpellSuggestion[];
  onAccept: (s: SpellSuggestion) => void;
}) {
  // Build segments: alternating plain text + issue spans.
  const segments: Array<{ type: "text" | "issue"; value: string; issue?: SpellSuggestion }> = [];
  let cursor = 0;
  for (const s of issues) {
    if (s.start > cursor) segments.push({ type: "text", value: text.slice(cursor, s.start) });
    segments.push({ type: "issue", value: text.slice(s.start, s.end), issue: s });
    cursor = s.end;
  }
  if (cursor < text.length) segments.push({ type: "text", value: text.slice(cursor) });

  return (
    <div className="rounded-md border border-border bg-muted/40 p-2 text-xs leading-relaxed whitespace-pre-wrap break-words max-h-44 overflow-auto">
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <Popover key={i}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="bg-amber-500/15 underline decoration-amber-500 decoration-wavy decoration-from-font underline-offset-2 hover:bg-amber-500/25 rounded px-0.5"
                title={`${seg.issue!.reason}: replace with “${seg.issue!.suggestion}”`}
              >
                {seg.value}
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-56 p-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                {seg.issue!.reason === "typo" ? "Typo" : "Phrasing"}
              </div>
              <div className="text-xs mb-2">
                <span className="line-through text-muted-foreground">{seg.issue!.original}</span>{" "}
                <span aria-hidden>→</span>{" "}
                <span className="font-medium">{seg.issue!.suggestion}</span>
              </div>
              <button
                type="button"
                onClick={() => onAccept(seg.issue!)}
                className="w-full text-xs rounded-md bg-primary text-primary-foreground py-1.5 hover:opacity-90"
              >
                Replace
              </button>
            </PopoverContent>
          </Popover>
        ),
      )}
    </div>
  );
}

function Section({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3 bg-card">
      <div className="flex items-center gap-1.5 mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      {children}
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
      <div className="h-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
      <div className="text-foreground text-xs font-medium">{value}</div>
    </div>
  );
}
