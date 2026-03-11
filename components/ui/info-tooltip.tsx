export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] font-medium leading-none text-muted-foreground outline-none transition-colors hover:border-foreground hover:text-foreground focus:border-foreground focus:text-foreground"
      >
        i
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs leading-snug text-foreground shadow-md group-focus-within:block group-hover:block">
        {text}
      </span>
    </span>
  );
}
