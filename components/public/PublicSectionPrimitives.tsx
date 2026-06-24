import type { CSSProperties, ReactNode } from 'react';

type PublicAccentProps = {
  accent: string;
};

type PublicSplitSectionProps = PublicAccentProps & {
  kicker: string;
  title: string;
  body: ReactNode;
  children: ReactNode;
  id?: string;
};

type PublicCardGridProps = {
  children: ReactNode;
  columns?: 2 | 3 | 4;
};

type PublicInfoCardProps = PublicAccentProps & {
  title: string;
  body: ReactNode;
  kicker?: string;
};

type PublicMetricCardProps = PublicAccentProps & {
  label: string;
  value: number | string;
  detail?: ReactNode;
};

export function PublicSplitSection({ accent, kicker, title, body, children, id }: PublicSplitSectionProps) {
  return (
    <section
      id={id}
      className="public-section-split"
      style={{ '--public-section-accent': accent } as CSSProperties}
    >
      <div className="public-section-copy">
        <div className="public-section-kicker">{kicker}</div>
        <h2>{title}</h2>
        <div className="public-section-body">{body}</div>
      </div>
      <div className="public-section-content">{children}</div>
    </section>
  );
}

export function PublicCardGrid({ children, columns = 2 }: PublicCardGridProps) {
  return (
    <div className="public-card-grid" data-columns={columns}>
      {children}
    </div>
  );
}

export function PublicInfoCard({ accent, kicker, title, body }: PublicInfoCardProps) {
  return (
    <article
      className="public-info-card"
      style={{ '--public-section-accent': accent } as CSSProperties}
    >
      {kicker ? <div className="public-card-kicker">{kicker}</div> : null}
      <h3>{title}</h3>
      <div className="public-card-body">{body}</div>
    </article>
  );
}

export function PublicMetricCard({ accent, label, value, detail }: PublicMetricCardProps) {
  return (
    <article
      className="public-metric-card"
      style={{ '--public-section-accent': accent } as CSSProperties}
    >
      <div className="public-metric-value">{value}</div>
      <div className="public-card-kicker">{label}</div>
      {detail ? <div className="public-card-body">{detail}</div> : null}
    </article>
  );
}
