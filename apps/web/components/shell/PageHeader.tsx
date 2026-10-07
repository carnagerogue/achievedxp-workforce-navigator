/**
 * The one page header every app page uses: a small section label, a plain
 * title, one sentence on what the page is for, and the page's own actions.
 */
export function PageHeader({ eyebrow, title, description, actions, id, className = '' }: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  id?: string;
  /** Extra spacing classes for pages that lay out with margins rather than space-y. */
  className?: string;
}) {
  return (
    <header className={'page-header flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between ' + className}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p>}
        <h1 id={id} className="mt-2 text-[28px] font-bold leading-[1.12] tracking-[-0.03em] text-navy-900 sm:text-[36px]">{title}</h1>
        {description && <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
