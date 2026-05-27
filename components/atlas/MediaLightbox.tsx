'use client';

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

type MediaLightboxProps = {
  src: string;
  label: string;
  type: string;
  credit?: string;
  isDrawing?: boolean;
  accent: string;
  children: ReactNode;
};

export function MediaLightbox({ src, label, type, credit, isDrawing = false, accent, children }: MediaLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('cosmos-lightbox-open');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('cosmos-lightbox-open');
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="entry-media-open"
        onClick={() => setIsOpen(true)}
        aria-label={`${label} im Vollbild öffnen`}
        style={{ '--entry-accent': accent } as CSSProperties}
      >
        {children}
        <span className="entry-media-open-hint" aria-hidden="true">Vollbild</span>
      </button>

      {isOpen ? (
        <div className="cosmos-media-lightbox" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button className="cosmos-media-lightbox-backdrop" type="button" aria-label="Vollbild schließen" onClick={() => setIsOpen(false)} />
          <figure className="cosmos-media-lightbox-frame" style={{ '--entry-accent': accent } as CSSProperties}>
            <div className="cosmos-media-lightbox-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element -- Static export serves archive media directly. */}
              <img
                src={src}
                alt={label}
                className={`cosmos-media-lightbox-image ${isDrawing ? 'cosmos-media-lightbox-image-drawing' : ''}`}
              />
            </div>
            <figcaption className="cosmos-media-lightbox-caption">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>{type}</div>
                <h2 id={titleId}>{label}</h2>
                {credit ? <p>{credit}</p> : null}
              </div>
              <button type="button" className="cosmos-media-lightbox-close" onClick={() => setIsOpen(false)}>
                Schließen
              </button>
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}
