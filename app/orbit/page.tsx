import appRouteSpecData from '@/examples/kosmo-orbit/review/orbit-app-route-spec.generated.json';
import fullReviewData from '@/examples/kosmo-orbit/review/orbit-full-review.generated.json';
import routeSmokeData from '@/examples/kosmo-orbit/review/orbit-route-smoke.generated.json';
import staticSmokeData from '@/examples/kosmo-orbit/review/orbit-static-export-smoke.generated.json';
import roleStateData from '@/examples/kosmo-orbit/role-state.demo.json';
import designHandoffData from '@/examples/kosmo-projects/kosmo-demo-001/orbit/design-handoff-preview.generated.json';
import projectInspectorData from '@/examples/kosmo-projects/kosmo-demo-001/orbit/project-inspector.generated.json';
import roleVariantsData from '@/examples/kosmo-projects/kosmo-demo-001/orbit/role-ui-variants.generated.json';
import shellManifestData from '@/examples/kosmo-projects/kosmo-demo-001/orbit/role-shell-prototype.generated.json';
import type { Metadata } from 'next';
import { OrbitAutonomyStatus } from './OrbitAutonomyStatus';
import { OrbitCommandContract } from './OrbitCommandContract';
import { OrbitDemoReadiness, type OrbitStaticExportSmokeReport } from './OrbitDemoReadiness';
import { OrbitDemoQuestions } from './OrbitDemoQuestions';
import { OrbitDemoReviewPath } from './OrbitDemoReviewPath';
import { OrbitHealthReadiness } from './OrbitHealthReadiness';
import { OrbitInstallationTopology } from './OrbitInstallationTopology';
import { OrbitPermissionMatrix } from './OrbitPermissionMatrix';
import { OrbitPresenterBrief } from './OrbitPresenterBrief';
import { OrbitProgressMap } from './OrbitProgressMap';
import { OrbitProjectDashboard, type DesignHandoffPreview, type ProjectInspectorReport } from './OrbitProjectDashboard';
import { OrbitQualityEvidence, type OrbitFullReviewReport, type OrbitRouteSmokeReport } from './OrbitQualityEvidence';
import { OrbitReviewDecisionDraft } from './OrbitReviewDecisionDraft';
import { OrbitRiskRegister } from './OrbitRiskRegister';
import { OrbitRuntimeBoundary } from './OrbitRuntimeBoundary';
import { OrbitRuntimeContract } from './OrbitRuntimeContract';
import { OrbitRoleSwitcher } from './OrbitRoleSwitcher';
import { OrbitSectionIndex } from './OrbitSectionIndex';
import { OrbitVisionBridge } from './OrbitVisionBridge';
import { OrbitWorkstationPriorities } from './OrbitWorkstationPriorities';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'KosmoOrbit | Architektur Kosmos',
  description: 'Static review-only preview of the KosmoOrbit software cockpit.'
};

type Tone = 'blue' | 'green' | 'neutral' | 'red' | 'yellow';

type VisibleModule = {
  tool_id: string;
  visibility: string;
  reason: string;
};

type BlockedAction = {
  id: string;
  label: string;
  reason: string;
  gate_id: string;
};

type RoleState = {
  session: {
    active_role_id: string;
    can_switch_preview_role: boolean;
  };
  active_project: {
    project_id: string;
    package_path: string;
    status: string;
  };
  role_preview: {
    selected_role_id: string;
    available_role_ids: string[];
  };
  interaction_policy: {
    review_only: boolean;
    allow_role_preview_switch: boolean;
    allow_user_write: boolean;
    allow_design_generation: boolean;
    allow_public_publish: boolean;
    allow_external_network: boolean;
  };
  visible_modules: VisibleModule[];
  blocked_actions: BlockedAction[];
};

type RoleVariant = {
  role: {
    id: string;
    label: string;
    level: string;
    ui_mode: string;
    focus: string;
    detail_level: string;
  };
  explanation: {
    purpose: string;
    interface_depth: string;
    decision_scope: string;
    safe_next_step: string;
  };
  permissions: {
    can_open_design_review: boolean;
    can_request_design_generation: boolean;
    can_approve_local: boolean;
    can_approve_public: boolean;
    read_only: boolean;
  };
  panel_state: {
    tone: Tone;
    primary_label: string;
    primary_enabled: boolean;
    generation_enabled: boolean;
    generation_reason: string;
  };
  visible_sections: string[];
  badges: Array<{
    id: string;
    label: string;
    tone: Tone;
  }>;
  warnings: string[];
  learning_support: {
    enabled: boolean;
    mode: string | null;
    guidance: string | null;
  };
};

type RoleVariantsReport = {
  status: string;
  project: {
    id: string;
    name: string;
    risk_level: string;
  };
  summary: {
    variant_count: number;
    generation_capable_count: number;
    learning_variant_count: number;
  };
  variants: RoleVariant[];
};

type AppRouteSpec = {
  status: string;
  route_spec: {
    proposed_path: string;
    route_type: string;
    data_mode: string;
    interaction_mode: string;
    status: string;
  };
  summary: {
    passed_checks: number;
    check_count: number;
    visible_module_count: number;
    disabled_action_count: number;
  };
};

type ShellManifest = {
  status: string;
  summary: {
    smoke_passed_checks: number;
    smoke_check_count: number;
    visible_module_count: number;
    blocked_action_count: number;
  };
  safety: Record<string, boolean>;
};

const roleState = roleStateData as unknown as RoleState;
const roleVariantsReport = roleVariantsData as unknown as RoleVariantsReport;
const appRouteSpec = appRouteSpecData as unknown as AppRouteSpec;
const fullReview = fullReviewData as unknown as OrbitFullReviewReport;
const routeSmoke = routeSmokeData as unknown as OrbitRouteSmokeReport;
const staticSmoke = staticSmokeData as unknown as OrbitStaticExportSmokeReport;
const shellManifest = shellManifestData as unknown as ShellManifest;
const projectInspector = projectInspectorData as unknown as ProjectInspectorReport;
const designHandoff = designHandoffData as unknown as DesignHandoffPreview;
const activeRole = roleVariantsReport.variants.find((variant) => variant.role.id === roleState.session.active_role_id) ?? roleVariantsReport.variants[0];

const toneClasses: Record<Tone, string> = {
  blue: 'border-sky-300/45 bg-sky-400/10 text-sky-100',
  green: 'border-emerald-300/45 bg-emerald-400/10 text-emerald-100',
  neutral: 'border-white/20 bg-white/[0.08] text-stone-100',
  red: 'border-rose-300/50 bg-rose-500/12 text-rose-100',
  yellow: 'border-amber-300/50 bg-amber-400/12 text-amber-100'
};

const visibilityTone: Record<string, Tone> = {
  primary: 'green',
  available: 'blue',
  summary_only: 'neutral'
};

const moduleDescriptions: Record<string, string> = {
  'kosmo-data': 'Projektwissen, Quellen, Referenzen und Buero-Gedaechtnis.',
  'kosmo-asset': 'Gepruefte Materialien, Texturen, 2D/3D-Assets und Rechte.',
  'kosmo-design': 'Review-Werkbank fuer Kontext, Modellprofil und spaeter Entwurfslogik.',
  'kosmo-prepare': 'Briefing, Standort, Programm und Constraints.',
  'kosmo-draw': 'Plan, Schnitt, Ansicht, Layer und technische Exporte.',
  'kosmo-viz': 'Licht, Kamera, Material und Render-/Bildvarianten.',
  'kosmo-publish': 'Abgabe, Bericht, Exportpaket und Public-Gates.',
  'kosmo-zentrale': 'Lokale KI, Jobs, Updates, Reparatur und Hardwarezustand.'
};

const demoSteps = [
  {
    title: 'Projektpaket pruefen',
    label: '1',
    text: 'KosmoOrbit liest das lokale Projektpaket und zeigt Rolle, Risiko, offene Gates und sichere Module.'
  },
  {
    title: 'KosmoDesign Review Mode oeffnen',
    label: '2',
    text: 'Der Architekt wechselt in den Review Mode, sieht Kontext, Modellprofil und warum Generierung noch blockiert ist.'
  },
  {
    title: 'Blocker menschlich entscheiden',
    label: '3',
    text: 'Freigaben bleiben bewusst menschlich: erst Review, dann lokale Entscheidung, spaeter Public-Gate.'
  }
];

function prettyId(value: string) {
  return value
    .replace(/^kosmo-/, 'Kosmo ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function PolicyDot({ enabled }: { enabled: boolean }) {
  return <span className={`h-2.5 w-2.5 rounded-full ${enabled ? 'bg-emerald-300' : 'bg-rose-300'}`} aria-hidden="true" />;
}

function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2.5 py-1 text-[11px] font-medium leading-tight ${toneClasses[tone]}`}>{label}</span>;
}

export default function OrbitPage() {
  return (
    <main className="orbit-page h-dvh overflow-auto bg-[#080909] text-stone-100">
      <div className="min-h-dvh bg-[linear-gradient(135deg,rgba(0,231,255,0.12),transparent_28%),radial-gradient(circle_at_78%_12%,rgba(255,96,210,0.16),transparent_30%),linear-gradient(180deg,#080909,#11130f_52%,#080909)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-w-0 max-w-7xl flex-col gap-5">
          <header className="grid gap-4 border-b border-white/10 pb-5 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Architektur Kosmos</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-5xl">KosmoOrbit</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300 sm:text-base">
                Installierte Hauptsoftware-Zentrale fuer Rollen, Projektstatus, Tool-Zugriff und sichere Review-Gates.
                Diese Preview zeigt den 3-Minuten-Demo-Pfad, liest nur lokale Artefakte und bleibt ohne API, Auth-Runtime,
                Uploads oder Generierung.
              </p>
            </div>
            <div className="grid min-w-0 gap-2 rounded-lg border border-cyan-200/25 bg-black/35 p-4 shadow-[0_0_32px_rgba(0,231,255,0.08)]">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-stone-400">Route</span>
                <span className="break-all font-mono text-cyan-100">{appRouteSpec.route_spec.proposed_path}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-stone-400">Status</span>
                <Badge label={appRouteSpec.route_spec.status} tone="yellow" />
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-stone-400">Checks</span>
                <span className="font-mono text-emerald-100">
                  {appRouteSpec.summary.passed_checks}/{appRouteSpec.summary.check_count}
                </span>
              </div>
            </div>
          </header>

          <OrbitSectionIndex />

          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.35fr_0.9fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Aktive Rolle</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{activeRole.role.label}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge label={activeRole.role.ui_mode} tone="blue" />
                <Badge label={activeRole.role.detail_level} />
                <Badge label={activeRole.permissions.can_approve_public ? 'public gate sichtbar' : 'public gate blockiert'} tone={activeRole.permissions.can_approve_public ? 'yellow' : 'red'} />
              </div>
              <p className="mt-4 text-sm leading-6 text-stone-300">{activeRole.explanation.purpose}</p>
              <div className="mt-4 grid gap-2 text-sm">
                <p className="rounded-md bg-black/25 px-3 py-2 text-stone-300">{activeRole.explanation.interface_depth}</p>
                <p className="rounded-md bg-black/25 px-3 py-2 text-stone-300">{activeRole.explanation.decision_scope}</p>
                <p className="rounded-md border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-cyan-100">{activeRole.explanation.safe_next_step}</p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Projektpaket</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-stone-500">Projekt</span>
                  <p className="mt-1 font-mono text-sm text-cyan-100">{roleState.active_project.project_id}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">Risiko</span>
                  <p className="mt-1 font-mono text-sm text-amber-100">{roleVariantsReport.project.risk_level}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">Shell-Smoke</span>
                  <p className="mt-1 font-mono text-sm text-emerald-100">
                    {shellManifest.summary.smoke_passed_checks}/{shellManifest.summary.smoke_check_count}
                  </p>
                </div>
              </div>
              <p className="mt-4 break-words text-xs leading-5 text-stone-400">{roleState.active_project.package_path}</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Safety Policy</p>
              <div className="mt-3 grid gap-2 text-sm">
                {Object.entries(roleState.interaction_policy).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-md bg-black/25 px-3 py-2">
                    <span className="text-stone-300">{key.replace(/_/g, ' ')}</span>
                    <PolicyDot enabled={value} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="demo" className="scroll-mt-4 rounded-lg border border-cyan-200/20 bg-black/30 p-4">
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">3-Minuten-Demo</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Projektpaket zu KosmoDesign Review Mode</h2>
                <p className="mt-3 text-sm leading-6 text-stone-300">
                  Der erste vorfuehrbare Pfad ist bewusst ein sicherer Review-Ablauf: KosmoOrbit zeigt Kontext,
                  Blocker und Rollenlogik, bevor irgendeine Entwurfs- oder Geometrie-Generierung erlaubt wird.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {demoSteps.map((step) => (
                  <article key={step.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/10 text-xs font-semibold text-cyan-100">
                      {step.label}
                    </span>
                    <h3 className="mt-3 text-base font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-stone-400">{step.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <div id="autonomie" className="scroll-mt-4">
            <OrbitAutonomyStatus />
          </div>

          <div id="presenter" className="scroll-mt-4">
            <OrbitPresenterBrief />
          </div>

          <div id="fortschritt" className="scroll-mt-4">
            <OrbitProgressMap />
          </div>

          <div id="vision" className="scroll-mt-4">
            <OrbitVisionBridge />
          </div>

          <div id="demo-ready" className="scroll-mt-4">
            <OrbitDemoReadiness fullReview={fullReview} routeSmoke={routeSmoke} staticSmoke={staticSmoke} />
          </div>

          <div id="projektpaket" className="scroll-mt-4">
            <OrbitProjectDashboard projectInspector={projectInspector} designHandoff={designHandoff} />
          </div>

          <OrbitDemoQuestions />

          <div id="entscheidung" className="scroll-mt-4">
            <OrbitReviewDecisionDraft projectInspector={projectInspector} designHandoff={designHandoff} />
          </div>

          <div id="runtime" className="scroll-mt-4">
            <OrbitRuntimeBoundary />
          </div>

          <div id="runtime-contract" className="scroll-mt-4">
            <OrbitRuntimeContract />
          </div>

          <div id="installation" className="scroll-mt-4">
            <OrbitInstallationTopology />
          </div>

          <div id="health" className="scroll-mt-4">
            <OrbitHealthReadiness />
          </div>

          <div id="risiken" className="scroll-mt-4">
            <OrbitRiskRegister />
          </div>

          <div id="commands" className="scroll-mt-4">
            <OrbitCommandContract />
          </div>

          <div id="evidenz" className="scroll-mt-4">
            <OrbitQualityEvidence fullReview={fullReview} routeSmoke={routeSmoke} />
          </div>

          <OrbitWorkstationPriorities />

          <div id="rechte" className="scroll-mt-4">
            <OrbitPermissionMatrix variants={roleVariantsReport.variants} />
          </div>

          <div id="rollen" className="scroll-mt-4">
            <OrbitRoleSwitcher initialRoleId={roleState.session.active_role_id} variants={roleVariantsReport.variants} />
          </div>

          <OrbitDemoReviewPath variants={roleVariantsReport.variants} blockedActions={roleState.blocked_actions} />

          <section id="guardrails" className="grid scroll-mt-4 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-lg border border-white/10 bg-black/28 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Tool-Zentrale</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Sichtbare Module</h2>
                </div>
                <Badge label={`${roleState.visible_modules.length} Module`} tone="green" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {roleState.visible_modules.map((module) => (
                  <article key={module.tool_id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">{prettyId(module.tool_id)}</h3>
                      <Badge label={module.visibility} tone={visibilityTone[module.visibility] ?? 'neutral'} />
                    </div>
                    <p className="mt-3 text-sm leading-5 text-stone-300">{moduleDescriptions[module.tool_id] ?? 'Lokales KosmoOrbit-Modul mit review-only Zugriff.'}</p>
                    <p className="mt-2 text-xs leading-5 text-stone-500">{module.reason}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.05] p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Guardrails</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Blockierte Aktionen</h2>
                </div>
                <Badge label={`${roleState.blocked_actions.length} sichtbar blockiert`} tone="red" />
              </div>
              <div className="mt-4 rounded-lg border border-cyan-200/20 bg-cyan-300/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">KosmoDesign Review Mode</p>
                <p className="mt-2 text-sm leading-5 text-stone-200">
                  Projektpaket - KosmoOrbit - KosmoDesign Review Mode. Design-Generation bleibt blockiert,
                  bis Kontext- und Human-Review-Gates geschlossen sind.
                </p>
              </div>
              <div className="mt-4 grid gap-3">
                {roleState.blocked_actions.map((action) => (
                  <article key={action.id} className="rounded-lg border border-rose-200/25 bg-black/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">{action.label}</h3>
                      <Badge label={action.gate_id} tone="red" />
                    </div>
                    <p className="mt-3 text-sm leading-5 text-stone-300">{action.reason}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Rollenoberflaechen</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Profilierte KosmoOrbit-Shell</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge label={`${roleVariantsReport.summary.variant_count} Rollen`} tone="blue" />
                <Badge label={`${roleVariantsReport.summary.learning_variant_count} Lernprofile`} tone="green" />
                <Badge label={`${roleVariantsReport.summary.generation_capable_count} Generatoren`} tone="red" />
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {roleVariantsReport.variants.map((variant) => (
                <article key={variant.role.id} className="rounded-lg border border-white/10 bg-black/26 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{variant.role.label}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">{variant.role.level}</p>
                    </div>
                    <Badge label={variant.panel_state.primary_label} tone={variant.panel_state.primary_enabled ? 'yellow' : 'neutral'} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {variant.badges.slice(1, 4).map((badge) => (
                      <Badge key={badge.id} label={badge.label} tone={badge.tone} />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-5 text-stone-300">{variant.explanation.purpose}</p>
                  <p className="mt-2 rounded-md bg-white/[0.04] px-3 py-2 text-sm leading-5 text-stone-400">
                    {variant.explanation.safe_next_step}
                  </p>
                  {variant.learning_support.enabled ? (
                    <p className="mt-3 rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                      Lernmodus: {variant.learning_support.guidance}
                    </p>
                  ) : null}
                  {variant.warnings.length > 0 ? (
                    <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                      {variant.warnings[0]}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
