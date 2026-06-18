document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════════════════
     SHELL
  ══════════════════════════════���═══════════════════════ */
  document.body.innerHTML = `
<div id="app">
  <canvas id="bg"></canvas>

  <header>
    <div class="logo-wrap">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
      </div>
      <div class="logo-text">
        <span class="logo-name">MIKU SAKURA</span>
        <span class="logo-sub">REST API</span>
      </div>
    </div>
    <nav class="nav-links">
      <a href="/docs" class="btn-docs">
        <svg viewBox="0 0 20 20" fill="none" width="13" height="13"><path d="M4 4h8l4 4v8H4V4z" stroke="currentColor" stroke-width="1.4"/><path d="M12 4v4h4M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Docs
      </a>
    </nav>
  </header>

  <div class="banner-wrap">
    <img class="banner-img" src="https://i.pinimg.com/originals/f1/7c/be/f17cbe559b0eb996bbc43f876ad0ea6f.jpg" alt="banner"/>
    <div class="banner-overlay">
      <div class="banner-chip">
        <span class="banner-dot" id="dot"></span>
        <span id="status-text">Conectando…</span>
      </div>
      <h1>API <em>STATUS</em></h1>
      <p class="sub">Live metrics · Real-time · Auto-refresh 3s</p>
    </div>
    <div class="banner-clock" id="live-clock">--:--:--</div>
  </div>

  <main>
    <!-- fila 1: uptime + latency + creator -->
    <div class="grid">
      <div class="card span2">
        <div class="card-header">
          <span class="card-icon icon-uptime"><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.4"/><path d="M10 6v4l3 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>
          <span class="card-label">Uptime</span>
        </div>
        <div class="uptime-segments">
          <div class="seg"><span class="seg-val" id="up-d">0</span><span class="seg-u">D</span></div>
          <span class="seg-sep">:</span>
          <div class="seg"><span class="seg-val" id="up-h">00</span><span class="seg-u">H</span></div>
          <span class="seg-sep">:</span>
          <div class="seg"><span class="seg-val" id="up-m">00</span><span class="seg-u">M</span></div>
          <span class="seg-sep">:</span>
          <div class="seg"><span class="seg-val" id="up-s">00</span><span class="seg-u">S</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-icon icon-latency"><svg viewBox="0 0 20 20" fill="none"><path d="M3 10h3l2-5 3 10 2-6 2 3 2-2h1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="card-label">Latency</span>
        </div>
        <div class="lat-wrap"><span class="card-val" id="v-latency">—</span><span class="card-unit">ms</span></div>
        <div class="lat-track"><div class="lat-fill" id="lat-bar"></div></div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-icon icon-creator"><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.4"/><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>
          <span class="card-label">Creator</span>
        </div>
        <span class="card-val sm" id="v-creator">—</span>
      </div>
    </div>

    <!-- fila 2: requests + routers + endpoints + version -->
    <div class="grid">
      <div class="card span2">
        <div class="card-header">
          <span class="card-icon icon-requests"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2v3M10 15v3M2 10h3M15 10h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.4"/></svg></span>
          <span class="card-label">Total Requests</span>
        </div>
        <span class="card-val big" id="v-requests">—</span>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-icon icon-routers"><svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="12" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="7" y="12" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M5 8v2.5c0 .8.7 1.5 1.5 1.5H10M15 8v2.5c0 .8-.7 1.5-1.5 1.5H10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>
          <span class="card-label">Routers</span>
        </div>
        <span class="card-val" id="v-routers">—</span>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-icon icon-endpoints"><svg viewBox="0 0 20 20" fill="none"><path d="M4 6h12M4 10h8M4 14h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>
          <span class="card-label">Endpoints</span>
        </div>
        <span class="card-val" id="v-endpoints">—</span>
      </div>
    </div>

    <!-- fila 3: RAM -->
    <div class="section-title-row">
      <span class="section-divider-label">
        <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 4V3M8 4V3M11 4V3M5 12v1M8 12v1M11 12v1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        RAM · Process Memory
      </span>
    </div>
    <div class="grid4">
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-ram"><svg viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 4V2M8 4V2M11 4V2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span><span class="card-label">RSS</span></div>
        <span class="card-val sm" id="v-ram-rss">—</span>
        <span class="card-unit">proceso real</span>
      </div>
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-ram2"><svg viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 8h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span><span class="card-label">Heap Used</span></div>
        <span class="card-val sm" id="v-heap-used">—</span>
        <span class="card-unit">V8 activo</span>
      </div>
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-ram3"><svg viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 8h3M5 10.5h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span><span class="card-label">Heap Total</span></div>
        <span class="card-val sm" id="v-heap-total">—</span>
        <span class="card-unit">V8 total</span>
      </div>
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-ram4"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span><span class="card-label">RAM Usage</span></div>
        <span class="card-val sm accent-ok" id="v-ram-usage">—</span>
        <div class="mini-bar-track"><div class="mini-bar-fill" id="ram-bar"></div></div>
      </div>
    </div>

    <!-- fila 4: DISCO -->
    <div class="section-title-row">
      <span class="section-divider-label">
        <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="11.5" cy="11" r="1" fill="currentColor"/></svg>
        Disco
      </span>
    </div>
    <div class="grid4">
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-disk"><svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="11.5" cy="11" r="1" fill="currentColor"/></svg></span><span class="card-label">Total</span></div>
        <span class="card-val sm" id="v-disk-total">—</span>
      </div>
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-disk2"><svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 9h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span><span class="card-label">Usado</span></div>
        <span class="card-val sm accent-warn" id="v-disk-used">—</span>
      </div>
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-disk3"><svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 9h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span><span class="card-label">Libre</span></div>
        <span class="card-val sm accent-ok" id="v-disk-free">—</span>
      </div>
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-disk4"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span><span class="card-label">Uso</span></div>
        <span class="card-val sm" id="v-disk-usage">—</span>
        <div class="mini-bar-track"><div class="mini-bar-fill accent-warn-bar" id="disk-bar"></div></div>
      </div>
    </div>

    <!-- fila 5: sistema -->
    <div class="section-title-row">
      <span class="section-divider-label">
        <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><rect x="2" y="2" width="12" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 14h6M8 11v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Sistema · Node.js
      </span>
    </div>
    <div class="grid4">
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-node"><svg viewBox="0 0 16 16" fill="none"><path d="M8 2L3 4.5v7L8 14l5-2.5v-7L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></span><span class="card-label">Node</span></div>
        <span class="card-val sm accent-ok" id="v-node">—</span>
      </div>
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-pid"><svg viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M6 8h4M8 6v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span><span class="card-label">PID</span></div>
        <span class="card-val sm" id="v-pid">—</span>
      </div>
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-platform"><svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 14h6M8 11v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span><span class="card-label">Platform</span></div>
        <span class="card-val sm" id="v-platform">—</span>
      </div>
      <div class="card mini">
        <div class="card-header"><span class="card-icon icon-arch"><svg viewBox="0 0 16 16" fill="none"><path d="M8 2v12M3 5l5-3 5 3M3 11l5 3 5-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="card-label">Arch</span></div>
        <span class="card-val sm" id="v-arch">—</span>
      </div>
    </div>

    <!-- docs card -->
    <div class="grid" style="margin-top:10px">
      <div class="card card-docs span2" onclick="location.href='/docs'">
        <div class="card-header">
          <span class="card-icon icon-docs"><svg viewBox="0 0 20 20" fill="none"><path d="M5 3h7l4 4v11H5V3z" stroke="currentColor" stroke-width="1.4"/><path d="M12 3v4h4M8 10h5M8 13h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>
          <span class="card-label">Documentation</span>
        </div>
        <span class="card-val docs-cta">View Docs <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span class="card-hint">Open /docs</span>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-icon icon-ver"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg></span><span class="card-label">Versión</span></div>
        <span class="card-val sm" id="v-version">—</span>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-icon icon-limit"><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.4"/><path d="M10 6v5M10 13v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><span class="card-label">Rate Limit</span></div>
        <span class="card-val sm accent-warn" id="v-limit">—</span>
      </div>
    </div>
  </main>

  <div id="api-stats-container"></div>

  <footer>
    <span>Powered by</span>
    <em>I'm shadow</em>
    <span class="footer-sep">·</span>
    <span id="footer-time">--:--:--</span>
  </footer>
</div>
`

  /* ══════════════════════════════════════════════════════
     STYLES
  ══════════════════════════════════════════════════════ */
  const style = document.createElement('style')
  style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#04050d;--bg1:#080a14;--bg2:#0d1020;--bg3:#121626;
  --bdr:rgba(255,255,255,.06);--bdr2:rgba(255,255,255,.11);
  --acc:#818cf8;--acc2:#34d399;--acc3:#f472b6;--acc4:#fbbf24;
  --t1:#eef0ff;--t2:#8b8fa8;--t3:#3f4259;
  --r8:8px;--r12:12px;--r16:16px;--r20:20px;
  --ease:cubic-bezier(.4,0,.2,1);
}
html,body{height:100%;background:var(--bg);color:var(--t1);font-family:'Space Grotesk',sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
#bg{position:fixed;inset:0;z-index:0;pointer-events:none;}
#app{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;}

/* header */
header{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;border-bottom:1px solid var(--bdr);backdrop-filter:blur(20px) saturate(140%);background:rgba(4,5,13,.72);position:sticky;top:0;z-index:100;}
.logo-wrap{display:flex;align-items:center;gap:12px;}
.logo-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--acc),var(--acc3));display:grid;place-items:center;color:#fff;flex-shrink:0;box-shadow:0 0 20px rgba(129,140,248,.3);}
.logo-icon svg{width:18px;height:18px;}
.logo-name{display:block;font-family:'Bebas Neue',cursive;font-size:1.25rem;letter-spacing:.15em;color:var(--t1);line-height:1;}
.logo-sub{display:block;font-size:.55rem;letter-spacing:.35em;color:var(--t3);text-transform:uppercase;margin-top:1px;}
.btn-docs{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:var(--r8);border:1px solid var(--bdr2);background:rgba(129,140,248,.06);color:var(--acc);font-size:.7rem;font-weight:600;letter-spacing:.05em;text-decoration:none;transition:all .2s var(--ease);}
.btn-docs:hover{background:var(--acc);color:#fff;border-color:var(--acc);}

/* banner */
.banner-wrap{position:relative;width:100%;height:280px;overflow:hidden;}
.banner-img{width:100%;height:100%;object-fit:cover;object-position:center top;filter:brightness(.45) saturate(1.3);transition:transform 10s ease;}
.banner-wrap:hover .banner-img{transform:scale(1.04);}
.banner-overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:28px 44px;background:linear-gradient(to top,rgba(4,5,13,.96) 0%,rgba(4,5,13,.2) 55%,transparent 100%);}
.banner-chip{display:inline-flex;align-items:center;gap:7px;padding:4px 12px;border-radius:99px;background:rgba(255,255,255,.06);border:1px solid var(--bdr2);font-size:.6rem;letter-spacing:.15em;color:var(--t2);margin-bottom:10px;width:fit-content;}
.banner-dot{width:7px;height:7px;border-radius:50%;background:var(--t3);transition:background .4s;flex-shrink:0;}
.banner-dot.ok{background:var(--acc2);box-shadow:0 0 8px var(--acc2);animation:blink 2.2s infinite;}
.banner-dot.err{background:#f87171;box-shadow:0 0 8px #f87171;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
.banner-overlay h1{font-family:'Bebas Neue',cursive;font-size:clamp(2.8rem,8vw,6rem);line-height:.88;letter-spacing:.02em;color:var(--t1);}
.banner-overlay h1 em{color:var(--acc);font-style:normal;}
.sub{font-size:.6rem;letter-spacing:.22em;color:var(--t2);margin-top:7px;text-transform:uppercase;}
.banner-clock{position:absolute;top:18px;right:22px;font-family:'Space Mono',monospace;font-size:.7rem;color:var(--t2);letter-spacing:.08em;background:rgba(4,5,13,.6);padding:5px 12px;border-radius:6px;border:1px solid var(--bdr);}

/* main */
main{padding:22px 40px 8px;max-width:1060px;margin:0 auto;width:100%;}

/* grid 4 cols */
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:9px;}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:9px;}
.span2{grid-column:span 2;}

/* section divider */
.section-title-row{display:flex;align-items:center;gap:8px;margin:14px 0 8px;}
.section-divider-label{display:flex;align-items:center;gap:6px;font-size:.58rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--t3);}
.section-divider-label::after{content:'';flex:1;height:1px;background:var(--bdr);margin-left:8px;width:100vw;}

/* cards */
.card{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);padding:15px 15px 12px;display:flex;flex-direction:column;gap:8px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s,box-shadow .2s;}
.card::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 0% 0%,rgba(129,140,248,.04) 0%,transparent 60%);pointer-events:none;}
.card:hover{border-color:var(--bdr2);transform:translateY(-2px);box-shadow:0 10px 32px rgba(0,0,0,.3);}
.card.mini{padding:12px 13px 10px;gap:6px;}

/* card header */
.card-header{display:flex;align-items:center;gap:8px;}
.card-icon{width:26px;height:26px;border-radius:6px;display:grid;place-items:center;flex-shrink:0;}
.card-icon svg{width:13px;height:13px;}
.card-label{font-size:.56rem;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--t2);}

/* icon themes */
.icon-uptime  {background:rgba(129,140,248,.12);color:var(--acc);}
.icon-latency {background:rgba(52,211,153,.12);color:var(--acc2);}
.icon-creator {background:rgba(244,114,182,.12);color:var(--acc3);}
.icon-requests{background:rgba(251,191,36,.12);color:var(--acc4);}
.icon-routers {background:rgba(129,140,248,.12);color:var(--acc);}
.icon-endpoints{background:rgba(52,211,153,.12);color:var(--acc2);}
.icon-docs    {background:rgba(103,232,249,.12);color:#67e8f9;}
.icon-ver     {background:rgba(244,114,182,.12);color:var(--acc3);}
.icon-limit   {background:rgba(251,191,36,.12);color:var(--acc4);}
.icon-ram     {background:rgba(129,140,248,.12);color:var(--acc);}
.icon-ram2    {background:rgba(52,211,153,.12);color:var(--acc2);}
.icon-ram3    {background:rgba(244,114,182,.12);color:var(--acc3);}
.icon-ram4    {background:rgba(251,191,36,.12);color:var(--acc4);}
.icon-disk    {background:rgba(103,232,249,.12);color:#67e8f9;}
.icon-disk2   {background:rgba(248,113,113,.12);color:#f87171;}
.icon-disk3   {background:rgba(52,211,153,.12);color:var(--acc2);}
.icon-disk4   {background:rgba(251,191,36,.12);color:var(--acc4);}
.icon-node    {background:rgba(52,211,153,.12);color:var(--acc2);}
.icon-pid     {background:rgba(129,140,248,.12);color:var(--acc);}
.icon-platform{background:rgba(244,114,182,.12);color:var(--acc3);}
.icon-arch    {background:rgba(103,232,249,.12);color:#67e8f9;}

/* values */
.card-val{font-family:'Space Mono',monospace;font-size:1.5rem;font-weight:400;color:var(--t1);line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.card-val.big{font-family:'Bebas Neue',cursive;font-size:2.8rem;color:var(--acc4);letter-spacing:.04em;}
.card-val.sm{font-size:1.15rem;}
.card-unit{font-size:.56rem;color:var(--t3);margin-top:-4px;}
.accent-ok{color:var(--acc2)!important;}
.accent-warn{color:var(--acc4)!important;}

/* uptime */
.uptime-segments{display:flex;align-items:flex-end;gap:3px;}
.seg{display:flex;align-items:baseline;gap:3px;}
.seg-val{font-family:'Bebas Neue',cursive;font-size:2.2rem;color:var(--acc2);line-height:1;min-width:2ch;text-align:center;transition:color .15s;}
.seg-u{font-size:.52rem;letter-spacing:.2em;color:var(--t3);margin-bottom:4px;}
.seg-sep{font-size:1.6rem;color:var(--t3);margin-bottom:4px;line-height:1;}

/* latency */
.lat-wrap{display:flex;align-items:baseline;gap:7px;}
.lat-track{height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-top:2px;}
.lat-fill{height:100%;width:0%;border-radius:2px;transition:width .5s var(--ease),background .5s;}

/* mini bars */
.mini-bar-track{height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-top:2px;}
.mini-bar-fill{height:100%;width:0%;border-radius:2px;background:var(--acc2);transition:width .6s var(--ease);}
.accent-warn-bar{background:var(--acc4)!important;}

/* docs card */
.card-docs{cursor:pointer;border-color:rgba(103,232,249,.12);}
.card-docs:hover{border-color:#67e8f9;box-shadow:0 10px 32px rgba(103,232,249,.08);}
.docs-cta{display:inline-flex;align-items:center;gap:6px;font-family:'Space Grotesk',sans-serif;font-size:.95rem;font-weight:600;color:#67e8f9;letter-spacing:.03em;}
.card-hint{font-size:.55rem;color:var(--t3);letter-spacing:.12em;margin-top:-4px;}

/* stats sections */
#api-stats-container{max-width:1060px;margin:0 auto;width:100%;padding:14px 40px 28px;}
.stats-section{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r20);padding:20px 22px;margin-bottom:14px;animation:fadeUp .5s var(--ease) both;}
.section-head{display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:13px;border-bottom:1px solid var(--bdr);}
.section-icon{width:30px;height:30px;border-radius:var(--r8);display:grid;place-items:center;flex-shrink:0;}
.section-icon svg{width:15px;height:15px;}
.section-title{font-size:.62rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--t1);}
.section-sub{font-size:.56rem;color:var(--t3);margin-left:auto;letter-spacing:.1em;}
.si-overview{background:rgba(251,191,36,.1);color:var(--acc4);}
.si-top{background:rgba(52,211,153,.1);color:var(--acc2);}
.si-users{background:rgba(129,140,248,.1);color:var(--acc);}

.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:9px;}
.stat-box{background:var(--bg3);border:1px solid var(--bdr);border-radius:var(--r12);padding:13px 14px;transition:border-color .2s,transform .2s;}
.stat-box:hover{border-color:var(--bdr2);transform:translateY(-2px);}
.stat-box-icon{width:24px;height:24px;border-radius:5px;display:grid;place-items:center;margin-bottom:8px;}
.stat-box-icon svg{width:12px;height:12px;}
.sb-total{background:rgba(251,191,36,.1);color:var(--acc4);}
.sb-errors{background:rgba(248,113,113,.12);color:#f87171;}
.sb-success{background:rgba(52,211,153,.1);color:var(--acc2);}
.sb-errrate{background:rgba(251,191,36,.1);color:var(--acc4);}
.sb-avgms{background:rgba(129,140,248,.1);color:var(--acc);}
.sb-count{background:rgba(103,232,249,.1);color:#67e8f9;}
.stat-lbl{font-size:.55rem;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--t2);margin-bottom:4px;}
.stat-num{font-family:'Bebas Neue',cursive;font-size:1.9rem;line-height:1;}
.stat-num.c-yellow{color:var(--acc4);}
.stat-num.c-red{color:#f87171;}
.stat-num.c-green{color:var(--acc2);}
.stat-num.c-blue{color:var(--acc);}
.stat-num.c-cyan{color:#67e8f9;}

/* endpoints */
.ep-card{background:var(--bg3);border:1px solid var(--bdr);border-radius:var(--r12);padding:12px 14px;margin-bottom:7px;display:grid;grid-template-columns:auto 1fr;gap:11px;align-items:start;transition:border-color .2s,transform .2s;}
.ep-card:last-child{margin-bottom:0;}
.ep-card:hover{border-color:var(--bdr2);transform:translateX(4px);}
.ep-rank{width:26px;height:26px;border-radius:6px;display:grid;place-items:center;flex-shrink:0;font-family:'Bebas Neue',cursive;font-size:.85rem;background:rgba(52,211,153,.1);color:var(--acc2);border:1px solid rgba(52,211,153,.2);}
.ep-rank.gold{background:rgba(251,191,36,.12);color:var(--acc4);border-color:rgba(251,191,36,.25);}
.ep-rank.silver{background:rgba(148,163,184,.12);color:#94a3b8;border-color:rgba(148,163,184,.25);}
.ep-rank.bronze{background:rgba(180,83,9,.12);color:#fb923c;border-color:rgba(180,83,9,.25);}
.ep-path{font-family:'Space Mono',monospace;font-size:.66rem;color:var(--acc2);margin-bottom:7px;word-break:break-all;line-height:1.5;}
.ep-meta{display:flex;flex-wrap:wrap;gap:4px;}
.ep-pill{display:inline-flex;align-items:center;gap:4px;font-size:.55rem;font-weight:600;letter-spacing:.06em;padding:2px 7px;border-radius:99px;}
.ep-pill.p-req{background:rgba(52,211,153,.08);color:var(--acc2);border:1px solid rgba(52,211,153,.15);}
.ep-pill.p-err{background:rgba(248,113,113,.08);color:#f87171;border:1px solid rgba(248,113,113,.15);}
.ep-pill.p-ms{background:rgba(251,191,36,.08);color:var(--acc4);border:1px solid rgba(251,191,36,.15);}
.ep-pill.p-st{background:rgba(129,140,248,.08);color:var(--acc);border:1px solid rgba(129,140,248,.15);}
.ep-pill svg{width:9px;height:9px;flex-shrink:0;}

/* users */
.user-card{background:var(--bg3);border:1px solid var(--bdr);border-radius:var(--r12);padding:13px 14px;transition:border-color .2s,transform .2s;}
.user-card:hover{border-color:var(--bdr2);transform:translateY(-2px);}
.user-ip{display:flex;align-items:center;gap:6px;margin-bottom:6px;}
.user-ip-icon{width:20px;height:20px;border-radius:5px;background:rgba(129,140,248,.1);color:var(--acc);display:grid;place-items:center;flex-shrink:0;}
.user-ip-icon svg{width:10px;height:10px;}
.user-ip-text{font-family:'Space Mono',monospace;font-size:.62rem;color:var(--t1);}
.user-count{font-family:'Bebas Neue',cursive;font-size:1.5rem;color:var(--acc);line-height:1;}
.user-date{font-size:.54rem;color:var(--t3);margin-top:3px;letter-spacing:.07em;}

.ep-scroll{max-height:360px;overflow-y:auto;padding-right:4px;}
.ep-scroll::-webkit-scrollbar{width:3px;}
.ep-scroll::-webkit-scrollbar-track{background:transparent;}
.ep-scroll::-webkit-scrollbar-thumb{background:var(--bdr2);border-radius:3px;}

/* footer */
footer{display:flex;align-items:center;justify-content:center;gap:10px;padding:16px 40px;border-top:1px solid var(--bdr);font-size:.56rem;letter-spacing:.18em;color:var(--t3);text-transform:uppercase;}
footer em{color:var(--acc);font-style:normal;}
.footer-sep{color:var(--bdr2);}

@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}

@media(max-width:780px){
  header,main,#api-stats-container{padding-left:18px;padding-right:18px;}
  .banner-wrap{height:220px;}
  .banner-overlay{padding:20px 20px;}
  .grid,.grid4{grid-template-columns:repeat(2,1fr);}
  .span2{grid-column:span 2;}
  .stats-grid{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:420px){
  .grid,.grid4{grid-template-columns:1fr 1fr;}
}
`
  document.head.appendChild(style)

  /* ══════════════════════════════════════════════════════
     CANVAS
  ══════════════════════════════════════════════════════ */
  const canvas = document.getElementById('bg')
  const ctx    = canvas.getContext('2d')
  let W, H
  function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
  const orbs = Array.from({length:4},(_,i)=>({
    x:Math.random()*800, y:Math.random()*600,
    r:180+i*60, vx:(Math.random()-.5)*.18, vy:(Math.random()-.5)*.18,
    hue:[240,180,320,210][i],
  }))
  function drawBg(){
    ctx.clearRect(0,0,W,H)
    orbs.forEach(o=>{
      o.x+=o.vx; o.y+=o.vy
      if(o.x<-o.r)o.x=W+o.r; if(o.x>W+o.r)o.x=-o.r
      if(o.y<-o.r)o.y=H+o.r; if(o.y>H+o.r)o.y=-o.r
      const g=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r)
      g.addColorStop(0,`hsla(${o.hue},80%,60%,.045)`)
      g.addColorStop(1,`hsla(${o.hue},80%,60%,0)`)
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.fill()
    })
    ctx.fillStyle='rgba(129,140,248,.07)'
    const gs=32
    for(let x=0;x<W;x+=gs) for(let y=0;y<H;y+=gs){
      ctx.beginPath(); ctx.arc(x,y,1,0,Math.PI*2); ctx.fill()
    }
    requestAnimationFrame(drawBg)
  }
  resize(); drawBg()
  window.addEventListener('resize',resize)

  /* ══════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════ */
  let apiStartMs = null
  const set = (id,val) => { const e=document.getElementById(id); if(e) e.textContent=val }

  function parseUptime(uptimeStr) {
    const match = uptimeStr.match(/(\d+)D[, ]+(\d+)H[, ]+(\d+)M[, ]+(\d+)S/i)
    if (match) {
      const d = parseInt(match[1], 10)
      const h = parseInt(match[2], 10)
      const m = parseInt(match[3], 10)
      const s = parseInt(match[4], 10)
      return { d, h, m, s }
    }
    return { d: 0, h: 0, m: 0, s: 0 }
  }

  function renderUptime(data) {
    const uptime = parseUptime(data.uptime || '0D 0H 0M 0S')
    set('up-d', uptime.d)
    set('up-h', String(uptime.h).padStart(2, '0'))
    set('up-m', String(uptime.m).padStart(2, '0'))
    set('up-s', String(uptime.s).padStart(2, '0'))
  }

  function renderClock(){
    const t=new Date().toLocaleTimeString()
    set('live-clock',t); set('footer-time',t)
  }

  function renderLatency(ms){
    const el=document.getElementById('v-latency')
    const bar=document.getElementById('lat-bar')
    if(!el||!bar) return
    el.textContent=ms
    const color = ms<80?'var(--acc2)':ms<200?'var(--acc4)':'#f87171'
    el.style.color=color
    bar.style.width=Math.min((ms/500)*100,100)+'%'
    bar.style.background=color
  }

  function setStatus(ok){
    const dot=document.getElementById('dot')
    const txt=document.getElementById('status-text')
    if(dot) dot.className='banner-dot'+(ok?' ok':' err')
    if(txt) txt.textContent=ok?'All systems operational':'Degraded'
  }

  function setBar(id, pctStr){
    const el=document.getElementById(id)
    if(!el) return
    const pct=parseFloat(pctStr)||0
    el.style.width=Math.min(pct,100)+'%'
  }

  function extractPercent(str) {
    const match = (str || '').match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /* ══════════════════════════════════════════════════════
     FETCH getApiInfo
  ══════════════════════════════════════════════════════ */
  async function fetchStatus(){
    try{
      const t0=performance.now()
      const r=await fetch('/api/info',{cache:'no-store'})
      const ms=Math.round(performance.now()-t0)
      const response=await r.json()
      const d = response.data || response

      renderLatency(ms)
      setStatus(r.ok)

      // básicos
      set('v-creator',   d.creator   || '—')
      set('v-version',   d.version   || '—')
      set('v-limit',     d.limit !== undefined ? d.limit + ' / día' : '—')

      // routers y endpoints
      set('v-routers',   d.routers  || '—')
      set('v-endpoints', d.endpoints|| '—')

      // uptime
      if(d.uptime) renderUptime(d)

      // RAM
      const ram=d.ram||{}
      set('v-ram-rss',   ram.rss       || '—')
      set('v-heap-used', ram.heapUsed  || '—')
      set('v-heap-total',ram.heapTotal || '—')
      set('v-ram-usage', ram.usage     || '—')
      setBar('ram-bar',  extractPercent(ram.usage))

      // Disco
      const disk=d.disk||{}
      set('v-disk-total', disk.total || '—')
      set('v-disk-used',  disk.used  || '—')
      set('v-disk-free',  disk.free  || '—')
      set('v-disk-usage', disk.usage || '—')
      setBar('disk-bar',  extractPercent(disk.usage))

      // Sistema
      const proc = d.process || {}
      set('v-node',     proc.node     || d.node || '—')
      set('v-pid',      proc.pid      !== undefined ? proc.pid : '—')
      set('v-platform', proc.platform || d.platform || '—')
      set('v-arch',     proc.arch     || d.arch || '—')

    }catch(e){
      console.error('Error fetching status:', e)
      setStatus(false)
      renderLatency(999)
    }
  }

  /* ══════════════════════════════════════════════════════
     FETCH database.json
  ══════════════════════════════════════════════════════ */
  async function fetchDB(){
    try{
      const r=await fetch('/src/database.json',{cache:'no-store'})
      if(!r.ok) return
      renderStats(await r.json())
    }catch{}
  }

  function renderStats(data){
    const container=document.getElementById('api-stats-container')
    if(!container||!data) return
    const eps=data.endpoints||{}, users=data.users||{}
    let totalReq=0,totalErr=0,totalMs=0
    const epCount=Object.keys(eps).length
    Object.values(eps).forEach(e=>{ totalReq+=e.count||0; totalErr+=e.errors||0; totalMs+=e.ms||0 })
    const avgMs   = epCount>0?(totalMs/epCount).toFixed(1):0
    const errRate = totalReq>0?((totalErr/totalReq)*100).toFixed(1):0
    const succRate= (100-+errRate).toFixed(1)
    const top10   = Object.entries(eps).sort((a,b)=>b[1].count-a[1].count).slice(0,10)

    const svgReq =`<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v3l2 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`
    const svgErr =`<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v4M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
    const svgOk  =`<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 8l2 2 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    const svgMs  =`<svg viewBox="0 0 16 16" fill="none"><path d="M2 10h3l2-4 2 7 2-4 1.5 2H14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    const svgEps =`<svg viewBox="0 0 16 16" fill="none"><path d="M3 5h10M3 8h7M3 11h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`
    const svgPct =`<svg viewBox="0 0 16 16" fill="none"><path d="M3 13L13 3M6 4.5A1.5 1.5 0 114.5 6M11.5 12A1.5 1.5 0 1113 10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`
    const svgUser=`<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`

    const rankClass = i => i===0?'gold':i===1?'silver':i===2?'bronze':''
    const rankLabel = i => String(i+1)

    container.innerHTML=`
<div class="stats-section" style="animation-delay:.05s">
  <div class="section-head">
    <div class="section-icon si-overview">${svgReq}</div>
    <span class="section-title">Overview Stats</span>
    <span class="section-sub">${new Date().toLocaleTimeString()}</span>
  </div>
  <div class="stats-grid">
    <div class="stat-box"><div class="stat-box-icon sb-total">${svgReq}</div><div class="stat-lbl">Total Requests</div><div class="stat-num c-yellow">${totalReq.toLocaleString()}</div></div>
    <div class="stat-box"><div class="stat-box-icon sb-errors">${svgErr}</div><div class="stat-lbl">Total Errors</div><div class="stat-num c-red">${totalErr.toLocaleString()}</div></div>
    <div class="stat-box"><div class="stat-box-icon sb-success">${svgOk}</div><div class="stat-lbl">Success Rate</div><div class="stat-num c-green">${succRate}%</div></div>
    <div class="stat-box"><div class="stat-box-icon sb-errrate">${svgPct}</div><div class="stat-lbl">Error Rate</div><div class="stat-num c-yellow">${errRate}%</div></div>
    <div class="stat-box"><div class="stat-box-icon sb-avgms">${svgMs}</div><div class="stat-lbl">Avg Response</div><div class="stat-num c-blue">${avgMs}ms</div></div>
    <div class="stat-box"><div class="stat-box-icon sb-count">${svgEps}</div><div class="stat-lbl">Endpoints</div><div class="stat-num c-cyan">${epCount}</div></div>
  </div>
</div>

<div class="stats-section" style="animation-delay:.12s">
  <div class="section-head">
    <div class="section-icon si-top">${svgMs}</div>
    <span class="section-title">Top 10 Active Endpoints</span>
    <span class="section-sub">${top10.length} shown</span>
  </div>
  <div class="ep-scroll">
    ${top10.map(([path,st],i)=>{
      const errPct=st.count>0?((st.errors/st.count)*100).toFixed(1):0
      return`<div class="ep-card">
        <div class="ep-rank ${rankClass(i)}">${rankLabel(i)}</div>
        <div>
          <div class="ep-path">${path}</div>
          <div class="ep-meta">
            <span class="ep-pill p-req">${svgReq} ${st.count.toLocaleString()} req</span>
            <span class="ep-pill p-err">${svgErr} ${st.errors} err (${errPct}%)</span>
            <span class="ep-pill p-ms">${svgMs} ${st.ms}ms</span>
            <span class="ep-pill p-st">${svgOk} ${st.status}</span>
          </div>
        </div>
      </div>`
    }).join('')}
  </div>
</div>

<div class="stats-section" style="animation-delay:.19s">
  <div class="section-head">
    <div class="section-icon si-users">${svgUser}</div>
    <span class="section-title">Active Users</span>
    <span class="section-sub">${Object.keys(users).length} IPs</span>
  </div>
  <div class="stats-grid">
    ${Object.entries(users).map(([ip,info])=>`
    <div class="user-card">
      <div class="user-ip"><div class="user-ip-icon">${svgUser}</div><span class="user-ip-text">${ip}</span></div>
      <div class="user-count">${(info.count||0).toLocaleString()}</div>
      <div class="user-date">${info.date||'—'}</div>
    </div>`).join('')}
  </div>
</div>

<p style="text-align:center;font-size:.54rem;color:var(--t3);margin-top:6px;letter-spacing:.14em;text-transform:uppercase;padding-bottom:8px">
  Auto-refresh 3s · Last update ${new Date().toLocaleTimeString()}
</p>`
  }

  /* ══════════════════════════════════════════════════════
     TICK
  ══════════════════════════════════════════════════════ */
  setInterval(renderClock,  1000)
  renderClock()

  fetchStatus()
  fetchDB()
  setInterval(fetchStatus, 3000)
  setInterval(fetchDB,     3000)
})
