type PageStubProps = {
  title: string;
  eyebrow?: string;
  note: string;
};

/** Placeholder for tab screens not yet built. Replaced per phase. */
export function PageStub({ title, eyebrow, note }: PageStubProps) {
  return (
    <section>
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">
        {title}
      </h1>
      <div className="mt-4 rounded-[var(--r)] border border-dashed border-border-2 bg-surface p-5 text-sm text-ink-2">
        {note}
      </div>
    </section>
  );
}
