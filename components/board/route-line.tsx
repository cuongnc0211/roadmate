type Props = {
  from: string;
  to: string;
  fromNote?: string | null;
};

/** Origin dot → dashed line → destination ring, with point names. */
export function RouteLine({ from, to, fromNote }: Props) {
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center pt-1">
        <span className="size-2.5 rounded-full bg-primary" />
        <span className="my-0.5 min-h-4 w-0.5 flex-1 bg-[repeating-linear-gradient(var(--border-2)_0_4px,transparent_4px_8px)]" />
        <span className="size-2.5 rounded-full border-[2.5px] border-accent" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{from}</p>
          {fromNote ? (
            <p className="truncate text-[11.5px] text-ink-3">{fromNote}</p>
          ) : null}
        </div>
        <p className="truncate text-sm font-semibold text-ink">{to}</p>
      </div>
    </div>
  );
}
