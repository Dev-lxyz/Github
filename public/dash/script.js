'use strict';
/*  Nexus API Dashboard · script.js  v4 — Full Enhanced*/

const BASE = window.location.origin;
const $    = id => document.getElementById(id);

let DATA         = null;
let SETTINGS     = null;
let NOTIFS       = [];
let MUSIC        = [];
let DB           = null;
let lastResp     = {};
let uptimeTimer  = null;
let apiStartTime = null;
let ADMIN_OPEN   = false;

const PLAYER = { audio:null, idx:0, playing:false, volume:0.8, muted:false };
const REQ_LOG = [];
let CLIENT_IP = '—';
// obtener IP real del cliente una sola vez
fetch('https://api.ipify.org?format=json').then(r=>r.json()).then(d=>{ CLIENT_IP=d.ip||'—'; }).catch(()=>{});
const getIp = () => CLIENT_IP;

const CAT_COLORS = {
  search:'#06b6d4',random:'#7c3aed',canvas:'#f97316',tools:'#06b6d4',
  anime:'#ec4899',nsfw:'#f43f5e',stalking:'#a855f7',download:'#10b981',
  reaction:'#ec4899',play:'#f97316',api:'#06b6d4',ai:'#7c3aed',
  sticker:'#ec4899','api status':'#06b6d4',all:'#6366f1',
};
const CAT_ICONS = {
  search:'fa-magnifying-glass',random:'fa-shuffle',canvas:'fa-palette',
  tools:'fa-screwdriver-wrench',anime:'fa-film',nsfw:'fa-lock',
  stalking:'fa-user-secret',download:'fa-download',reaction:'fa-face-smile',
  play:'fa-play',api:'fa-code',ai:'fa-brain',sticker:'fa-image',
  'api status':'fa-server',all:'fa-layer-group',
};
const catColor = n => CAT_COLORS[n?.toLowerCase()] || '#7c3aed';
const catIcon  = n => CAT_ICONS[n?.toLowerCase()]  || 'fa-folder';
const pad  = n => String(n).padStart(2,'0');
const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtN = n => Number.isFinite(+n) ? (+n).toLocaleString() : '—';

/* 
   BOOTSTRAP
 */
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');
  injectStyles();
  injectShell();
  loaderProgress(10,'Conectando…');
  Promise.all([
    fetch('/src/endpoint.json').then(r=>{loaderProgress(25,'Endpoints…');return r.json();}),
    fetch('/src/settings.json').then(r=>{loaderProgress(45,'Settings…');return r.json();}),
    fetch('/notifications.json').then(r=>r.json()).catch(()=>[]),
    fetch('/music.json').then(r=>r.json()).catch(()=>[]),
    fetch('/src/database.json').then(r=>r.json()).catch(()=>null),
  ]).then(([ep,st,nf,ms,db])=>{
    DATA=ep; SETTINGS=st;
    NOTIFS=Array.isArray(nf)?nf.map(n=>({...n,enabled:n.enabled!==false})):[];
    MUSIC=Array.isArray(ms)?ms:[];
    DB=db;
    const name=SETTINGS.name||'Nexus', first=name.split(' ')[0];
    $('logo-mark').textContent=(first[0]||'N').toUpperCase();
    $('logo-name').textContent=first;
    $('status-text').textContent=SETTINGS.header?.status||'Online';
    apiStartTime=SETTINGS.startTime?new Date(SETTINGS.startTime).getTime()
      :(SETTINGS.uptime?Date.now()-SETTINGS.uptime*1000:Date.now());
    loaderProgress(90,'Renderizando…');
    renderAll();
    initPlayer();
    updateNotifBadge();
    loaderDone();
  }).catch(err=>{
    console.error('[Nexus]',err);
    const lt=$('loader-txt'),lb=$('loader-bar');
    if(lt)lt.textContent='⚠ Error al cargar';
    if(lb)lb.style.background='var(--acc3)';
    loaderProgress(100);
  });
});

/* 
   STYLES
 */
function injectStyles(){
  const s=document.createElement('style');
  s.textContent=`
:root{
  --acc:#6366f1;--acc2:#06b6d4;--acc3:#f43f5e;--ok:#10b981;--warn:#f59e0b;
  --bg:#07090f;--bg1:#0e1117;--bg2:#141a24;--bg3:#1a2030;--bg4:#20283c;
  --bdr:rgba(255,255,255,.06);--bdr2:rgba(255,255,255,.12);
  --t1:#e8edf8;--t2:#8892aa;--t3:#444d60;
  --r4:4px;--r8:8px;--r12:12px;--r16:16px;--r20:20px;
  --ease:cubic-bezier(.4,0,.2,1);
}
html[data-theme=light]{
  --bg:#f0f2f8;--bg1:#fff;--bg2:#e8ecf5;--bg3:#dde3f0;--bg4:#d2d9ec;
  --bdr:rgba(0,0,0,.06);--bdr2:rgba(0,0,0,.12);
  --t1:#0a0f20;--t2:#3d4a62;--t3:#8892a8;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--t1);overflow-x:hidden;-webkit-font-smoothing:antialiased;}
body::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.03'/%3E%3C/svg%3E");opacity:.5;}
.glow-blob{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0;}
.glow-blob.a{width:500px;height:500px;background:var(--acc);top:-180px;left:-100px;opacity:.08;}
.glow-blob.b{width:420px;height:420px;background:var(--acc2);bottom:-140px;right:-100px;opacity:.06;}
.glow-blob.c{width:300px;height:300px;background:var(--acc3);top:50%;left:50%;transform:translate(-50%,-50%);opacity:.04;}
/* Loader */
#loader{position:fixed;inset:0;z-index:9999;background:var(--bg1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;transition:opacity .4s var(--ease);}
#loader.out{opacity:0;pointer-events:none;}
.loader-logo{width:60px;height:60px;border-radius:14px;background:linear-gradient(135deg,var(--acc),var(--acc2));display:grid;place-items:center;font-weight:800;font-size:28px;color:#fff;box-shadow:0 0 40px rgba(99,102,241,.5);animation:pulseLogo 1.4s ease-in-out infinite;}
@keyframes pulseLogo{0%,100%{box-shadow:0 0 40px rgba(99,102,241,.5)}50%{box-shadow:0 0 64px rgba(99,102,241,.9)}}
.loader-bar-wrap{width:200px;height:2px;background:var(--bg3);border-radius:99px;overflow:hidden;}
.loader-bar{height:100%;width:0%;background:linear-gradient(90deg,var(--acc),var(--acc2));border-radius:99px;transition:width .3s var(--ease);}
.loader-txt{font-size:11px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;}
/* Header */
.header{position:fixed;inset:0 0 auto 0;height:60px;background:rgba(7,9,15,.85);backdrop-filter:blur(24px) saturate(180%);border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;padding:0 20px;z-index:900;}
html[data-theme=light] .header{background:rgba(240,242,248,.92);}
.logo{display:flex;align-items:center;gap:9px;text-decoration:none;color:var(--t1);cursor:pointer;user-select:none;}
.logo-mark{width:34px;height:34px;border-radius:var(--r8);flex-shrink:0;background:linear-gradient(135deg,var(--acc),var(--acc2));display:grid;place-items:center;font-weight:800;font-size:16px;color:#fff;box-shadow:0 0 16px rgba(99,102,241,.4);}
.logo-text{font-weight:700;font-size:16px;background:linear-gradient(90deg,var(--acc),var(--acc2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hdr-right{display:flex;align-items:center;gap:5px;}
.pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;font-size:10px;font-weight:700;}
.pill-ok{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);color:var(--ok);}
.pill-dot{width:5px;height:5px;border-radius:50%;background:var(--ok);animation:blink 2s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
.icon-btn{width:34px;height:34px;border-radius:var(--r8);border:1px solid var(--bdr);background:transparent;color:var(--t2);cursor:pointer;display:grid;place-items:center;font-size:13px;transition:background .2s,color .2s,border-color .2s;position:relative;}
.icon-btn:hover{background:var(--acc);color:#fff;border-color:var(--acc);}
.icon-btn.admin-btn.unlocked{background:rgba(99,102,241,.15);border-color:var(--acc);color:var(--acc);}
.notif-badge{position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--acc3);color:#fff;font-size:8px;font-weight:800;display:none;align-items:center;justify-content:center;border:2px solid var(--bg1);}
.notif-badge.show{display:flex;}
/* Layout */
.layout{display:flex;margin-top:60px;min-height:calc(100vh - 60px);position:relative;z-index:1;}
/* Sidebar */
.sidebar{width:236px;flex-shrink:0;background:var(--bg1);border-right:1px solid var(--bdr);padding:14px 10px;overflow-y:auto;position:fixed;top:60px;left:0;bottom:0;z-index:800;display:flex;flex-direction:column;gap:16px;transition:transform .3s var(--ease);will-change:transform;}
.sb-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--t3);padding:0 8px;margin-bottom:2px;}
.sb-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--r8);font-size:12px;font-weight:500;color:var(--t2);cursor:pointer;border:none;background:none;width:100%;text-align:left;text-decoration:none;transition:background .15s,color .15s;}
.sb-item:hover{background:var(--bg3);color:var(--t1);}
.sb-item.active{background:rgba(99,102,241,.12);color:var(--acc);}
.sb-item i{width:14px;text-align:center;font-size:12px;flex-shrink:0;}
.sb-badge{margin-left:auto;font-size:9px;font-weight:700;background:rgba(99,102,241,.15);color:var(--acc);padding:2px 6px;border-radius:99px;}
.sb-off{opacity:.35;pointer-events:none;}
.sb-divider{height:1px;background:var(--bdr);margin:2px 0;}
/* Main */
.main{margin-left:236px;flex:1;display:flex;flex-direction:column;}
.content{flex:1;padding:32px 32px 24px;}
/* Intro */
.intro-rule{display:flex;align-items:center;gap:12px;margin-bottom:28px;animation:fadeDown .6s var(--ease) both;}
.intro-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--bdr2),transparent);}
.intro-label{font-size:9px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:var(--t3);white-space:nowrap;display:flex;align-items:center;gap:5px;}
@keyframes fadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
/* Hero */
.hero{text-align:center;margin-bottom:32px;}
.hero-img{width:100%;max-width:360px;height:auto;border-radius:var(--r16);margin:0 auto 20px;display:block;box-shadow:0 24px 60px rgba(99,102,241,.2);}
.hero-eyebrow{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--acc);margin-bottom:7px;}
.hero-title{font-size:36px;font-weight:800;line-height:1.05;margin-bottom:9px;background:linear-gradient(135deg,var(--t1),var(--t2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hero-sub{font-size:13px;color:var(--t2);max-width:500px;margin:0 auto;line-height:1.7;}
/* Stats */
.stats-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:24px;}
.stat-card{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);padding:14px 16px;display:flex;align-items:center;gap:12px;transition:border-color .2s,transform .2s;}
.stat-card:hover{border-color:var(--bdr2);transform:translateY(-2px);}
.stat-icon{width:38px;height:38px;border-radius:var(--r8);display:grid;place-items:center;font-size:16px;flex-shrink:0;}
.stat-icon.g{background:linear-gradient(135deg,var(--ok),#34d399);color:#fff;}
.stat-icon.b{background:linear-gradient(135deg,var(--acc2),#0ea5e9);color:#fff;}
.stat-icon.p{background:linear-gradient(135deg,var(--acc),#a855f7);color:#fff;}
.stat-icon.r{background:linear-gradient(135deg,var(--acc3),#fb923c);color:#fff;}
.stat-icon.y{background:linear-gradient(135deg,var(--warn),#fbbf24);color:#fff;}
.stat-val{font-size:17px;font-weight:800;line-height:1;}
.stat-lbl{font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;margin-top:3px;}
/* Meta */
.meta-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px;}
.meta-card{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);padding:14px 12px;text-align:center;transition:border-color .2s,transform .2s;}
.meta-card:hover{border-color:var(--bdr2);transform:translateY(-2px);}
.meta-card i{font-size:17px;display:block;margin-bottom:6px;}
.meta-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);margin-bottom:4px;}
.meta-val{font-size:11px;color:var(--t2);font-family:'JetBrains Mono',monospace;}
.meta-val.big{font-size:13px;font-weight:700;color:var(--t1);}
/* DB card */
.db-card{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);padding:18px 20px;margin-bottom:24px;}
.db-card-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);margin-bottom:12px;display:flex;align-items:center;gap:7px;}
.db-summary{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:14px;}
.db-stat{background:var(--bg1);border:1px solid var(--bdr);border-radius:var(--r8);padding:10px 12px;}
.db-stat-key{font-size:9px;font-weight:800;text-transform:uppercase;color:var(--t3);margin-bottom:3px;}
.db-stat-val{font-size:15px;font-weight:800;color:var(--t1);}
.db-stat-val.ok{color:var(--ok);}
.db-stat-val.err{color:var(--acc3);}
.db-stat-val.warn{color:var(--warn);}
.db-top-label{font-size:9px;font-weight:800;text-transform:uppercase;color:var(--t3);margin-bottom:7px;display:flex;align-items:center;gap:5px;}
.db-top-list{display:flex;flex-direction:column;gap:4px;}
.db-top-row{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg1);border:1px solid var(--bdr);border-radius:var(--r8);}
.db-top-rank{width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;font-size:8px;font-weight:800;display:grid;place-items:center;flex-shrink:0;}
.db-top-path{flex:1;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.db-pill{font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px;flex-shrink:0;}
.db-pill.req{background:rgba(16,185,129,.1);color:var(--ok);}
.db-pill.err{background:rgba(244,63,94,.1);color:var(--acc3);}
.db-pill.ms{background:rgba(245,158,11,.1);color:var(--warn);}
/* API info */
.api-info-card{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);padding:18px 20px;margin-bottom:24px;}
.api-info-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);margin-bottom:12px;display:flex;align-items:center;gap:7px;}
.api-info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;}
.api-info-item{display:flex;flex-direction:column;gap:3px;padding:10px 12px;background:var(--bg1);border:1px solid var(--bdr);border-radius:var(--r8);}
.api-info-key{font-size:9px;font-weight:800;text-transform:uppercase;color:var(--t3);}
.api-info-val{font-size:11px;color:var(--t1);font-family:'JetBrains Mono',monospace;word-break:break-all;}
.api-info-val.ok{color:var(--ok);}
.api-info-val.warn{color:var(--warn);}
.api-info-val.err{color:var(--acc3);}
/* Sec title */
.sec-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--t3);margin-bottom:12px;display:flex;align-items:center;gap:8px;}
.sec-title::after{content:'';flex:1;height:1px;background:var(--bdr);}
/* Creator */
.creator-wrap{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);padding:16px 18px;display:flex;align-items:center;gap:14px;margin-bottom:20px;}
.creator-img{width:48px;height:48px;border-radius:50%;border:2px solid var(--acc);object-fit:cover;flex-shrink:0;}
.creator-name{font-size:15px;font-weight:700;}
.creator-role{font-size:9px;color:var(--t3);text-transform:uppercase;margin-top:2px;}
.creator-link{margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:var(--r8);background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);color:var(--acc);font-size:11px;font-weight:700;text-decoration:none;transition:all .2s;white-space:nowrap;}
.creator-link:hover{background:var(--acc);color:#fff;}
/* Collabs */
.collabs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:28px;}
.collab-card{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);padding:14px;text-align:center;transition:border-color .2s,transform .2s;}
.collab-card:hover{border-color:var(--acc);transform:translateY(-3px);}
.collab-img{width:42px;height:42px;border-radius:50%;border:2px solid var(--bdr2);object-fit:cover;margin:0 auto 8px;}
.collab-name{font-size:12px;font-weight:700;margin-bottom:2px;}
.collab-role{font-size:9px;color:var(--t3);text-transform:uppercase;margin-bottom:8px;}
.collab-link{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--acc);text-decoration:none;}
/* Cat cards */
.cats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px;margin-bottom:36px;}
.cat-card{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);padding:16px 12px;cursor:pointer;text-align:center;transition:border-color .2s,transform .2s;position:relative;overflow:hidden;}
.cat-card::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,var(--cc,var(--acc)) 0%,transparent 70%);opacity:0;transition:opacity .25s;pointer-events:none;}
.cat-card:hover{border-color:var(--cc,var(--acc));transform:translateY(-3px);}
.cat-card:hover::after{opacity:.07;}
.cat-card.inactive{opacity:.35;pointer-events:none;}
.cat-ico{width:44px;height:44px;border-radius:var(--r8);display:grid;place-items:center;font-size:19px;color:#fff;margin:0 auto 9px;position:relative;z-index:1;background:linear-gradient(135deg,var(--cc,var(--acc)),color-mix(in srgb,var(--cc,var(--acc)) 60%,#fff));}
.cat-name{font-size:12px;font-weight:700;margin-bottom:3px;position:relative;z-index:1;}
.cat-count{font-size:10px;color:var(--t3);position:relative;z-index:1;}
.cat-badge{font-size:8px;padding:2px 7px;border-radius:99px;font-weight:800;text-transform:uppercase;margin-top:6px;display:inline-block;position:relative;z-index:1;}
.cat-badge.on{background:rgba(16,185,129,.12);color:var(--ok);}
.cat-badge.off{background:rgba(244,63,94,.12);color:var(--acc3);}
/* Cat section */
.cat-section{display:none;}
.cat-section.active{display:block;}
.sec-head{display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--bdr);}
.sec-icon{width:40px;height:40px;border-radius:var(--r12);display:grid;place-items:center;font-size:18px;color:#fff;background:linear-gradient(135deg,var(--acc),var(--acc2));flex-shrink:0;}
.sec-name{font-size:21px;font-weight:800;}
.sec-sub{font-size:11px;color:var(--t2);}
.back-btn{margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:var(--r8);border:1px solid var(--bdr);background:none;color:var(--t2);font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;}
.back-btn:hover{background:var(--acc);color:#fff;border-color:var(--acc);}
/* Search */
.search-bar{display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r8);margin-bottom:14px;transition:border-color .2s;}
.search-bar:focus-within{border-color:var(--acc);}
.search-bar i{color:var(--t3);font-size:12px;}
.search-bar input{flex:1;background:none;border:none;outline:none;color:var(--t1);font-family:'Outfit',sans-serif;font-size:12px;}
.search-bar input::placeholder{color:var(--t3);}
/* Endpoint */
.eps-list{display:flex;flex-direction:column;gap:6px;}
.ep{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);overflow:hidden;transition:border-color .15s;}
.ep:hover:not(.disabled){border-color:var(--bdr2);}
.ep.disabled{opacity:.35;pointer-events:none;}
.ep.hidden{display:none;}
.ep-head{display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;user-select:none;}
.ep-method{display:inline-flex;align-items:center;justify-content:center;width:48px;height:22px;border-radius:var(--r4);font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;text-transform:uppercase;flex-shrink:0;border:1px solid;}
.ep-method.get{background:rgba(59,130,246,.08);color:#60a5fa;border-color:rgba(59,130,246,.3);}
.ep-method.post{background:rgba(34,197,94,.08);color:#4ade80;border-color:rgba(34,197,94,.3);}
.ep-method.put{background:rgba(249,115,22,.08);color:#fb923c;border-color:rgba(249,115,22,.3);}
.ep-method.delete{background:rgba(244,63,94,.08);color:#fb7185;border-color:rgba(244,63,94,.3);}
.ep-method.patch{background:rgba(168,85,247,.08);color:#c084fc;border-color:rgba(168,85,247,.3);}
.ep-info{flex:1;min-width:0;}
.ep-path{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t1);word-break:break-all;}
.ep-name{font-size:10px;color:var(--t3);margin-top:2px;}
.ep-badge{font-size:8px;padding:2px 6px;border-radius:99px;font-weight:800;text-transform:uppercase;flex-shrink:0;}
.ep-badge.on{background:rgba(16,185,129,.1);color:var(--ok);}
.ep-badge.off{background:rgba(244,63,94,.1);color:var(--acc3);}
.ep-hits{font-size:8px;padding:2px 6px;border-radius:99px;font-weight:700;background:rgba(6,182,212,.1);color:var(--acc2);flex-shrink:0;}
.ep-chev{width:24px;height:24px;border-radius:var(--r4);background:none;border:1px solid var(--bdr);color:var(--t3);cursor:pointer;display:grid;place-items:center;font-size:10px;transition:all .2s;flex-shrink:0;}
.ep-chev:hover{background:var(--acc);color:#fff;border-color:var(--acc);}
.ep-chev.open{transform:rotate(180deg);}
.ep-body{display:none;padding:14px 16px;border-top:1px solid var(--bdr);background:var(--bg1);}
.ep-body.open{display:block;}
.ep-desc{padding:8px 12px;background:rgba(99,102,241,.06);border-left:2px solid var(--acc);border-radius:0 var(--r4) var(--r4) 0;font-size:11px;color:var(--t2);line-height:1.6;margin-bottom:10px;}
.ep-db-stats{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;}
.ep-db-pill{font-size:9px;padding:2px 8px;border-radius:99px;font-weight:700;display:flex;align-items:center;gap:3px;}
.ep-db-pill.req{background:rgba(6,182,212,.1);color:var(--acc2);}
.ep-db-pill.err{background:rgba(244,63,94,.1);color:var(--acc3);}
.ep-db-pill.ms{background:rgba(245,158,11,.1);color:var(--warn);}
.ep-db-pill.st{background:rgba(16,185,129,.1);color:var(--ok);}
.url-row{display:flex;align-items:center;gap:7px;padding:7px 10px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r8);margin-bottom:10px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t2);word-break:break-all;}
.url-copy{flex-shrink:0;padding:3px 7px;border-radius:var(--r4);background:none;border:1px solid var(--bdr);color:var(--t3);font-size:10px;cursor:pointer;transition:all .2s;}
.url-copy:hover{background:var(--acc);color:#fff;border-color:var(--acc);}
/* Form */
.ep-form{display:flex;flex-direction:column;gap:8px;}
.f-group{display:flex;flex-direction:column;gap:4px;}
.f-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);}
.f-input,.f-select{padding:7px 10px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r8);color:var(--t1);font-family:'Outfit',sans-serif;font-size:12px;outline:none;transition:border-color .2s,box-shadow .2s;}
.f-input:focus,.f-select:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(99,102,241,.1);}
.f-input::placeholder{color:var(--t3);}
.f-select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 9L1 4h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 9px center;padding-right:26px;}
.no-params{font-size:11px;color:var(--t3);margin-bottom:6px;}
.btn-run{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border-radius:var(--r8);border:none;background:linear-gradient(135deg,var(--acc),#818cf8);color:#fff;font-weight:700;font-size:12px;cursor:pointer;width:100%;font-family:'Outfit',sans-serif;transition:box-shadow .2s,transform .15s,opacity .2s;}
.btn-run:hover{box-shadow:0 8px 20px rgba(99,102,241,.3);transform:translateY(-1px);}
.btn-run:active{transform:none;}
.btn-run.loading{opacity:.5;pointer-events:none;}
/* Response */
.resp-panel{display:none;margin-top:10px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r8);overflow:hidden;}
.resp-panel.open{display:block;}
.resp-head{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg2);border-bottom:1px solid var(--bdr);}
.resp-status{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;color:var(--t2);font-family:'JetBrains Mono',monospace;}
.resp-dot{width:6px;height:6px;border-radius:50%;background:var(--ok);}
.resp-dot.err{background:var(--acc3);}
.resp-actions{display:flex;gap:4px;}
.btn-sm{padding:4px 8px;border-radius:var(--r4);border:1px solid var(--bdr);background:none;color:var(--t2);font-size:10px;cursor:pointer;transition:all .2s;}
.btn-sm:hover{background:var(--acc);color:#fff;border-color:var(--acc);}
.resp-content{padding:12px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#7dd3fc;max-height:420px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;line-height:1.7;contain:content;}
.resp-content img,.resp-content video,.resp-content audio{max-width:100%;margin-top:8px;border-radius:var(--r8);}
.jk{color:#f472b6}.js{color:#86efac}.jn{color:#fbbf24}.jb{color:#60a5fa}.jnull{color:#a78bfa}
/* Admin overlay */
.admin-overlay{position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.65);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;}
.admin-overlay.open{display:flex;}
.admin-panel{background:var(--bg1);border:1px solid var(--bdr2);border-radius:var(--r20);width:min(740px,96vw);max-height:92vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 32px 80px rgba(0,0,0,.6);}
.admin-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--bdr);}
.admin-title{font-size:15px;font-weight:800;display:flex;align-items:center;gap:8px;}
.admin-title i{color:var(--acc);}
.admin-close{width:30px;height:30px;border-radius:var(--r8);border:1px solid var(--bdr);background:none;color:var(--t2);cursor:pointer;display:grid;place-items:center;font-size:12px;transition:all .2s;}
.admin-close:hover{background:var(--acc3);color:#fff;border-color:var(--acc3);}
.admin-body{padding:18px 22px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px;}
/* Admin login */
.admin-login{display:flex;flex-direction:column;gap:14px;align-items:center;padding:20px 0;}
.admin-login-icon{width:60px;height:60px;border-radius:var(--r16);background:linear-gradient(135deg,var(--acc),#818cf8);display:grid;place-items:center;font-size:26px;color:#fff;box-shadow:0 0 40px rgba(99,102,241,.4);}
.admin-login h3{font-size:17px;font-weight:800;}
.admin-login p{font-size:12px;color:var(--t3);}
.admin-login .f-input{width:100%;max-width:280px;}
.btn-admin-login{padding:9px 24px;border-radius:var(--r8);border:none;background:linear-gradient(135deg,var(--acc),#818cf8);color:#fff;font-weight:700;font-size:13px;cursor:pointer;transition:all .2s;font-family:'Outfit',sans-serif;}
.btn-admin-login:hover{box-shadow:0 6px 18px rgba(99,102,241,.3);transform:translateY(-1px);}
.admin-login-err{font-size:11px;color:var(--acc3);display:none;}
.admin-login-err.show{display:block;}
/* Admin tabs/sections */
.admin-tabs{display:flex;gap:4px;border-bottom:1px solid var(--bdr);padding-bottom:12px;flex-wrap:wrap;}
.admin-tab{padding:5px 11px;border-radius:var(--r8);font-size:11px;font-weight:700;cursor:pointer;border:1px solid var(--bdr);background:none;color:var(--t2);transition:all .2s;font-family:'Outfit',sans-serif;}
.admin-tab:hover,.admin-tab.active{background:var(--acc);color:#fff;border-color:var(--acc);}
.admin-section{display:none;}
.admin-section.active{display:flex;flex-direction:column;gap:10px;}
.admin-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.admin-info-card{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r8);padding:11px 13px;}
.admin-info-key{font-size:9px;font-weight:800;text-transform:uppercase;color:var(--t3);margin-bottom:3px;}
.admin-info-val{font-size:12px;color:var(--t1);font-family:'JetBrains Mono',monospace;word-break:break-all;}
.admin-info-val.ok{color:var(--ok);}
.admin-info-val.warn{color:var(--warn);}
.admin-sec-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--t3);}
.admin-sep{height:1px;background:var(--bdr);}
/* Admin tables */
.admin-req-table{width:100%;border-collapse:collapse;font-size:10px;}
.admin-req-table th{text-align:left;padding:6px 8px;color:var(--t3);font-size:9px;text-transform:uppercase;border-bottom:1px solid var(--bdr);}
.admin-req-table td{padding:6px 8px;border-bottom:1px solid var(--bdr);color:var(--t2);font-family:'JetBrains Mono',monospace;}
.admin-req-table tr:last-child td{border:none;}
.admin-req-table td.ok{color:var(--ok);}
.admin-req-table td.err{color:var(--acc3);}
.req-table-wrap{overflow-x:auto;max-height:280px;overflow-y:auto;border:1px solid var(--bdr);border-radius:var(--r8);}
.req-stats-row{display:flex;gap:6px;flex-wrap:wrap;}
.req-stat-pill{padding:4px 10px;border-radius:99px;font-size:10px;font-weight:700;background:var(--bg2);border:1px solid var(--bdr);}
.req-stat-pill.ok{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.25);color:var(--ok);}
.req-stat-pill.err{background:rgba(244,63,94,.08);border-color:rgba(244,63,94,.25);color:var(--acc3);}
.req-stat-pill.neutral{color:var(--t2);}
.req-filter-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
.req-filter-bar input{flex:1;min-width:120px;padding:6px 10px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r8);color:var(--t1);font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;}
.req-filter-bar input:focus{border-color:var(--acc);}
.req-filter-bar select{padding:5px 9px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r8);color:var(--t1);font-size:11px;outline:none;cursor:pointer;font-family:'Outfit',sans-serif;}
.ip-tag{display:inline-block;padding:1px 6px;border-radius:3px;background:rgba(6,182,212,.1);color:var(--acc2);font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;}
/* Toggle */
.toggle-sw{position:relative;display:inline-block;width:36px;height:20px;flex-shrink:0;}
.toggle-sw input{opacity:0;width:0;height:0;}
.toggle-slider{position:absolute;cursor:pointer;inset:0;background:var(--bg4);border-radius:99px;transition:.25s;}
.toggle-slider:before{content:'';position:absolute;width:14px;height:14px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.25s;}
.toggle-sw input:checked+.toggle-slider{background:var(--ok);}
.toggle-sw input:checked+.toggle-slider:before{transform:translateX(16px);}
/* Ep Manager */
.cat-mgr-row{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r8);margin-bottom:5px;font-size:12px;}
.cat-mgr-row .cmr-name{flex:1;font-weight:700;}
.cat-mgr-row .cmr-count{font-size:9px;color:var(--t3);}
.cat-collapse-btn{background:none;border:none;color:var(--t3);cursor:pointer;font-size:11px;padding:2px 5px;border-radius:var(--r4);transition:color .2s;}
.cat-collapse-btn:hover{color:var(--acc);}
.cat-eps-sub{display:none;margin-left:10px;margin-top:4px;padding-left:10px;border-left:2px solid var(--bdr2);}
.cat-eps-sub.open{display:block;}
.ep-mgr-row{display:flex;align-items:center;gap:7px;padding:7px 10px;background:var(--bg1);border:1px solid var(--bdr);border-radius:var(--r8);margin-bottom:4px;font-size:11px;}
.ep-mgr-row .method-tag{font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;padding:2px 5px;border-radius:3px;background:var(--bg3);color:var(--acc2);flex-shrink:0;}
.ep-mgr-row .ep-mgr-path{flex:1;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ep-mgr-row .ep-mgr-name{font-size:9px;color:var(--t3);width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* Notifs */
.notif-list{display:flex;flex-direction:column;gap:8px;}
.notif-card{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);overflow:hidden;transition:border-color .2s;}
.notif-card.disabled{opacity:.5;}
.notif-card-head{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;}
.notif-card-icon{width:34px;height:34px;border-radius:var(--r8);background:linear-gradient(135deg,var(--warn),#fb923c);display:grid;place-items:center;font-size:14px;color:#fff;flex-shrink:0;}
.notif-card-info{flex:1;min-width:0;}
.notif-card-title{font-size:13px;font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.notif-card-meta{font-size:9px;color:var(--t3);display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.notif-card-body{display:none;padding:0 14px 12px;font-size:12px;color:var(--t2);line-height:1.6;border-top:1px solid var(--bdr);}
.notif-card-body.open{display:block;padding-top:12px;}
.notif-empty{text-align:center;padding:40px 20px;color:var(--t3);font-size:12px;}
.notif-empty i{font-size:32px;margin-bottom:12px;display:block;opacity:.4;}
/* Music */
.player-card{background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r16);overflow:hidden;margin-bottom:18px;position:relative;}
.player-bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(40px) saturate(200%);opacity:.18;transition:background-image .5s;}
.player-inner{position:relative;z-index:1;padding:24px 24px 16px;}
.player-art-wrap{width:110px;height:110px;border-radius:var(--r12);overflow:hidden;margin:0 auto 16px;box-shadow:0 16px 40px rgba(0,0,0,.5);}
.player-art{width:100%;height:100%;object-fit:cover;display:block;}
.player-art.spin{animation:artSpin 8s linear infinite;}
@keyframes artSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.player-info{text-align:center;margin-bottom:14px;}
.player-title{font-size:17px;font-weight:800;margin-bottom:3px;}
.player-id{font-size:9px;color:var(--t3);font-family:'JetBrains Mono',monospace;}
.player-progress-wrap{margin-bottom:12px;}
.player-progress-track{height:5px;background:var(--bg4);border-radius:99px;cursor:pointer;position:relative;}
.player-progress-fill{height:100%;background:linear-gradient(90deg,var(--acc),var(--acc2));border-radius:99px;width:0%;pointer-events:none;transition:width .1s linear;}
.player-times{display:flex;justify-content:space-between;font-size:9px;color:var(--t3);font-family:'JetBrains Mono',monospace;margin-top:4px;}
.player-controls{display:flex;align-items:center;justify-content:center;gap:10px;}
.p-btn{background:none;border:none;color:var(--t2);cursor:pointer;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:14px;transition:all .2s;}
.p-btn:hover{color:var(--t1);background:var(--bg3);}
.p-btn.play-pause{width:50px;height:50px;background:linear-gradient(135deg,var(--acc),#818cf8);color:#fff;font-size:18px;box-shadow:0 8px 20px rgba(99,102,241,.35);}
.p-btn.play-pause:hover{transform:scale(1.07);}
.player-vol-row{display:flex;align-items:center;gap:9px;padding:10px 24px 14px;border-top:1px solid var(--bdr);}
.player-vol-row i{color:var(--t3);font-size:13px;width:16px;text-align:center;cursor:pointer;transition:color .2s;flex-shrink:0;}
.player-vol-row i:hover{color:var(--acc);}
.vol-track{flex:1;height:4px;background:var(--bg4);border-radius:99px;cursor:pointer;}
.vol-fill{height:100%;background:var(--acc2);border-radius:99px;pointer-events:none;}
.music-list{display:flex;flex-direction:column;gap:5px;}
.music-list-item{display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r8);cursor:pointer;transition:all .2s;}
.music-list-item:hover{border-color:var(--acc);background:var(--bg3);}
.music-list-item.active{border-color:var(--acc);background:rgba(99,102,241,.08);}
.mli-art{width:36px;height:36px;border-radius:var(--r8);object-fit:cover;flex-shrink:0;}
.mli-info{flex:1;min-width:0;}
.mli-title{font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mli-id{font-size:9px;color:var(--t3);font-family:'JetBrains Mono',monospace;}
.mli-indicator{width:20px;height:20px;display:grid;place-items:center;font-size:11px;}
/* Footer */
.footer{margin-left:236px;padding:14px 32px;border-top:1px solid var(--bdr);background:var(--bg1);font-size:10px;color:var(--t3);text-align:center;}
.footer a{color:var(--acc);text-decoration:none;}
.footer a:hover{text-decoration:underline;}
/* Toast */
#toast{position:fixed;bottom:16px;right:16px;z-index:9998;display:flex;align-items:center;gap:7px;padding:9px 14px;background:var(--bg2);border:1px solid var(--bdr2);border-radius:var(--r8);font-size:11px;font-weight:700;box-shadow:0 12px 30px rgba(0,0,0,.5);transform:translateY(100px);opacity:0;pointer-events:none;transition:all .3s var(--ease);}
#toast.show{transform:none;opacity:1;}
/* Quick access */
.quick-grid{display:flex;flex-direction:column;gap:7px;margin-bottom:32px;}
.quick-card{display:flex;align-items:center;gap:14px;padding:13px 16px;background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r12);cursor:pointer;transition:border-color .2s,transform .2s,background .2s;position:relative;overflow:hidden;}
.quick-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--qc,var(--acc));border-radius:3px 0 0 3px;opacity:0;transition:opacity .2s;}
.quick-card:hover{border-color:var(--qc,var(--acc));transform:translateX(4px);background:var(--bg3);}
.quick-card:hover::before{opacity:1;}
.quick-card.quick-off{opacity:.45;pointer-events:none;}
.quick-card.quick-more{border-style:dashed;}
.quick-ico{width:36px;height:36px;border-radius:var(--r8);display:grid;place-items:center;font-size:15px;color:#fff;flex-shrink:0;background:linear-gradient(135deg,var(--qc,var(--acc)),color-mix(in srgb,var(--qc,var(--acc)) 70%,#fff));}
.quick-info{flex:1;min-width:0;}
.quick-name{font-size:13px;font-weight:700;margin-bottom:2px;}
.quick-sub{font-size:10px;color:var(--t3);}
.quick-arr{color:var(--t3);font-size:11px;transition:color .2s,transform .2s;flex-shrink:0;}
.quick-card:hover .quick-arr{color:var(--qc,var(--acc));transform:translateX(3px);}
/* fix audio in resp-content */
.resp-content audio{display:block;width:100%;margin-top:8px;border-radius:var(--r8);}

@media(max-width:1024px){.sidebar{transform:translateX(-100%);}.sidebar.open{transform:none;}.main,.footer{margin-left:0;}}
@media(max-width:768px){.content{padding:16px 14px 20px;}.hero-title{font-size:26px;}.meta-grid{grid-template-columns:repeat(2,1fr);}.cats-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr));}.creator-wrap{flex-wrap:wrap;}.creator-link{margin-left:0;}.footer{margin-left:0;}.admin-info-grid{grid-template-columns:1fr;}
/* FIX: título largo en música móvil */
.player-title{font-size:14px;word-break:break-word;}}
`;
  document.head.appendChild(s);
  const lk=document.createElement('link');lk.rel='stylesheet';
  lk.href='https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap';
  document.head.appendChild(lk);
  const fa=document.createElement('link');fa.rel='stylesheet';
  fa.href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
  document.head.appendChild(fa);
}

/* 
   SHELL
 */
function injectShell(){
  document.body.innerHTML=`
<div id="loader"><div class="loader-logo" id="loader-mark">⚡</div>
  <div class="loader-bar-wrap"><div class="loader-bar" id="loader-bar"></div></div>
  <div class="loader-txt" id="loader-txt">Conectando…</div></div>
<div class="glow-blob a"></div><div class="glow-blob b"></div><div class="glow-blob c"></div>
<header class="header">
  <a class="logo" href="#" onclick="goHome();return false;">
    <div class="logo-mark" id="logo-mark">N</div>
    <span class="logo-text" id="logo-name">Nexus</span>
  </a>
  <div class="hdr-right">
    <div class="pill pill-ok"><div class="pill-dot"></div><span id="status-text">Online</span></div>
    <button class="icon-btn" onclick="toggleTheme()" title="Tema"><i class="fas fa-circle-half-stroke"></i></button>
    <button class="icon-btn" onclick="goNotifs()" title="Notificaciones"><i class="fas fa-bell"></i><span class="notif-badge" id="notif-badge">0</span></button>
    <button class="icon-btn" onclick="goMusic()" title="Música"><i class="fas fa-music"></i></button>
    <button class="icon-btn admin-btn" id="admin-btn" onclick="openAdmin()" title="Admin"><i class="fas fa-lock"></i></button>
    <button class="icon-btn" onclick="toggleSidebar()" title="Menú"><i class="fas fa-bars"></i></button>
  </div>
</header>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div>
      <div class="sb-label">Navegación</div>
      <button class="sb-item" id="nav-home" onclick="goHome()"><i class="fas fa-house"></i> Home</button>
      <button class="sb-item" id="nav-notifs" onclick="goNotifs()"><i class="fas fa-bell"></i> Notificaciones</button>
      <button class="sb-item" id="nav-music" onclick="goMusic()"><i class="fas fa-music"></i> Música</button>
      <button class="sb-item" onclick="selectAll()"><i class="fas fa-layer-group"></i> All Endpoints<span class="sb-badge" id="sb-all-count">0</span></button>
      <a class="sb-item" href="/status" target="_blank"><i class="fas fa-circle-check"></i> Status</a>
      <a class="sb-item" href="/perfil" target="_blank"><i class="fas fa-user-circle"></i> Perfil</a>
      <div class="sb-divider"></div>
    </div>
    <div id="sb-cats"></div>
    <div id="sb-links"></div>
  </aside>
  <main class="main">
    <div class="content" id="content"></div>
    <footer class="footer" id="footer">
      © 2026 Nexus API · <a href="/status">Status</a> · <a href="/perfil">Perfil</a> · <a href="#">Docs</a>
    </footer>
  </main>
</div>
<div id="toast"><i class="fas fa-check"></i><span id="toast-msg">OK</span></div>
<div class="admin-overlay" id="admin-overlay">
  <div class="admin-panel">
    <div class="admin-header">
      <div class="admin-title"><i class="fas fa-shield-halved"></i> Panel Admin</div>
      <button class="admin-close" onclick="closeAdmin()"><i class="fas fa-xmark"></i></button>
    </div>
    <div class="admin-body" id="admin-body"></div>
  </div>
</div>`;
}

/* 
   LOADER
 */
function loaderProgress(pct,txt){
  const b=$('loader-bar');if(b)b.style.width=pct+'%';
  const t=$('loader-txt');if(t&&txt)t.textContent=txt;
}
function loaderDone(){
  const l=$('loader');if(!l)return;
  loaderProgress(100,'Listo ✓');
  setTimeout(()=>{l.classList.add('out');setTimeout(()=>l.remove(),500);},300);
}

/* 
   UTILS
 */
function calcStats(){
  if(!DATA)return{cats:0,eps:0,active:0};
  let eps=0,active=0;
  DATA.categories.forEach(c=>{eps+=c.items.length;active+=c.items.filter(e=>e.status!==false).length;});
  return{cats:DATA.categories.length,eps,active};
}
function startUptime(){
  if(uptimeTimer)clearInterval(uptimeTimer);
  uptimeTimer=setInterval(tickUptime,1000);tickUptime();
}
function tickUptime(){
  const el=$('uptime-val');if(!el)return;
  const s=Math.floor((Date.now()-(apiStartTime||Date.now()))/1000);
  const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60);
  el.textContent=`${d}d ${pad(h)}h ${pad(m)}m ${pad(s%60)}s`;
}
async function measureLatency(){
  const el=$('latency-val');if(!el)return;
  try{
    const t0=performance.now();
    const r=await fetch('/src/settings.json',{cache:'no-store'});
    const ms=Math.round(performance.now()-t0);
    if(!r.ok)throw 0;
    el.textContent=ms+' ms';
    el.style.color=ms<120?'var(--ok)':ms<350?'var(--warn)':'var(--acc3)';
  }catch{el.textContent='error';el.style.color='var(--acc3)';}
}
function updateNotifBadge(){
  const b=$('notif-badge');if(!b)return;
  const n=NOTIFS.filter(x=>x.enabled!==false).length;
  b.textContent=n;b.classList.toggle('show',n>0);
}
function hl(json){
  json=json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return json.replace(
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    m=>{
      if(/^"/.test(m))return`<span class="${/:$/.test(m)?'jk':'js'}">${m}</span>`;
      if(/true|false/.test(m))return`<span class="jb">${m}</span>`;
      if(/null/.test(m))return`<span class="jnull">${m}</span>`;
      return`<span class="jn">${m}</span>`;
    }
  );
}

/* 
   SPA
 */
function hideAll(){
  ['home-view','cats-view','all-view','notif-view','music-view'].forEach(id=>{
    const el=$(id);if(el)el.style.display='none';
  });
  document.querySelectorAll('.cat-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('#sidebar .sb-item').forEach(el=>el.classList.remove('active'));
}
window.goHome=function(){hideAll();const v=$('home-view');if(v)v.style.display='';$('nav-home')?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'});};
window.selectCategory=function(idx){
  hideAll();const cv=$('cats-view');if(cv)cv.style.display='';
  const sec=$('cat-'+idx);
  if(sec){sec.classList.add('active');setTimeout(()=>sec.scrollIntoView({behavior:'smooth',block:'start'}),80);}
  const sbItems=document.querySelectorAll('#sb-cats .sb-item');
  if(sbItems[idx])sbItems[idx].classList.add('active');
};
window.selectAll=function(){hideAll();const v=$('all-view');if(v)v.style.display='';window.scrollTo({top:0,behavior:'smooth'});};
window.goNotifs=function(){hideAll();const v=$('notif-view');if(v)v.style.display='';$('nav-notifs')?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'});};
window.goMusic=function(){hideAll();const v=$('music-view');if(v)v.style.display='';$('nav-music')?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'});};
window.toggleTheme=function(){
  const h=document.documentElement,n=h.getAttribute('data-theme')==='dark'?'light':'dark';
  h.setAttribute('data-theme',n);localStorage.setItem('theme',n);toast(n==='dark'?'🌙 Dark':'☀️ Light');
};
window.toggleSidebar=function(){$('sidebar')?.classList.toggle('open');};
window.toast=function(msg){
  const el=$('toast');if(!el)return;
  $('toast-msg').textContent=msg;el.classList.add('show');
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2800);
};

/* 
   ADMIN
 */
window.openAdmin=function(){$('admin-overlay')?.classList.add('open');ADMIN_OPEN?renderAdminContent():renderAdminLogin();};
window.closeAdmin=function(){$('admin-overlay')?.classList.remove('open');};
document.addEventListener('click',e=>{if(e.target===$('admin-overlay'))closeAdmin();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAdmin();});

function renderAdminLogin(){
  const b=$('admin-body');if(!b)return;
  b.innerHTML=`<div class="admin-login">
    <div class="admin-login-icon"><i class="fas fa-lock"></i></div>
    <h3>Acceso Admin</h3><p>Ingresa la contraseña para continuar</p>
    <input class="f-input" id="admin-pw" type="password" placeholder="Contraseña…" onkeydown="if(event.key==='Enter')tryAdminLogin()">
    <div class="admin-login-err" id="admin-login-err">Contraseña incorrecta</div>
    <button class="btn-admin-login" onclick="tryAdminLogin()"><i class="fas fa-unlock"></i> Ingresar</button>
  </div>`;
  setTimeout(()=>$('admin-pw')?.focus(),80);
}
window.tryAdminLogin=function(){
  const pw=$('admin-pw')?.value||'',real=SETTINGS?.apiSettings?.count||'admin';
  const errEl=$('admin-login-err');
  if(pw===real){
    ADMIN_OPEN=true;$('admin-btn')?.classList.add('unlocked');
    $('admin-btn').querySelector('i').className='fas fa-unlock';
    renderAdminContent();toast('✓ Admin desbloqueado');
  }else{
    errEl?.classList.add('show');setTimeout(()=>errEl?.classList.remove('show'),2500);
    const inp=$('admin-pw');if(inp){inp.style.borderColor='var(--acc3)';setTimeout(()=>inp.style.borderColor='',1500);}
  }
};

function renderAdminContent(){
  const b=$('admin-body');if(!b||!DATA||!SETTINGS)return;
  const {cats,eps,active}=calcStats();
  const errors=REQ_LOG.filter(r=>r.err).length;
  const avgMs=REQ_LOG.length?Math.round(REQ_LOG.reduce((a,r)=>a+r.ms,0)/REQ_LOG.length):0;
  const dbTotal=DB?.total_requests??'—';
  const dbUsers=DB?Object.keys(DB.users||{}).length:'—';

  b.innerHTML=`
<div class="admin-tabs">
  <button class="admin-tab active" onclick="adminTab('overview',this)"><i class="fas fa-chart-bar"></i> Overview</button>
  <button class="admin-tab" onclick="adminTab('endpoints',this)"><i class="fas fa-code"></i> Endpoints</button>
  <button class="admin-tab" onclick="adminTab('requests',this)"><i class="fas fa-list"></i> Requests</button>
  <button class="admin-tab" onclick="adminTab('database',this)"><i class="fas fa-database"></i> Database</button>
  <button class="admin-tab" onclick="adminTab('notifs',this)"><i class="fas fa-bell"></i> Notifs</button>
  <button class="admin-tab" onclick="adminTab('raw',this)"><i class="fas fa-gear"></i> Raw</button>
</div>

<div class="admin-section active" id="atab-overview">
  <div class="admin-sec-title">Estadísticas</div>
  <div class="admin-info-grid">
    <div class="admin-info-card"><div class="admin-info-key">Endpoints</div><div class="admin-info-val">${eps}</div></div>
    <div class="admin-info-card"><div class="admin-info-key">Activos</div><div class="admin-info-val ok">${active}</div></div>
    <div class="admin-info-card"><div class="admin-info-key">Categorías</div><div class="admin-info-val">${cats}</div></div>
    <div class="admin-info-card"><div class="admin-info-key">Requests sesión</div><div class="admin-info-val">${REQ_LOG.length}</div></div>
    <div class="admin-info-card"><div class="admin-info-key">Errores sesión</div><div class="admin-info-val ${errors?'warn':'ok'}">${errors}</div></div>
    <div class="admin-info-card"><div class="admin-info-key">Avg ms sesión</div><div class="admin-info-val">${avgMs} ms</div></div>
    <div class="admin-info-card"><div class="admin-info-key">DB total requests</div><div class="admin-info-val ok">${fmtN(dbTotal)}</div></div>
    <div class="admin-info-card"><div class="admin-info-key">DB usuarios únicos</div><div class="admin-info-val">${dbUsers}</div></div>
    <div class="admin-info-card"><div class="admin-info-key">Versión</div><div class="admin-info-val">${esc(String(SETTINGS.version||'—'))}</div></div>
    <div class="admin-info-card"><div class="admin-info-key">Rate limit</div><div class="admin-info-val warn">${esc(String(SETTINGS.apiSettings?.limit||'—'))}</div></div>
  </div>
</div>

<div class="admin-section" id="atab-endpoints">
  <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;flex-wrap:wrap;">
    <div class="admin-sec-title" style="margin:0">Gestión de Endpoints</div>
    <button class="btn-sm" onclick="adminExportJson()"><i class="fas fa-download"></i> Exportar JSON</button>
  </div>
  <div class="search-bar" style="margin-bottom:8px">
    <i class="fas fa-magnifying-glass"></i>
    <input type="text" id="ep-mgr-search" placeholder="Buscar…" oninput="filterEpMgr()">
  </div>
  <div id="ep-mgr-list">${buildEpMgrHTML()}</div>
</div>

<div class="admin-section" id="atab-requests">
  <div class="req-stats-row">
    <span class="req-stat-pill neutral"><i class="fas fa-list"></i> ${REQ_LOG.length} total</span>
    <span class="req-stat-pill ok"><i class="fas fa-check"></i> ${REQ_LOG.filter(r=>!r.err).length} ok</span>
    <span class="req-stat-pill err"><i class="fas fa-xmark"></i> ${errors} err</span>
    <span class="req-stat-pill neutral"><i class="fas fa-clock"></i> avg ${avgMs}ms</span>
  </div>
  <div class="req-filter-bar">
    <input type="text" id="req-search" placeholder="URL, IP, status…" oninput="filterReqs()">
    <select id="req-filter-status" onchange="filterReqs()">
      <option value="">Todos</option><option value="ok">OK</option><option value="err">Error</option>
    </select>
    <button class="btn-sm" onclick="clearReqLog()"><i class="fas fa-trash"></i> Limpiar</button>
  </div>
  <div class="req-table-wrap">
    <table class="admin-req-table">
      <thead><tr><th>IP</th><th>Status</th><th>Method</th><th>ms</th><th>URL</th><th>Hora</th></tr></thead>
      <tbody id="req-tbody">${buildReqRows(REQ_LOG)}</tbody>
    </table>
  </div>
  ${REQ_LOG.length===0?'<p style="font-size:11px;color:var(--t3);text-align:center;padding:14px">Sin requests todavía.</p>':''}
</div>

<div class="admin-section" id="atab-database">
  ${DB?buildAdminDbHTML():'<p style="font-size:11px;color:var(--t3)">No se cargó database.json — crea /src/database.json</p>'}
</div>

<div class="admin-section" id="atab-notifs">
  <div class="admin-sec-title">Gestión de Notificaciones</div>
  <div id="admin-notif-list">${buildAdminNotifRows()}</div>
</div>

<div class="admin-section" id="atab-raw">
  <div class="admin-sec-title">settings.json</div>
  <div style="background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r8);padding:12px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7dd3fc;max-height:280px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;line-height:1.65">${hl(JSON.stringify(SETTINGS,null,2))}</div>
</div>`;
}

function buildAdminDbHTML(){
  const eps=Object.entries(DB.endpoints||{}).sort((a,b)=>b[1].count-a[1].count);
  const users=Object.entries(DB.users||{}).sort((a,b)=>b[1].count-a[1].count).slice(0,8);
  const totalErr=Object.values(DB.endpoints||{}).reduce((a,e)=>a+(e.errors||0),0);
  return`
<div class="admin-sec-title">Top Endpoints</div>
<div class="req-table-wrap">
<table class="admin-req-table">
  <thead><tr><th>#</th><th>Path</th><th>Reqs</th><th>Errors</th><th>Avg ms</th><th>Status</th></tr></thead>
  <tbody>${eps.slice(0,20).map(([p,d],i)=>`<tr>
    <td style="color:var(--t3)">${i+1}</td>
    <td style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--t1);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.split('?')[0])}</td>
    <td class="ok">${fmtN(d.count)}</td>
    <td class="${d.errors>0?'err':'ok'}">${d.errors||0}</td>
    <td style="color:var(--warn)">${d.ms??'—'}</td>
    <td>${d.status??'—'}</td>
  </tr>`).join('')}</tbody>
</table>
</div>
<div class="admin-sec-title" style="margin-top:10px">Top Usuarios</div>
<div class="req-table-wrap">
<table class="admin-req-table">
  <thead><tr><th>IP</th><th>Fecha</th><th>Requests</th></tr></thead>
  <tbody>${users.map(([ip,d])=>`<tr>
    <td><span class="ip-tag">${esc(ip)}</span></td>
    <td>${esc(d.date||'—')}</td>
    <td class="ok">${fmtN(d.count)}</td>
  </tr>`).join('')}</tbody>
</table>
</div>`;
}

function buildEpMgrHTML(){
  let h='';
  DATA.categories.forEach((cat,ci)=>{
    const on=cat.status!==false;
    h+=`<div class="cat-mgr-row" id="cmr-${ci}">
      <div class="cmr-name"><i class="fas ${catIcon(cat.name)}" style="color:${catColor(cat.name)};margin-right:5px"></i>${esc(cat.name)}</div>
      <div class="cmr-count">${cat.items.length} eps</div>
      <label class="toggle-sw"><input type="checkbox" ${on?'checked':''} onchange="adminToggleCat(${ci},this.checked)"><span class="toggle-slider"></span></label>
      <button class="cat-collapse-btn" onclick="toggleCatSub(${ci})"><i class="fas fa-chevron-down"></i></button>
    </div>
    <div class="cat-eps-sub" id="cat-sub-${ci}">
      ${cat.items.map((ep,ei)=>{const eon=ep.status!==false;return`<div class="ep-mgr-row">
        <span class="method-tag">${esc((ep.method||'GET').toUpperCase())}</span>
        <span class="ep-mgr-path">${esc(ep.path)}</span>
        <span class="ep-mgr-name">${esc(ep.name||'')}</span>
        <label class="toggle-sw"><input type="checkbox" ${eon?'checked':''} onchange="adminToggleEp(${ci},${ei},this.checked)"><span class="toggle-slider"></span></label>
      </div>`}).join('')}
    </div>`;
  });
  return h;
}
window.toggleCatSub=function(ci){$('cat-sub-'+ci)?.classList.toggle('open');};
window.adminToggleCat=function(ci,val){
  DATA.categories[ci].status=val?undefined:false;
  toast((val?'✓ Activada':'✗ Desactivada')+': '+DATA.categories[ci].name);
  renderAll();renderAdminContent();adminTab('endpoints',document.querySelector('.admin-tab:nth-child(2)'));
};
window.adminToggleEp=function(ci,ei,val){
  DATA.categories[ci].items[ei].status=val?undefined:false;
  toast((val?'✓ Activo':'✗ Offline')+': '+DATA.categories[ci].items[ei].path);
  renderAll();renderAdminContent();adminTab('endpoints',document.querySelector('.admin-tab:nth-child(2)'));
};
window.filterEpMgr=function(){
  const q=$('ep-mgr-search')?.value.toLowerCase()||'';
  document.querySelectorAll('.ep-mgr-row').forEach(r=>{r.style.display=(!q||r.textContent.toLowerCase().includes(q))?'':'none';});
  document.querySelectorAll('.cat-mgr-row').forEach((r,i)=>{
    const sub=$('cat-sub-'+i);if(!q){r.style.display='';return;}
    const m=r.textContent.toLowerCase().includes(q)||(sub&&[...sub.querySelectorAll('.ep-mgr-row')].some(x=>x.style.display!=='none'));
    r.style.display=m?'':'none';if(m&&sub)sub.classList.add('open');
  });
};
window.adminExportJson=function(){
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([JSON.stringify(DATA,null,2)],{type:'application/json'})),download:'endpoint.json'});
  a.click();toast('📥 endpoint.json exportado');
};
function buildReqRows(rows){
  if(!rows.length)return'';
  return rows.slice().reverse().map(r=>`<tr>
    <td><span class="ip-tag">${esc(r.ip||'—')}</span></td>
    <td class="${r.err?'err':'ok'}">${r.status}</td>
    <td style="color:var(--acc2)">${esc(r.method||'GET')}</td>
    <td>${r.ms}</td>
    <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t2)">${esc(r.url)}</td>
    <td>${r.ts}</td>
  </tr>`).join('');
}
window.filterReqs=function(){
  const q=$('req-search')?.value.toLowerCase()||'',st=$('req-filter-status')?.value||'';
  ($('req-tbody')?.querySelectorAll('tr')||[]).forEach(row=>{
    const txt=row.textContent.toLowerCase(),isErr=row.querySelector('td.err')!==null;
    let show=!q||txt.includes(q);
    if(st==='ok')show=show&&!isErr;if(st==='err')show=show&&isErr;
    row.style.display=show?'':'none';
  });
};
window.clearReqLog=function(){REQ_LOG.length=0;renderAdminContent();adminTab('requests',document.querySelector('.admin-tab:nth-child(3)'));toast('🗑 Historial limpiado');};
function buildAdminNotifRows(){
  if(!NOTIFS.length)return'<p style="font-size:11px;color:var(--t3)">Sin notificaciones.</p>';
  return NOTIFS.map((n,i)=>`
<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg2);border:1px solid var(--bdr);border-radius:var(--r8);margin-bottom:5px;">
  <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700">${esc(n.title)}</div>
  <div style="font-size:9px;color:var(--t3)">${esc(n.id)} · ${esc(n.date)}</div></div>
  <label class="toggle-sw"><input type="checkbox" ${n.enabled!==false?'checked':''} onchange="adminToggleNotif(${i},this.checked)"><span class="toggle-slider"></span></label>
</div>`).join('');
}
window.adminToggleNotif=function(i,val){
  NOTIFS[i].enabled=val;toast(val?'🔔 Notif activada':'🔕 Notif desactivada');
  updateNotifBadge();renderNotifsView();
  const el=$('admin-notif-list');if(el)el.innerHTML=buildAdminNotifRows();
};
window.adminTab=function(name,btn){
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
  $('atab-'+name)?.classList.add('active');if(btn)btn.classList.add('active');
};

/* 
   NOTIF VIEW
 */
function renderNotifsView(){
  const el=$('notif-view');if(!el)return;
  const active=NOTIFS.filter(n=>n.enabled!==false);
  el.innerHTML=`
<div class="sec-head">
  <div class="sec-icon" style="background:linear-gradient(135deg,var(--warn),#fb923c)"><i class="fas fa-bell"></i></div>
  <div><div class="sec-name">Notificaciones</div><div class="sec-sub">${active.length} activa${active.length!==1?'s':''} · ${NOTIFS.length} total</div></div>
</div>
${NOTIFS.length===0?`<div class="notif-empty"><i class="fas fa-bell-slash"></i>No hay notificaciones</div>`:`
<div class="notif-list">
${NOTIFS.map((n,i)=>{const on=n.enabled!==false;return`
<div class="notif-card ${on?'':'disabled'}">
  <div class="notif-card-head" onclick="toggleNotifCard(${i})">
    <div class="notif-card-icon" style="${on?'':'background:var(--bg3);color:var(--t3)'}"><i class="fas ${on?'fa-bell':'fa-bell-slash'}"></i></div>
    <div class="notif-card-info">
      <div class="notif-card-title">${esc(n.title)}</div>
      <div class="notif-card-meta">
        <span>${esc(n.id)}</span><span>·</span><span>${esc(n.date)}</span>
        ${on?'<span style="color:var(--ok);font-weight:700">● Activa</span>':'<span style="color:var(--acc3);font-weight:700">○ Off</span>'}
      </div>
    </div>
    <i class="fas fa-chevron-down" style="color:var(--t3);font-size:11px;transition:transform .2s" id="nchev-${i}"></i>
  </div>
  <div class="notif-card-body" id="nbody-${i}">
    <p>${esc(n.message||'')}</p>
    <div style="margin-top:10px">
      <button class="btn-sm" onclick="adminToggleNotif(${i},${!on})"><i class="fas ${on?'fa-bell-slash':'fa-bell'}"></i> ${on?'Desactivar':'Activar'}</button>
    </div>
  </div>
</div>`}).join('')}
</div>`}`;
}
window.toggleNotifCard=function(i){
  const b=$('nbody-'+i);b?.classList.toggle('open');
  const c=$('nchev-'+i);if(c)c.style.transform=b?.classList.contains('open')?'rotate(180deg)':'';
};

/* 
   MUSIC PLAYER — auto-next, vol, seek, prev con restart
 */
function initPlayer(){
  if(!MUSIC.length)return;
  if(!PLAYER.audio){
    PLAYER.audio=new Audio();
    PLAYER.audio.volume=PLAYER.volume;
    PLAYER.audio.addEventListener('ended',()=>playerNext(true));
    PLAYER.audio.addEventListener('timeupdate',updateProgress);
    PLAYER.audio.addEventListener('loadedmetadata',updateProgress);
    loadTrack(0,false);
  } else {
    refreshPlayerUI();
    refreshMusicList();
  }
}
function loadTrack(idx,autoplay){
  if(!MUSIC[idx])return;
  PLAYER.idx=idx;
  PLAYER.audio.src=MUSIC[idx].url;
  PLAYER.audio.volume=PLAYER.muted?0:PLAYER.volume;
  if(autoplay){PLAYER.audio.play().catch(()=>{});PLAYER.playing=true;}
  else PLAYER.playing=false;
  refreshPlayerUI();refreshMusicList();
}
function refreshPlayerUI(){
  const t=MUSIC[PLAYER.idx];if(!t)return;
  const art=$('p-art'),bg=$('p-bg'),title=$('p-title'),pid=$('p-id'),icon=$('p-play-icon');
  if(art){art.src=t.img||'';art.classList.toggle('spin',PLAYER.playing);}
  if(bg)bg.style.backgroundImage=`url(${t.img||''})`;
  if(title)title.textContent=t.title||'Sin título';
  if(pid)pid.textContent=t.id||'';
  if(icon)icon.className='fas '+(PLAYER.playing?'fa-pause':'fa-play');
  updateProgress();updateVolBar();
}
function updateProgress(){
  const fill=$('p-prog-fill'),cur=$('p-time-cur'),dur=$('p-time-dur'),audio=PLAYER.audio;
  if(!audio)return;
  const pct=audio.duration?(audio.currentTime/audio.duration)*100:0;
  if(fill)fill.style.width=pct+'%';
  if(cur)cur.textContent=fmtTime(audio.currentTime);
  if(dur)dur.textContent=fmtTime(audio.duration||0);
}
function updateVolBar(){
  const fill=$('vol-fill');if(fill)fill.style.width=(PLAYER.muted?0:PLAYER.volume*100)+'%';
  const icon=$('vol-icon');
  if(icon)icon.className='fas '+(PLAYER.muted||PLAYER.volume===0?'fa-volume-xmark':PLAYER.volume<0.5?'fa-volume-low':'fa-volume-high');
}
function fmtTime(s){if(!s||isNaN(s))return'0:00';return Math.floor(s/60)+':'+pad(Math.floor(s%60));}
function refreshMusicList(){
  document.querySelectorAll('.music-list-item').forEach((el,i)=>{
    el.classList.toggle('active',i===PLAYER.idx);
    const ind=el.querySelector('.mli-indicator');
    if(ind)ind.innerHTML=i===PLAYER.idx
      ?`<i class="fas ${PLAYER.playing?'fa-pause':'fa-play'}" style="color:var(--acc)"></i>`
      :`<span style="color:var(--t3);font-family:'JetBrains Mono',monospace;font-size:9px">${String(i+1).padStart(2,'0')}</span>`;
  });
}
window.playerToggle=function(){
  if(!PLAYER.audio)return;
  if(PLAYER.playing){PLAYER.audio.pause();PLAYER.playing=false;}
  else{PLAYER.audio.play().catch(()=>{});PLAYER.playing=true;}
  refreshPlayerUI();refreshMusicList();
};
window.playerPrev=function(){
  if(PLAYER.audio&&PLAYER.audio.currentTime>3){PLAYER.audio.currentTime=0;updateProgress();}
  else loadTrack((PLAYER.idx-1+MUSIC.length)%MUSIC.length,PLAYER.playing);
};
window.playerNext=function(auto){
  const nextIdx=(PLAYER.idx+1)%MUSIC.length;
  loadTrack(nextIdx,auto||PLAYER.playing);
};
window.playerSeek=function(e){
  if(!PLAYER.audio||!PLAYER.audio.duration)return;
  const rect=e.currentTarget.getBoundingClientRect();
  PLAYER.audio.currentTime=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*PLAYER.audio.duration;
};
window.playerSetVol=function(e){
  const rect=e.currentTarget.getBoundingClientRect();
  PLAYER.volume=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
  PLAYER.muted=false;
  if(PLAYER.audio)PLAYER.audio.volume=PLAYER.volume;
  updateVolBar();
};
window.playerToggleMute=function(){
  PLAYER.muted=!PLAYER.muted;
  if(PLAYER.audio)PLAYER.audio.muted=PLAYER.muted;
  updateVolBar();
};
window.playerSelectTrack=function(idx){if(idx===PLAYER.idx){playerToggle();return;}loadTrack(idx,true);};

function renderMusicView(){
  const el=$('music-view');if(!el)return;
  const t=MUSIC[PLAYER.idx]||{};
  el.innerHTML=`
<div class="sec-head">
  <div class="sec-icon" style="background:linear-gradient(135deg,#7c3aed,#ec4899)"><i class="fas fa-music"></i></div>
  <div><div class="sec-name">Música</div><div class="sec-sub">${MUSIC.length} pista${MUSIC.length!==1?'s':''}</div></div>
</div>
${MUSIC.length===0?`<div style="text-align:center;padding:60px 20px;color:var(--t3)"><i class="fas fa-music" style="font-size:36px;opacity:.3;display:block;margin-bottom:12px"></i>No hay música cargada</div>`:`
<div class="player-card">
  <div class="player-bg" id="p-bg" style="background-image:url(${esc(t.img||'')})"></div>
  <div class="player-inner">
    <div class="player-art-wrap"><img class="player-art ${PLAYER.playing?'spin':''}" id="p-art" src="${esc(t.img||'')}" alt=""></div>
    <div class="player-info">
      <div class="player-title" id="p-title">${esc(t.title||'—')}</div>
      <div class="player-id" id="p-id">${esc(t.id||'')}</div>
    </div>
    <div class="player-progress-wrap">
      <div class="player-progress-track" onclick="playerSeek(event)">
        <div class="player-progress-fill" id="p-prog-fill"></div>
      </div>
      <div class="player-times"><span id="p-time-cur">0:00</span><span id="p-time-dur">0:00</span></div>
    </div>
    <div class="player-controls">
      <button class="p-btn" onclick="playerPrev()" title="Anterior / Reiniciar"><i class="fas fa-backward-step"></i></button>
      <button class="p-btn play-pause" onclick="playerToggle()"><i class="fas ${PLAYER.playing?'fa-pause':'fa-play'}" id="p-play-icon"></i></button>
      <button class="p-btn" onclick="playerNext(false)" title="Siguiente"><i class="fas fa-forward-step"></i></button>
    </div>
  </div>
  <div class="player-vol-row">
    <i class="fas fa-volume-high" id="vol-icon" onclick="playerToggleMute()" title="Mute"></i>
    <div class="vol-track" onclick="playerSetVol(event)"><div class="vol-fill" id="vol-fill" style="width:${PLAYER.volume*100}%"></div></div>
  </div>
</div>
<div class="sec-title">Lista de reproducción</div>
<div class="music-list">
${MUSIC.map((tr,i)=>`
<div class="music-list-item ${i===PLAYER.idx?'active':''}" onclick="playerSelectTrack(${i})">
  <img class="mli-art" src="${esc(tr.img||'')}" alt="">
  <div class="mli-info"><div class="mli-title">${esc(tr.title||'Sin título')}</div><div class="mli-id">${esc(tr.id||'')}</div></div>
  <div class="mli-indicator">${i===PLAYER.idx?`<i class="fas ${PLAYER.playing?'fa-pause':'fa-play'}" style="color:var(--acc)"></i>`:`<span style="color:var(--t3);font-family:'JetBrains Mono',monospace;font-size:9px">${String(i+1).padStart(2,'0')}</span>`}</div>
</div>`).join('')}
</div>`}`;
  updateProgress();updateVolBar();
}

/* 
   RENDER ALL
 */
function renderAll(){
  if(!DATA||!SETTINGS)return;
  const {cats,eps,active}=calcStats();
  const content=$('content');
  const sbAll=$('sb-all-count');if(sbAll)sbAll.textContent=eps;

  const dbEps=DB?.endpoints||{};
  const topEps=Object.entries(dbEps).sort((a,b)=>b[1].count-a[1].count).slice(0,5);
  const dbTotalReq=DB?.total_requests??null;
  const dbUsers=DB?Object.keys(DB.users||{}).length:null;
  const dbTotalErr=Object.values(dbEps).reduce((a,e)=>a+(e.errors||0),0);

  let html=`<div class="intro-rule">
  <span class="intro-line"></span>
  <span class="intro-label"><i class="fas fa-bolt"></i>&nbsp;${esc(SETTINGS.name||'Nexus API')}</span>
  <span class="intro-line"></span>
</div>`;

  // HOME VIEW
  html+='<div id="home-view">';
  html+=`
<section class="hero">
  <img class="hero-img" src="${esc(SETTINGS.header?.imageSrc||'')}" alt="${esc(SETTINGS.name||'')}">
  <div class="hero-eyebrow">${esc(SETTINGS.header?.status||'Online')}</div>
  <h1 class="hero-title">${esc(SETTINGS.name||'Nexus API')}</h1>
  <p class="hero-sub">${esc(SETTINGS.description||'')}</p>
</section>

<div class="stats-row">
  <div class="stat-card"><div class="stat-icon g"><i class="fas fa-circle-check"></i></div><div><div class="stat-val">${esc(SETTINGS.header?.status||'Online')}</div><div class="stat-lbl">Estado</div></div></div>
  <div class="stat-card"><div class="stat-icon b"><i class="fas fa-folder"></i></div><div><div class="stat-val">${cats}</div><div class="stat-lbl">Categorías</div></div></div>
  <div class="stat-card"><div class="stat-icon p"><i class="fas fa-code"></i></div><div><div class="stat-val">${eps}</div><div class="stat-lbl">Endpoints</div></div></div>
  ${dbTotalReq!==null?`<div class="stat-card"><div class="stat-icon r"><i class="fas fa-chart-bar"></i></div><div><div class="stat-val">${fmtN(dbTotalReq)}</div><div class="stat-lbl">Requests DB</div></div></div>`:''}
  ${dbUsers!==null?`<div class="stat-card"><div class="stat-icon y"><i class="fas fa-users"></i></div><div><div class="stat-val">${dbUsers}</div><div class="stat-lbl">Usuarios DB</div></div></div>`:''}
</div>

<div class="meta-grid">
  <div class="meta-card"><i class="fas fa-rocket" style="color:var(--acc)"></i><div class="meta-title">Versión</div><div class="meta-val big">${esc(String(SETTINGS.version||'1.0.0'))}</div></div>
  <div class="meta-card"><i class="fas fa-key" style="color:var(--ok)"></i><div class="meta-title">API Key</div><div class="meta-val">${esc(String(SETTINGS.apiSettings?.key||'N/A'))}</div></div>
  <div class="meta-card"><i class="fas fa-gauge-high" style="color:var(--warn)"></i><div class="meta-title">Rate Limit</div><div class="meta-val big">${esc(String(SETTINGS.apiSettings?.limit||'—'))}</div></div>
  <div class="meta-card"><i class="fas fa-clock" style="color:var(--acc2)"></i><div class="meta-title">Uptime</div><div class="meta-val" id="uptime-val">cargando…</div></div>
  <div class="meta-card"><i class="fas fa-bolt" style="color:var(--acc3)"></i><div class="meta-title">Latencia</div><div class="meta-val big" id="latency-val">—</div></div>
</div>`;

  // DB card home
  if(DB&&topEps.length){
    html+=`<div class="db-card">
  <div class="db-card-title"><i class="fas fa-database"></i> Stats de la API</div>
  <div class="db-summary">
    <div class="db-stat"><div class="db-stat-key">Total requests</div><div class="db-stat-val ok">${fmtN(dbTotalReq)}</div></div>
    <div class="db-stat"><div class="db-stat-key">Usuarios únicos</div><div class="db-stat-val">${dbUsers}</div></div>
    <div class="db-stat"><div class="db-stat-key">Endpoints track.</div><div class="db-stat-val">${Object.keys(dbEps).length}</div></div>
    <div class="db-stat"><div class="db-stat-key">Total errores</div><div class="db-stat-val ${dbTotalErr>0?'err':'ok'}">${dbTotalErr}</div></div>
  </div>
  <div class="db-top-label"><i class="fas fa-trophy" style="color:var(--warn)"></i> Top endpoints</div>
  <div class="db-top-list">
    ${topEps.map(([p,d],i)=>`<div class="db-top-row">
      <div class="db-top-rank">${i+1}</div>
      <div class="db-top-path">${esc(p.split('?')[0])}</div>
      <span class="db-pill req">${fmtN(d.count)} req</span>
      ${d.errors>0?`<span class="db-pill err">${d.errors} err</span>`:''}
      <span class="db-pill ms">${d.ms??'—'}ms</span>
    </div>`).join('')}
  </div>
</div>`;
  }

  // API info
  const sets=SETTINGS.apiSettings||{},hdr=SETTINGS.header||{};
  const infoItems=[
    ['Base URL',BASE,''],['Activos',active+' / '+eps,'ok'],['Categorías',cats,''],
    sets.prefix&&['Prefijo',sets.prefix,''],sets.method&&['Método',sets.method,''],
    sets.timeout&&['Timeout',sets.timeout+'ms',''],sets.cooldown&&['Cooldown',sets.cooldown+'ms','warn'],
    SETTINGS.author&&['Autor',SETTINGS.author,''],SETTINGS.license&&['Licencia',SETTINGS.license,''],
    hdr.server&&['Servidor',hdr.server,''],(SETTINGS.contact||SETTINGS.email)&&['Contacto',SETTINGS.contact||SETTINGS.email,''],
  ].filter(Boolean);
  html+=`<div class="api-info-card">
  <div class="api-info-title"><i class="fas fa-server"></i> Información de la API</div>
  <div class="api-info-grid">${infoItems.map(([k,v,c])=>`<div class="api-info-item"><div class="api-info-key">${esc(k)}</div><div class="api-info-val ${c}">${esc(String(v))}</div></div>`).join('')}</div>
</div>`;

  // Creator
  const owner=(SETTINGS.colaborador||[]).find(c=>c.type?.includes('Owner'));
  if(owner)html+=`<div class="sec-title">Creator</div>
<div class="creator-wrap">
  <img class="creator-img" src="${esc(owner.icon)}" alt="${esc(owner.name)}">
  <div><div class="creator-name">${esc(owner.name)}</div><div class="creator-role">${esc(owner.type)}</div></div>
  <a class="creator-link" href="${esc(owner.redes)}" target="_blank" rel="noopener"><i class="fab fa-github"></i> GitHub</a>
</div>`;

  // Collabs
  const collabs=(SETTINGS.colaborador||[]).filter(c=>!c.type?.includes('Owner'));
  if(collabs.length){
    html+='<div class="sec-title">Colaboradores</div><div class="collabs-grid">';
    collabs.forEach(c=>{html+=`<div class="collab-card"><img class="collab-img" src="${esc(c.icon)}" alt="${esc(c.name)}">
      <div class="collab-name">${esc(c.name)}</div><div class="collab-role">${esc(c.type)}</div>
      <a class="collab-link" href="${esc(c.redes)}" target="_blank" rel="noopener"><i class="fab fa-github"></i> Perfil</a></div>`;});
    html+='</div>';
  }

  // Quick access
  html+=`<div class="sec-title">Acceso rápido</div>
<div class="quick-grid">
  <div class="quick-card" onclick="selectAll()" style="--qc:var(--acc)">
    <div class="quick-ico"><i class="fas fa-layer-group"></i></div>
    <div class="quick-info">
      <div class="quick-name">All Endpoints</div>
      <div class="quick-sub">${eps} endpoints disponibles</div>
    </div>
    <i class="fas fa-arrow-right quick-arr"></i>
  </div>
  ${DATA.categories.slice(0,5).map((cat,idx)=>{
    const on=cat.status!==false;
    const color=catColor(cat.name);
    return`<div class="quick-card ${on?'':'quick-off'}" style="--qc:${color}" ${on?'onclick="selectCategory('+idx+')"':''}>
      <div class="quick-ico"><i class="fas ${catIcon(cat.name)}"></i></div>
      <div class="quick-info">
        <div class="quick-name">${esc(cat.name)}</div>
        <div class="quick-sub">${cat.items.length} endpoints · ${on?'<span style="color:var(--ok)">Active</span>':'<span style="color:var(--acc3)">Offline</span>'}</div>
      </div>
      <i class="fas fa-arrow-right quick-arr"></i>
    </div>`;
  }).join('')}
  ${DATA.categories.length>5?`<div class="quick-card quick-more" onclick="selectAll()" style="--qc:var(--t3)">
    <div class="quick-ico"><i class="fas fa-ellipsis"></i></div>
    <div class="quick-info">
      <div class="quick-name">Ver todo</div>
      <div class="quick-sub">+${DATA.categories.length-5} categorías más</div>
    </div>
    <i class="fas fa-arrow-right quick-arr"></i>
  </div>`:''}
</div>`;
  html+='</div>'; // home-view

  // CATS VIEW
  html+='<div id="cats-view" style="display:none">';
  DATA.categories.forEach((cat,ci)=>{html+=buildCatSection(cat,ci);});
  html+='</div>';

  // ALL VIEW
  html+=`<div id="all-view" style="display:none">
<div class="sec-head">
  <div class="sec-icon"><i class="fas fa-layer-group"></i></div>
  <div><div class="sec-name">All Endpoints</div><div class="sec-sub">${eps} endpoints · ${cats} categorías</div></div>
  <button class="back-btn" onclick="goHome()"><i class="fas fa-arrow-left"></i> Home</button>
</div>
<div class="search-bar">
  <i class="fas fa-magnifying-glass"></i>
  <input type="text" id="all-search" placeholder="Buscar path, nombre o categoría…" oninput="filterAll()">
</div>
<div class="eps-list" id="all-eps-list">`;
  DATA.categories.forEach((cat,ci)=>{cat.items.forEach((ep,ei)=>{html+=buildEpBase(ep,ci,ei,true,cat.name);});});
  html+=`</div></div>`;

  // NOTIF + MUSIC placeholders
  html+='<div id="notif-view" style="display:none"></div>';
  html+='<div id="music-view" style="display:none"></div>';

  content.innerHTML=html;
  renderSidebar();renderNotifsView();renderMusicView();

  // Attach submit handlers
  DATA.categories.forEach((cat,ci)=>{
    cat.items.forEach((ep,ei)=>{
      const f=$('form-'+ci+'-'+ei);if(f)f.addEventListener('submit',e=>execute(e,ci,ei,false));
      const f2=$('form-all-'+ci+'-'+ei);if(f2)f2.addEventListener('submit',e=>execute(e,ci,ei,true));
    });
  });

  startUptime();measureLatency();
  $('nav-home')?.classList.add('active');
  ['notif-view','music-view'].forEach(id=>{const v=$(id);if(v)v.style.display='none';});
}

/* ── Sidebar ──────────── */
function renderSidebar(){
  if(!DATA||!SETTINGS)return;
  let h='<div class="sb-label" style="margin-top:0">Categorías</div>';
  DATA.categories.forEach((cat,idx)=>{
    const off=cat.status===false;
    h+=`<button class="sb-item${off?' sb-off':''}" ${off?'disabled':'onclick="selectCategory('+idx+')"'}>
      <i class="fas ${catIcon(cat.name)}"></i>${esc(cat.name)}<span class="sb-badge">${cat.items.length}</span>
    </button>`;
  });
  $('sb-cats').innerHTML=h;
  let lh='<div class="sb-label">Support</div>';
  (SETTINGS.links||[]).forEach(l=>{lh+=`<a class="sb-item" href="${esc(l.url)}" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i>${esc(l.name)}</a>`;});
  $('sb-links').innerHTML=lh;
}

/* ── Category section ─── */
function buildCatSection(cat,ci){
  let h=`<div class="cat-section" id="cat-${ci}">
<div class="sec-head">
  <div class="sec-icon"><i class="fas ${catIcon(cat.name)}"></i></div>
  <div><div class="sec-name">${esc(cat.name)}</div><div class="sec-sub">${cat.items.length} endpoints</div></div>
  <button class="back-btn" onclick="goHome()"><i class="fas fa-arrow-left"></i> Home</button>
</div>
<div class="search-bar">
  <i class="fas fa-magnifying-glass"></i>
  <input class="ep-search" data-cat="${ci}" type="text" placeholder="Buscar endpoint…" oninput="filterEps(${ci})">
</div>
<div class="eps-list" id="eps-${ci}">`;
  cat.items.forEach((ep,ei)=>{h+=buildEpBase(ep,ci,ei,false,'');});
  h+='</div></div>';
  return h;
}

/* ── Endpoint builder ─── */
function buildEpBase(ep,ci,ei,isAll,catName){
  const method=(ep.method||'GET').toLowerCase();
  const on=ep.status!==false;
  const prefix=isAll?'a':'';
  const key=prefix+ci+'-'+ei;
  const formId='form-'+(isAll?'all-':'')+ci+'-'+ei;

  const dbEps=DB?.endpoints||{};
  const dbKey=Object.keys(dbEps).find(k=>k===ep.path||k.startsWith(ep.path+'?'));
  const dbData=dbKey?dbEps[dbKey]:null;

  let body='';
  if(on){
    body=`<div class="ep-body" id="body-${key}">
  ${catName?`<div style="font-size:9px;color:var(--acc);font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px"><i class="fas ${catIcon(catName)}"></i> ${esc(catName)}</div>`:''}
  <div class="ep-desc">${esc(ep.desc||'Sin descripción.')}</div>
  ${dbData?`<div class="ep-db-stats">
    <span class="ep-db-pill req"><i class="fas fa-chart-bar"></i> ${fmtN(dbData.count)} req</span>
    <span class="ep-db-pill err"><i class="fas fa-xmark"></i> ${dbData.errors||0} err</span>
    <span class="ep-db-pill ms"><i class="fas fa-clock"></i> ${dbData.ms??'—'}ms</span>
    <span class="ep-db-pill st"><i class="fas fa-circle-check"></i> ${dbData.status??'—'}</span>
  </div>`:''}
  <div class="url-row" id="url-${key}">
    <span class="url-text">${esc(BASE+ep.path)}</span>
    <button type="button" class="url-copy" onclick="copyUrlByKey('${ci}-${ei}','${isAll}')"><i class="fas fa-copy"></i></button>
  </div>
  <form class="ep-form" id="${formId}">
    ${buildFields(ep.params)}
    <button type="submit" class="btn-run"><i class="fas fa-play"></i> Execute</button>
  </form>
  <div class="resp-panel" id="resp-${key}">
    <div class="resp-head">
      <div class="resp-status"><div class="resp-dot" id="rdot-${key}"></div><span id="rtxt-${key}">—</span></div>
      <div class="resp-actions">
        <button type="button" class="btn-sm" onclick="copyResp('${key}')"><i class="fas fa-copy"></i></button>
        <button type="button" class="btn-sm" onclick="dlResp('${key}')"><i class="fas fa-download"></i></button>
        <button type="button" class="btn-sm" onclick="clearResp('${key}')"><i class="fas fa-xmark"></i></button>
      </div>
    </div>
    <div class="resp-content" id="rc-${key}"></div>
  </div>
</div>`;
  }

  return `<div class="ep${on?'':' disabled'}" id="ep-${key}">
  <div class="ep-head" ${on?'onclick="toggleEp(\''+key+'\')"':''}>
    <div class="ep-method ${method}">${method.toUpperCase()}</div>
    <div class="ep-info"><div class="ep-path">${esc(ep.path)}</div><div class="ep-name">${esc(ep.name||'')}</div></div>
    ${dbData?`<span class="ep-hits" title="${fmtN(dbData.count)} requests">${fmtN(dbData.count)}</span>`:''}
    <div class="ep-badge ${on?'on':'off'}">${on?'active':'offline'}</div>
    ${on?`<button class="ep-chev" id="chev-${key}" onclick="event.stopPropagation();toggleEp('${key}')"><i class="fas fa-chevron-down"></i></button>`:''}
  </div>
  ${body}
</div>`;
}

/* ── Form fields ──────── */
function buildFields(params){
  if(!params)return'<p class="no-params">Sin parámetros requeridos.</p>';
  let h='';
  if(Array.isArray(params)){
    params.forEach(s=>{if(!s.name||!s.options)return;
      h+=`<div class="f-group"><label class="f-label">${esc(s.label||s.name)}</label>
        <select class="f-select ep-param" data-param="${esc(s.name)}">
          <option value="">— ${esc(s.label||s.name)} —</option>
          ${s.options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}
        </select></div>`;
    });
  }else{
    Object.entries(params).forEach(([k,v])=>{
      if(v&&typeof v==='object'&&v.options){
        h+=`<div class="f-group"><label class="f-label">${esc(v.label||k)}</label>
          <select class="f-select ep-param" data-param="${esc(v.name||k)}">
            <option value="">— ${esc(v.label||k)} —</option>
            ${v.options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}
          </select></div>`;
      }else{
        h+=`<div class="f-group"><label class="f-label">${esc(k)}</label>
          <input class="f-input ep-param" type="text" data-param="${esc(k)}" placeholder="${esc(String(v||''))}">
        </div>`;
      }
    });
  }
  return h||'<p class="no-params">Sin parámetros.</p>';
}

/* ── Toggle / Filter ──── */
window.toggleEp=function(key){$('body-'+key)?.classList.toggle('open');$('chev-'+key)?.classList.toggle('open');};
window.filterEps=function(ci){
  const q=document.querySelector('.ep-search[data-cat="'+ci+'"]')?.value.toLowerCase()||'';
  document.querySelectorAll('#eps-'+ci+' .ep').forEach(el=>{
    const p=el.querySelector('.ep-path')?.textContent.toLowerCase()||'';
    const n=el.querySelector('.ep-name')?.textContent.toLowerCase()||'';
    el.classList.toggle('hidden',q!==''&&!p.includes(q)&&!n.includes(q));
  });
};
window.filterAll=function(){
  const q=$('all-search')?.value.toLowerCase()||'';
  document.querySelectorAll('#all-eps-list .ep').forEach(el=>{
    const p=el.querySelector('.ep-path')?.textContent.toLowerCase()||'';
    const n=el.querySelector('.ep-name')?.textContent.toLowerCase()||'';
    const c=el.querySelector('[style*="color:var(--acc)"]')?.textContent.toLowerCase()||'';
    el.classList.toggle('hidden',q!==''&&!p.includes(q)&&!n.includes(q)&&!c.includes(q));
  });
};

/* ── Build URL ────────── */
function buildUrl(ci,ei,isAll){
  const ep=DATA.categories[ci].items[ei];
  const base=BASE+ep.path.split('?')[0];
  const prefix=isAll?'all-':'';
  const params=new URLSearchParams();
  document.querySelectorAll('#form-'+prefix+ci+'-'+ei+' .ep-param').forEach(inp=>{
    const v=inp.value.trim();if(v)params.append(inp.getAttribute('data-param'),v);
  });
  return params.toString()?base+'?'+params:base;
}
window.copyUrlByKey=function(rawKey,isAll){
  const[c,e]=rawKey.split('-').map(Number);
  navigator.clipboard.writeText(buildUrl(c,e,isAll==='true'));toast('URL copiada ✓');
};

/* ── Execute ──────────── */
async function execute(ev,ci,ei,isAll){
  ev.preventDefault();
  const prefix=isAll?'a':'';
  const key=prefix+ci+'-'+ei;
  const btn=ev.target.querySelector('.btn-run');
  const resp=$('resp-'+key),rc=$('rc-'+key),rdot=$('rdot-'+key),rtxt=$('rtxt-'+key);
  const ep=DATA.categories[ci].items[ei],method=(ep.method||'GET').toUpperCase();

  btn.classList.add('loading');btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Ejecutando…';
  resp.classList.add('open');rc.textContent='';

  const url=buildUrl(ci,ei,isAll);
  const urlText=$('url-'+key)?.querySelector('.url-text');
  if(urlText)urlText.textContent=url;

  const t0=performance.now();
  try{
    const res=await fetch(url);
    const ms=Math.round(performance.now()-t0),ct=res.headers.get('content-type')||'',ok=res.ok;
    rdot.className='resp-dot'+(ok?'':' err');
    rtxt.textContent='HTTP '+res.status+' · '+ms+'ms';
    const now=new Date();
    REQ_LOG.push({url,status:res.status,ms,method,ip:getIp(),
      ts:pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds()),err:!ok});

    if(ct.includes('application/json')){
      const raw=await res.text();
      try{const p=JSON.parse(raw);lastResp[key]=p;rc.innerHTML=hl(JSON.stringify(p,null,2));}
      catch{rc.textContent=raw;}
    }else if(ct.includes('text/html')){
      const raw=await res.text();
      rc.innerHTML=(!ok?`<div style="font-size:10px;color:var(--acc3);margin-bottom:7px">⚠ HTTP ${res.status}</div>`:'')+
        `<iframe sandbox="allow-same-origin" srcdoc="${raw.replace(/"/g,'&quot;')}" style="width:100%;min-height:260px;border:none;border-radius:6px;background:#fff"></iframe>`;
    }else if(ct.includes('image/')){
      const blob=await res.blob();rc.innerHTML=`<img src="${URL.createObjectURL(blob)}" alt="img">`;
    }else if(ct.includes('video/')){
      const blob=await res.blob();rc.innerHTML=`<video controls style="width:100%"><source src="${URL.createObjectURL(blob)}"></video>`;
    }else if(ct.includes('audio/')){
      const blob=await res.blob();rc.innerHTML=`<audio controls><source src="${URL.createObjectURL(blob)}"></audio>`;
    }else{rc.textContent=(await res.text())||'(vacío)';}
    toast((ok?'✓':'✗')+' HTTP '+res.status+' · '+ms+'ms');
  }catch(err){
    rdot.className='resp-dot err';rtxt.textContent='Network Error';rc.textContent='Network Error: '+err.message;
    REQ_LOG.push({url,status:'ERR',ms:0,method,ip:getIp(),ts:'--:--:--',err:true});
    toast('⚠ Error de red');
  }finally{
    btn.classList.remove('loading');btn.innerHTML='<i class="fas fa-play"></i> Execute';
  }
}

/* ── Response actions ─── */
window.copyResp=function(key){navigator.clipboard.writeText($('rc-'+key)?.textContent||'');toast('Copiado ✓');};
window.dlResp=function(key){
  const d=lastResp[key];if(!d){toast('Sin datos JSON');return;}
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'})),download:'resp-'+key+'.json'});
  a.click();toast('Descargado ✓');
};
window.clearResp=function(key){
  $('resp-'+key)?.classList.remove('open');const rc=$('rc-'+key);if(rc)rc.innerHTML='';delete lastResp[key];
};
