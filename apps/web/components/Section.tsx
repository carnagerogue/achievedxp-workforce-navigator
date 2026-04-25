type Tone = 'teal' | 'amber' | 'rose' | 'slate';

const DOT_CLASSES: Record<Tone, string> = {
  teal:  'bg-teal-500',
  amber: 'bg-amber-500',
  rose:  'bg-rose-500',
  slate: 'bg-slate-400',
};

type Props = {
  title: string;
  count?: number;
  description?: string;
  tone?: Tone;
  children: React.ReactNode;
};

export function Section({ title, count, description, tone = 'slate', children }: Props) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="flex items-baseline gap-2.5 text-lg font-semibold text-navy-900">
          <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[tone]}`} aria-hidden />
          {title}
          {typeof count === 'number' && (
            <span className="text-sm font-medium text-slate-500">({count.toLocaleString()})</span>
          )}
        </h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}
