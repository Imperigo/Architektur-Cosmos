/* KosmoOrbit — Startsequenz Motion-Piece. Scenes for SceneStage (animations-v2). */
const { useScene } = window;
const E = window.Easing;
const av = (t, o) => window.animate(o)(t);

const MONO = "'IBM Plex Mono',monospace";
const LATO = "'Lato',sans-serif";
const NARROW = "'PT Sans Narrow','Arial Narrow',sans-serif";
const TEAL = '#57B6C2';

function Backdrop({ grid = 1, glow = 1 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0B0D12' }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: glow,
        background: 'radial-gradient(120% 90% at 50% -10%, rgba(87,182,194,.05), transparent 60%), radial-gradient(100% 80% at 80% 110%, rgba(111,155,207,.04), transparent 60%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: grid,
        backgroundImage: 'linear-gradient(rgba(120,140,190,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(120,140,190,.10) 1px, transparent 1px)',
        backgroundSize: '72px 72px',
      }} />
      {[[20, 30, .4], [70, 60, .3], [85, 20, .35], [12, 74, .25], [40, 12, .3], [58, 86, .25]].map(([x, y, o], i) => (
        <div key={i} style={{ position: 'absolute', left: x + '%', top: y + '%', width: 2, height: 2, borderRadius: '50%', background: `rgba(244,248,255,${o})` }} />
      ))}
    </div>
  );
}

function AKLogo({ size = 200, ring = 1, arch = 1, base = 1, keyO = 1, satAngle = null, satO = 0, ringGlow = 0 }) {
  const a = -24 * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  let sat = null;
  if (satAngle != null) {
    const th = satAngle * Math.PI / 180;
    const ex = 17 * Math.cos(th), ey = 8.5 * Math.sin(th);
    sat = { x: 20 + ex * ca - ey * sa, y: 20 + ex * sa + ey * ca };
  }
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none"
      style={{ display: 'block', filter: ringGlow > 0.01 ? `drop-shadow(0 0 ${10 * ringGlow}px rgba(87,182,194,${0.5 * ringGlow}))` : 'none' }}>
      <g transform="rotate(-24 20 20)">
        <ellipse cx="20" cy="20" rx="17" ry="8.5" stroke={TEAL} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="84" strokeDashoffset={84 * (1 - ring)} />
      </g>
      <path d="M11 25 L20 9 L29 25" fill="none" stroke="#DCE0E8" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="37" strokeDashoffset={37 * (1 - arch)} />
      <circle cx="20" cy="16.5" r="2.4" fill={TEAL} opacity={keyO} />
      {sat && <circle cx={sat.x} cy={sat.y} r="1.5" fill={TEAL} opacity={satO} />}
    </svg>
  );
}

function Cursor({ x, y, press = 0, o = 1, ripple = 0 }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: o, zIndex: 50, pointerEvents: 'none' }}>
      {ripple > 0 && ripple < 1 && (
        <div style={{
          position: 'absolute', left: -6, top: -6, width: 24, height: 24, borderRadius: '50%',
          border: '1.5px solid rgba(87,182,194,.8)', transform: `scale(${1 + ripple * 2.4})`, opacity: 1 - ripple,
        }} />
      )}
      <svg width="30" height="30" viewBox="0 0 24 24" style={{ transform: `scale(${1 - press * 0.15})`, transformOrigin: '4px 4px', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.6))' }}>
        <path d="M4 2 L4 18 L8.5 14.5 L11.5 21 L14 20 L11 13.5 L17 13 Z" fill="#F4F6FA" stroke="#0B0D12" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

const STEPS = [
  ['KERN', 'Kernel · 214 Commands registriert'],
  ['KOSMO-LLM', 'Sprachmodell lokal geladen'],
  ['PROJEKTGRAPH', 'Wissensbasis indexiert'],
  ['BRIDGE', 'HomeStation · Sync aus'],
  ['STATIONEN', 'Design · Vis · Publish · Prepare · Data'],
];

function SplashWindow({ o = 1, s = 1, wordO = 1, subO = 1, logo, pct = 0, children }) {
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%', width: 860,
      transform: `translate(-50%,-50%) scale(${s})`, opacity: o,
      borderRadius: 34, background: 'rgba(20,23,31,.94)', border: '1px solid rgba(255,255,255,.10)',
      boxShadow: '0 44px 110px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)',
      padding: '56px 60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {logo}
      <div style={{ marginTop: 26, fontFamily: NARROW, fontWeight: 700, fontSize: 34, letterSpacing: '.3em', paddingLeft: '.3em', textTransform: 'uppercase', color: '#F4F6FA', opacity: wordO }}>KosmoOrbit</div>
      <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 14, letterSpacing: '.2em', color: '#8B92A2', opacity: subO }}>ARCHITEKTURKOSMOS · WERKSTATION</div>
      <div style={{ width: '100%', height: 210, marginTop: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>{children}</div>
      <div style={{ width: '100%', height: 3, borderRadius: 999, background: 'rgba(87,182,194,.14)', overflow: 'hidden', marginTop: 22 }}>
        <div style={{ height: '100%', width: (pct * 100) + '%', background: TEAL, boxShadow: '0 0 12px rgba(87,182,194,.4)' }} />
      </div>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '17px 2px 22px', fontFamily: MONO, fontSize: 13, letterSpacing: '.14em', color: '#5C6271' }}>
        <span>V 0.8.10 «INSELREIN»</span><span>LOKAL — KEINE CLOUD</span>
      </div>
    </div>
  );
}

/* ── Scene 1: Desktop — Doppelklick auf das App-Symbol ── */
function Desktop() {
  const { localTime: t, progress: p, dur } = useScene();
  const T = (f) => f * dur / 3; // authored at 3s
  const fade = av(t, { from: 0, to: 1, start: T(0.05), end: T(0.5), ease: E.easeOutCubic });
  // cursor path
  const cx = av(t, { from: 1500, to: 992, start: T(0.5), end: T(1.7), ease: E.easeInOutCubic });
  const cy = av(t, { from: 900, to: 566, start: T(0.5), end: T(1.7), ease: E.easeInOutCubic });
  const click1 = av(t, { from: 0, to: 1, start: T(1.95), end: T(2.1), ease: E.linear });
  const click2 = av(t, { from: 0, to: 1, start: T(2.3), end: T(2.45), ease: E.linear });
  const press = (click1 > 0 && click1 < 1 ? 1 : 0) + (click2 > 0 && click2 < 1 ? 1 : 0);
  const iconS = 1 - 0.05 * Math.sin(Math.min(click1, 1) * Math.PI) - 0.05 * Math.sin(Math.min(click2, 1) * Math.PI);
  const selO = click1 >= 1 ? 1 : 0;
  const openGlow = av(t, { from: 0, to: 1, start: T(2.45), end: T(2.9), ease: E.easeOutCubic });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Backdrop grid={0.5 * fade} glow={fade} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-56%) scale(${iconS})`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: fade }}>
        <div style={{
          width: 168, height: 168, borderRadius: 40, background: '#14171F', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: selO ? '1.5px solid rgba(87,182,194,.5)' : '1px solid rgba(255,255,255,.12)',
          boxShadow: `0 18px 48px rgba(0,0,0,.46), 0 0 ${36 * openGlow}px rgba(87,182,194,${0.25 * openGlow})`,
        }}>
          <AKLogo size={104} />
        </div>
        <div style={{ fontFamily: LATO, fontSize: 22, fontWeight: 700, color: '#DCE0E8', textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>KosmoOrbit</div>
      </div>
      <div style={{ position: 'absolute', left: 0, bottom: 44, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 13, letterSpacing: '.22em', color: '#5C6271', opacity: fade * (1 - openGlow) }}>DESKTOP · IPAD — DOPPELKLICK STARTET DIE WERKSTATION</div>
      <Cursor x={cx} y={cy} press={press} o={fade} ripple={click2 > 0 ? click2 : 0} />
    </div>
  );
}

/* ── Scene 2: Splash — Fenster erscheint, Logo zeichnet sich ── */
function Splash() {
  const { localTime: t, dur } = useScene();
  const T = (f) => f * dur / 3;
  const winO = av(t, { from: 0, to: 1, start: T(0.04), end: T(0.5), ease: E.easeOutCubic });
  const winS = av(t, { from: 0.94, to: 1, start: T(0.04), end: T(0.55), ease: E.easeOutCubic });
  const ring = av(t, { from: 0, to: 1, start: T(0.45), end: T(1.5), ease: E.easeInOutCubic });
  const arch = av(t, { from: 0, to: 1, start: T(1.0), end: T(1.75), ease: E.easeOutCubic });
  const base = av(t, { from: 0, to: 1, start: T(1.45), end: T(1.85), ease: E.easeOutCubic });
  const keyO = av(t, { from: 0, to: 1, start: T(1.85), end: T(2.1), ease: E.easeOutCubic });
  const wordO = av(t, { from: 0, to: 1, start: T(1.9), end: T(2.45), ease: E.easeOutCubic });
  const subO = av(t, { from: 0, to: 1, start: T(2.15), end: T(2.65), ease: E.easeOutCubic });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Backdrop grid={0.5} glow={1} />
      <SplashWindow o={winO} s={winS} wordO={wordO} subO={subO} pct={0}
        logo={<AKLogo size={128} ring={ring} arch={arch} base={base} keyO={keyO} />}>
        <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 13, letterSpacing: '.2em', color: '#3C414D', opacity: subO }}>SYSTEM WIRD VORBEREITET</div>
      </SplashWindow>
    </div>
  );
}

/* ── Scene 3: Boot — Satellit kreist, Statuszeilen laufen ── */
function Boot() {
  const { localTime: t, dur } = useScene();
  const T = (f) => f * dur / 5;
  const satAngle = (t / dur) * 5 * 190;
  const satO = av(t, { from: 0, to: 0.9, start: 0, end: T(0.3), ease: E.easeOutCubic });
  const stepAt = (i) => T(0.25 + i * 0.85);
  const doneAt = (i) => stepAt(i) + T(0.7);
  const pct = av(t, { from: 0, to: 1, start: T(0.25), end: T(4.4), ease: E.easeInOutSine });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Backdrop grid={0.5} glow={1} />
      <SplashWindow o={1} s={1} pct={pct}
        logo={<AKLogo size={128} satAngle={satAngle} satO={satO} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STEPS.map(([label, detail], i) => {
            const on = av(t, { from: 0, to: 1, start: stepAt(i), end: stepAt(i) + T(0.3), ease: E.easeOutCubic });
            const done = t >= doneAt(i);
            const active = on > 0 && !done;
            const blink = active ? 0.65 + 0.35 * Math.sin(t * 7) : 1;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '7px 2px', opacity: on, transform: `translateY(${(1 - on) * 10}px)` }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', background: done ? '#74C2A0' : TEAL, opacity: done ? 1 : blink, boxShadow: active ? '0 0 12px rgba(87,182,194,.5)' : 'none' }} />
                <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '.14em', width: 190, flex: 'none', color: active ? TEAL : '#B6BDCB' }}>{label}</span>
                <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '.04em', flex: 1, color: active ? '#8B92A2' : '#5C6271' }}>{detail}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '.1em', color: done ? '#74C2A0' : TEAL, opacity: done ? 1 : blink }}>{done ? 'OK' : '···'}</span>
              </div>
            );
          })}
        </div>
      </SplashWindow>
    </div>
  );
}

/* ── Scene 4: Bereit — Leitsatz, Satellit dockt an ── */
function Bereit() {
  const { localTime: t, dur } = useScene();
  const T = (f) => f * dur / 2.5;
  const satFade = av(t, { from: 0.9, to: 0, start: T(0.15), end: T(0.7), ease: E.easeInCubic });
  const satAngle = 4750 + av(t, { from: 0, to: 170, start: 0, end: T(0.7), ease: E.easeOutCubic });
  const leitO = av(t, { from: 0, to: 1, start: T(0.35), end: T(0.9), ease: E.easeOutCubic });
  const glow = av(t, { from: 0, to: 1, start: T(0.5), end: T(1.1), ease: E.easeOutCubic })
    * av(t, { from: 1, to: 0.55, start: T(1.4), end: T(2.3), ease: E.easeInOutSine });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Backdrop grid={0.5} glow={1} />
      <SplashWindow o={1} s={1} pct={1}
        logo={<AKLogo size={128} satAngle={satAngle} satO={satFade} ringGlow={glow} />}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity: leitO, transform: `translateY(${(1 - leitO) * 12}px)` }}>
          <div style={{ fontFamily: LATO, fontSize: 27, fontWeight: 400, color: '#DCE0E8', letterSpacing: '.01em' }}>Der Architekt bleibt Autor.</div>
          <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '.18em', color: TEAL }}>SYSTEM BEREIT</div>
        </div>
      </SplashWindow>
    </div>
  );
}

/* ── Scene 5: Zentrale — Orbit öffnet den Raum, Projektstart ── */
function Rise({ t, start, end, children, style }) {
  const v = av(t, { from: 0, to: 1, start, end, ease: E.easeOutCubic });
  return <div style={{ ...style, opacity: v, transform: `translateY(${(1 - v) * 20}px)` }}>{children}</div>;
}

function Zentrale() {
  const { localTime: t, dur } = useScene();
  const T = (f) => f * dur / 4;
  const ringS = av(t, { from: 1, to: 11, start: 0, end: T(0.85), ease: E.easeInOutCubic });
  const ringO = av(t, { from: 0.7, to: 0, start: T(0.3), end: T(0.85), ease: E.easeOutCubic });
  const cx = av(t, { from: 1560, to: 1258, start: T(2.2), end: T(3.0), ease: E.easeInOutCubic });
  const cy = av(t, { from: 980, to: 668, start: T(2.2), end: T(3.0), ease: E.easeInOutCubic });
  const click = av(t, { from: 0, to: 1, start: T(3.25), end: T(3.42), ease: E.linear });
  const cursorO = av(t, { from: 0, to: 1, start: T(2.2), end: T(2.5), ease: E.easeOutCubic });
  const btnGlow = av(t, { from: 0, to: 1, start: T(3.3), end: T(3.8), ease: E.easeOutCubic });
  const tabs = ['EFH Seeblick', 'Rebgasse 7', 'Schulhaus Rüti', 'Beispielprojekt'];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Backdrop grid={0.5} glow={1} />
      <svg viewBox="0 0 40 40" width={200} height={200} style={{ position: 'absolute', left: '50%', top: '50%', margin: '-100px 0 0 -100px', transform: `scale(${ringS})`, opacity: ringO }}>
        <g transform="rotate(-24 20 20)"><ellipse cx="20" cy="20" rx="17" ry="8.5" stroke={TEAL} strokeWidth="0.8" fill="none" /></g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 132 }}>
        <Rise t={t} start={T(0.55)} end={T(1.05)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <AKLogo size={76} />
          <div style={{ fontFamily: NARROW, fontWeight: 700, fontSize: 24, letterSpacing: '.3em', paddingLeft: '.3em', textTransform: 'uppercase', color: '#F4F6FA' }}>KosmoOrbit</div>
        </Rise>
        <Rise t={t} start={T(0.75)} end={T(1.25)} style={{ marginTop: 26 }}>
          <div style={{ fontFamily: LATO, fontSize: 38, fontWeight: 700, color: '#F4F6FA' }}>Willkommen zurück, Andrin</div>
        </Rise>
        <Rise t={t} start={T(0.95)} end={T(1.45)} style={{ marginTop: 38, display: 'flex', gap: 14 }}>
          {tabs.map((n, i) => (
            <div key={i} style={{
              fontFamily: LATO, fontSize: 19, fontWeight: 700, borderRadius: 999, padding: '14px 26px',
              color: i === 0 ? '#F4F6FA' : '#8B92A2',
              background: i === 0 ? 'rgba(87,182,194,.10)' : 'transparent',
              border: '1px solid ' + (i === 0 ? 'rgba(87,182,194,.34)' : 'rgba(255,255,255,.10)'),
            }}>{n}</div>
          ))}
          <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '.12em', color: '#8B92A2', border: '1px dashed rgba(255,255,255,.14)', borderRadius: 999, padding: '14px 24px', display: 'flex', alignItems: 'center' }}>+ NEU</div>
        </Rise>
        <Rise t={t} start={T(1.15)} end={T(1.65)} style={{ marginTop: 26 }}>
          <div style={{ width: 880, borderRadius: 22, background: '#14171F', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 12px 32px rgba(0,0,0,.4)', padding: '30px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: LATO, fontSize: 28, fontWeight: 700, color: '#F4F6FA' }}>EFH Seeblick</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: MONO, fontSize: 13, letterSpacing: '.13em', color: '#8B92A2' }}>
                <span style={{ border: '1px solid rgba(87,182,194,.34)', color: TEAL, borderRadius: 999, padding: '5px 13px' }}>VORPROJEKT</span>
                <span>MAA-SEE-VS</span><span>ZULETZT HEUTE 14:32</span>
              </div>
            </div>
            <div style={{
              background: TEAL, color: '#06141A', borderRadius: 14, padding: '19px 30px', fontFamily: LATO, fontWeight: 700, fontSize: 19,
              transform: `scale(${1 - 0.06 * Math.sin(Math.min(click, 1) * Math.PI)})`,
              boxShadow: `0 0 ${34 * btnGlow}px rgba(87,182,194,${0.45 * btnGlow})`,
            }}>PROJEKT ÖFFNEN</div>
          </div>
        </Rise>
        <Rise t={t} start={T(1.4)} end={T(1.9)} style={{ marginTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '.2em', color: '#5C6271' }}>STATIONEN</div>
          <div style={{ display: 'flex', gap: 18 }}>
            {['KOSMODESIGN', 'KOSMODATA', 'KOSMO', 'KOSMOOFFICE'].map((n, i) => (
              <div key={i} style={{ width: 186, padding: '24px 14px 20px', borderRadius: 22, background: '#101319', border: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: i === 3 ? 0.4 : 1 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', border: `1.6px solid ${i === 2 ? TEAL : '#B6BDCB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: i === 2 ? TEAL : '#B6BDCB' }} />
                </div>
                <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '.12em', color: '#DCE0E8' }}>{n}</div>
              </div>
            ))}
          </div>
        </Rise>
      </div>
      <Cursor x={cx} y={cy} press={click > 0 && click < 1 ? 1 : 0} o={cursorO} ripple={click} />
    </div>
  );
}

window.KosmoStartMotion = function KosmoStartMotion() {
  return (
    <window.SceneStage width={1920} height={1080} bg="#050608"
      scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
      {{ Desktop, Splash, Boot, Bereit, Zentrale }}
    </window.SceneStage>
  );
};
