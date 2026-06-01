type PermissionVariant = {
  role: {
    id: string;
    label: string;
    level: string;
  };
  permissions: {
    can_open_design_review: boolean;
    can_request_design_generation: boolean;
    can_approve_local: boolean;
    can_approve_public: boolean;
    read_only: boolean;
  };
  learning_support: {
    enabled: boolean;
  };
};

type PermissionMatrixProps = {
  variants: PermissionVariant[];
};

const permissionColumns = [
  {
    key: 'can_open_design_review',
    label: 'Design Review',
    on: 'oeffnen',
    off: 'gesperrt'
  },
  {
    key: 'can_request_design_generation',
    label: 'Design-Generation',
    on: 'anfragen',
    off: 'blockiert'
  },
  {
    key: 'can_approve_local',
    label: 'Lokal freigeben',
    on: 'ja',
    off: 'nein'
  },
  {
    key: 'can_approve_public',
    label: 'Public Gate',
    on: 'sichtbar',
    off: 'blockiert'
  },
  {
    key: 'read_only',
    label: 'Read-only',
    on: 'nur lesen',
    off: 'aktiv'
  }
] as const;

function PermissionPill({ enabled, on, off }: { enabled: boolean; on: string; off: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-tight ${
        enabled
          ? 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100'
          : 'border-rose-300/35 bg-rose-500/10 text-rose-100'
      }`}
    >
      {enabled ? on : off}
    </span>
  );
}

export function OrbitPermissionMatrix({ variants }: PermissionMatrixProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/28 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Rechte-Matrix</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Wer darf was in KosmoOrbit?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Die Matrix macht den Produktvertrag sichtbar: Rollen bekommen unterschiedliche UI-Tiefe und Rechte.
            Design-Generation und Public-Freigabe bleiben fuer die meisten Rollen blockiert, bis Review-Gates
            menschlich geschlossen sind.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-amber-100">
          generation bleibt gesperrt
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {variants.map((variant) => (
          <article key={variant.role.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white">{variant.role.label}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">{variant.role.level}</p>
              </div>
              {variant.learning_support.enabled ? (
                <span className="inline-flex max-w-full items-center rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-cyan-100">
                  Lernmodus
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {permissionColumns.map((column) => (
                <div key={column.key} className="min-w-0 rounded-md bg-black/24 px-3 py-2">
                  <p className="mb-2 text-xs uppercase tracking-[0.12em] text-stone-500">{column.label}</p>
                  <PermissionPill
                    enabled={variant.permissions[column.key]}
                    on={column.on}
                    off={column.off}
                  />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
