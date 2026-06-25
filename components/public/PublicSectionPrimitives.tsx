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

type PublicHeroPreviewProps = PublicAccentProps & {
  kicker: string;
  caption: ReactNode;
  children: ReactNode;
};

type PublicMediaCardProps = PublicAccentProps & {
  kicker: string;
  title: string;
  badge?: string;
  media: ReactNode;
  caption?: ReactNode;
};

type PublicBundleMetric = {
  label: string;
  value: number | string;
};

type PublicBundleCardProps = PublicAccentProps & {
  kicker: string;
  title: string;
  body: ReactNode;
  status?: string;
  metrics?: PublicBundleMetric[];
  chips?: string[];
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

export function PublicHeroPreview({ accent, kicker, caption, children }: PublicHeroPreviewProps) {
  return (
    <aside
      className="public-hero-preview"
      style={{ '--public-section-accent': accent } as CSSProperties}
    >
      <div className="public-hero-preview-media">{children}</div>
      <div className="public-hero-preview-caption">
        <div className="public-card-kicker">{kicker}</div>
        <div className="public-card-body">{caption}</div>
      </div>
    </aside>
  );
}

export function PublicMediaCard({ accent, kicker, title, badge, media, caption }: PublicMediaCardProps) {
  return (
    <article
      className="public-media-card"
      style={{ '--public-section-accent': accent } as CSSProperties}
    >
      <div className="public-media-card-head">
        <div>
          <div className="public-card-kicker">{kicker}</div>
          <h3>{title}</h3>
        </div>
        {badge ? <span>{badge}</span> : null}
      </div>
      <div className="public-media-card-frame">{media}</div>
      {caption ? <div className="public-card-body">{caption}</div> : null}
    </article>
  );
}

export function PublicBundleCard({ accent, kicker, title, body, status, metrics = [], chips = [] }: PublicBundleCardProps) {
  return (
    <article
      className="public-bundle-card"
      style={{
        '--public-section-accent': accent,
        '--public-bundle-metric-count': Math.max(metrics.length, 1)
      } as CSSProperties}
    >
      <div className="public-bundle-card-head">
        <div>
          <div className="public-card-kicker">{kicker}</div>
          <h3>{title}</h3>
        </div>
        {status ? <span className="public-bundle-status">{status}</span> : null}
      </div>
      <div className="public-card-body">{body}</div>
      {metrics.length > 0 ? (
        <div className="public-bundle-metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="public-bundle-metric">
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      {chips.length > 0 ? (
        <div className="public-bundle-chips">
          {chips.map((chip) => <span key={chip}>{chip}</span>)}
        </div>
      ) : null}
    </article>
  );
}
