/* ── DATA ── */
const NODE_DATA = [
  {id:'users',  label:'Users',        sub:'global',          cx:100, cy:52,  group:'edge',    role:'End users reaching the platform from anywhere on earth.',                                                             tools:'Anycast DNS · GeoDNS'},
  {id:'edge',   label:'Edge / CDN',   sub:'cache · TLS',     cx:100, cy:152, group:'edge',    role:'Caches static assets, terminates TLS, absorbs traffic spikes before they hit origin.',                              tools:'CloudFront · Cloudflare'},
  {id:'ingress',label:'Ingress · LB', sub:'L7 routing',      cx:270, cy:152, group:'edge',    role:'Layer-7 routing, health checks and the split point for canary releases.',                                           tools:'NGINX Ingress · ALB'},
  {id:'k8s',    label:'Kubernetes',   sub:'3 AZ · HPA',      cx:270, cy:252, group:'compute', role:'Workloads run as pods across three availability zones with horizontal autoscaling and self-healing.',               tools:'EKS · GKE · HPA'},
  {id:'svc',    label:'Services',     sub:'Go · gRPC',        cx:410, cy:252, group:'compute', role:'Stateless Go services — gRPC internally, REST at the edge, every deploy policy-gated.',                           tools:'Go · gRPC · OPA'},
  {id:'db',     label:'Postgres',     sub:'primary + replica',cx:410, cy:352, group:'data',    role:'Primary with a read replica and automated point-in-time backups that are restore-tested.',                         tools:'RDS · PITR'},
  {id:'obs',    label:'Observability',sub:'LGTM',             cx:100, cy:332, group:'obs',     role:'Metrics, logs, traces and SLO burn-rate alerts unified in one stack.',                                             tools:'Prometheus · Grafana · Loki · Tempo'},
  {id:'cicd',   label:'CI / CD',      sub:'GitOps',           cx:270, cy:392, group:'cicd',    role:'Every change ships through a tested, policy-checked pipeline — no manual production changes.',                     tools:'GitHub Actions · Terraform · ArgoCD'},
];
const EDGE_DATA = [
  ['users','edge'],['edge','ingress'],['ingress','k8s'],['k8s','svc'],['svc','db'],['obs','k8s'],['cicd','k8s'],
];

const QUESTION_DATA = [
  {id:'reliable', q:'How do you design reliable systems?'},
  {id:'automate', q:'What have you automated?'},
  {id:'incident', q:'Show me a difficult incident you solved'},
  {id:'stack',    q:'What is your preferred stack?'},
  {id:'devex',    q:'How do you improve developer experience?'},
];
const ANSWER_DATA = {
  reliable:{a:'I start from the blast radius I can tolerate, not the happy path: explicit SLOs, redundancy across AZs, graceful degradation and runbooks for the day it breaks. Reliability is a budget you spend deliberately, not a number you hope for.',link:'Reliability principle',target:'Forge'},
  automate:{a:'Infrastructure as Terraform, delivery through GitHub Actions, TTL-based sandbox environments that clean themselves up, and synthetic monitors that catch failures before users do. If I do something twice by hand, the third time it does itself.',link:'See SwiftDeploy',target:'SwiftDeploy'},
  incident:{a:'A managed-file-transfer job reported success while silently delivering truncated files. My SFTP synthetic monitor caught it on a SHA-256 mismatch, paged on-call, and we traced it to a partial-write race. Now every transfer is content-verified, not status-verified.',link:'Observability work',target:'Observability'},
  stack:{a:'AWS and GCP for the substrate, Kubernetes for compute, Terraform and Ansible for state, Go for tooling, and the LGTM stack for observability. Opinionated defaults, escape hatches when the team needs them.',link:'Capabilities',target:'Capabilities'},
  devex:{a:'Golden paths over gatekeeping: self-service environments, policy-as-code gates that fail fast with a clear message, and documentation that reads like a map. The secure, correct path should also be the easiest one.',link:'See SwiftDeploy',target:'SwiftDeploy'},
};

const GITHUB_SVG = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;
const EXTERNAL_SVG = `<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M8 1h3m0 0v3m0-3L5 7"/></svg>`;

const CASE_DATA = [
  {id:'forge', tag:'CI/CD Platform', title:'Forge', team:'built from scratch · Python',
    github:'https://github.com/gideon-aleonogwe/forge', live:null,
    challenge:'Build an artifact registry and pipeline engine from scratch — declarative pipelines, real dependency resolution, and job isolation strong enough to trust with untrusted builds.',
    approach:'Reads declarative YAML pipelines, resolves transitive dependencies with a custom semver implementation, and executes jobs in fully isolated Docker containers with cgroup-enforced CPU, memory and PID limits. Bearer-token auth with Argon2 hashing; live build logs streamed over SSE without buffering.',
    tech:['Python','FastAPI','Docker','SQLite','semver'],
    outcome:'Content-addressed blob storage with SHA-256 verification at every pull, and an immutable SQLite-backed registry whose unique constraint makes version overwrites impossible. Ships as a pip-installable CLI with Slack alerting on pipeline and integrity events.',
    arch:['parse YAML','resolve semver','isolate · cgroups','sign + store']},
  {id:'lgtm', tag:'Observability Platform', title:'LGTM Stack', team:'Bash + Terraform · 2× EC2',
    github:'https://github.com/gideon-aleonogwe/lgtm-stack', live:null,
    challenge:'Stand up a production-grade Loki · Grafana · Tempo · Prometheus stack with zero manual UI clicks — every config, unit file and dashboard generated from code.',
    approach:'Provisioned entirely via Terraform and four sequential setup scripts that read a single manifest of pinned binary versions. A five-phase bring-up validates configs with promtool and amtool before any service starts, then health-checks each service before starting the next.',
    tech:['Bash','Terraform','Prometheus','Loki','Tempo','Grafana','OTel'],
    outcome:'Multi-window burn-rate SLO alerting (14.4× fast / 5× slow) derived from a 99.5% objective, with inhibition rules that suppress symptom alerts when a cause is already firing. DORA metrics via GitHub Actions; every service runs non-root behind ProtectSystem=full.',
    arch:['pin versions','generate configs','validate · bring-up','burn-rate alert']},
  {id:'swiftdeploy', tag:'Deployment CLI', title:'SwiftDeploy', team:'Go · policy-gated',
    github:'https://github.com/gideon-aleonogwe/swiftdeploy', live:null,
    challenge:'Give teams a declarative way to deploy that is safe by default and observable from the very first command.',
    approach:'A Go CLI that reads a single manifest.yaml as the sole source of truth and manages the full container lifecycle. Gates every deploy behind an OPA infrastructure policy (disk, CPU, memory) and gates canary promotions behind live Prometheus metrics — error rate and p99 latency.',
    tech:['Go','OPA','Prometheus','Docker','Nginx'],
    outcome:'A live terminal dashboard scrapes /metrics every 3 seconds and shows real-time policy compliance; an append-only audit trail writes to history.jsonl and produces audit_report.md on demand. Runs as a non-root user with dropped Linux capabilities.',
    arch:['plan','OPA gate','apply','canary on metrics']},
];

const PLAY_DATA = {
  before:{label:'BEFORE',status:'Single point of failure',tone:'amber',
    note:'One instance, manual deploys, no health checks. It works — until the node it lives on does not.',
    cols:[{t:'Client',n:1,st:'ok'},{t:'App',n:1,st:'warn'},{t:'DB',n:1,st:'warn'}]},
  after:{label:'AFTER',status:'Highly available',tone:'green',
    note:'Load balancer in front of three replicas across AZs, a read replica, and canary routing. Designed for the failure, not the demo.',
    cols:[{t:'Client',n:1,st:'ok'},{t:'LB',n:1,st:'ok'},{t:'App ×3',n:3,st:'ok'},{t:'DB +replica',n:2,st:'ok'}]},
  failure:{label:'FAILURE',status:'AZ-B down · traffic rerouted',tone:'clay',
    note:'An availability zone drops. One replica goes red, the LB reroutes, the SLO burn-rate alert fires, and users never notice.',
    cols:[{t:'Client',n:1,st:'ok'},{t:'LB',n:1,st:'ok'},{t:'App ×3',n:3,st:'mixed'},{t:'DB +replica',n:2,st:'ok'}]},
};

const PRINCIPLE_DATA = [
  {id:'rel',  name:'Reliability',          kind:'gauge', big:'99.95%', sub:'SLO target',         pct:'92%',  blurb:'Design for the blast radius you can tolerate, not the happy path.'},
  {id:'auto', name:'Automation',           kind:'check', items:['IaC for every resource','Zero manual prod changes','Self-service environments'], blurb:'If I do it twice by hand, the third time it does itself.'},
  {id:'obs',  name:'Observability',        kind:'spark', big:'p99 142ms', sub:'and falling',      blurb:'You cannot operate what you cannot see.'},
  {id:'sec',  name:'Security',             kind:'check', items:['Least-privilege IAM','Secrets sealed at rest','Policy-as-code gates'], blurb:'The secure path should also be the easy path.'},
  {id:'dx',   name:'Developer Experience', kind:'gauge', big:'88%',    sub:'golden-path adoption',pct:'88%',  blurb:'Ship faster by making the right thing the default.'},
];

const TIMELINE_DATA = [
  {when:'Sep 2024 – Mar 2026', role:'Site Reliability Engineer', org:'TechPeak Lab · London',
    detail:'Migrated 1,200+ SCOM alerts to Splunk and automated NOC forwarding, cutting response latency 45%. Python/PowerShell remediation in playbooks automated recovery for 70% of repetitive alerts; multi-layer validity checks improved MTTD 35% and MTTR 42%.'},
  {when:'May 2025 – Oct 2025', role:'Technical Content Writer', org:'Turing · Palo Alto, CA',
    detail:'Engineered complex real-world scenarios demonstrating Gemini AI agents across workplace automation and enterprise integration, translating business workflows into modular, testable AI logic and a reusable scenario library.'},
  {when:'Jun 2024 – Aug 2024', role:'DevOps Engineer', org:'HNG Tech · Lagos',
    detail:'Containerized full-stack apps (React, FastAPI, Postgres) with Docker/Nginx on AWS EC2, built an email-queue system with RabbitMQ/Celery behind NGINX, and automated deployments with Ansible.'},
];

const CAP_DATA = [
  {group:'Cloud',         items:['AWS','GCP']},
  {group:'Orchestration', items:['Kubernetes','Docker','Podman']},
  {group:'CI/CD',         items:['Jenkins','GitHub Actions']},
  {group:'Infra as Code', items:['Terraform','Ansible']},
  {group:'Observability', items:['Prometheus','Grafana','Loki','Tempo','Splunk']},
  {group:'Languages',     items:['Go','Python','Bash','PowerShell']},
  {group:'Certifications',items:['KCNA','AWS Cloud Practitioner','CKAD · in progress','SAA · in progress']},
];

const NOTES_DATA = [
  {pub:'Syntasso',    mins:'7 min', title:'Designing seal & unseal: Shamir\'s Secret Sharing over GF(2⁸)',  kicker:'Architecture decision'},
  {pub:'TechPeak Lab',mins:'5 min', title:'Catching silent MFT failures with SHA-256 synthetic checks',      kicker:'Incident lesson'},
  {pub:'Spacelift',   mins:'6 min', title:'Policy-as-code gates that don\'t slow teams down',                kicker:'Developer experience'},
  {pub:'RunWhen',     mins:'4 min', title:'TTL-based ephemeral environments without the cleanup tax',         kicker:'Experiment'},
];

/* ── STATE ── */
const state = {
  theme: 'light',
  activeNode: 'k8s',
  ask: {sel:null, status:'idle', failedIds:new Set()},
  expanded: 'forge',
  play: 'after',
  menu: false,
};
let askTimer = null;

/* ── THEME ── */
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  const icon = t==='dark' ? '☀' : '☾';
  const label = t==='dark' ? 'Light' : 'Dark';
  document.getElementById('themeIcon').textContent = icon;
  document.getElementById('themeLabel').textContent = label;
  document.getElementById('themeIconMobile').textContent = icon;
  document.getElementById('themeBtnMobile').title = t==='dark'?'Switch to light mode':'Switch to dark mode';
  document.getElementById('themeBtn').title = t==='dark'?'Switch to light mode':'Switch to dark mode';
}
function toggleTheme(){
  state.theme = state.theme==='dark'?'light':'dark';
  try{localStorage.setItem('ffm-theme',state.theme);}catch(e){}
  applyTheme(state.theme);
}
document.getElementById('themeBtn').addEventListener('click', toggleTheme);
document.getElementById('themeBtnMobile').addEventListener('click', toggleTheme);
(function initTheme(){
  let t=null;
  try{t=localStorage.getItem('ffm-theme');}catch(e){}
  if(t!=='light'&&t!=='dark') t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light';
  state.theme=t; applyTheme(t);
})();

/* ── MOBILE MENU ── */
document.getElementById('menuBtn').addEventListener('click',()=>{
  state.menu=!state.menu;
  document.getElementById('mobileMenu').classList.toggle('open', state.menu);
});
document.getElementById('mobileMenu').querySelectorAll('a').forEach(a=>{
  a.addEventListener('click',()=>{state.menu=false; document.getElementById('mobileMenu').classList.remove('open');});
});
function checkMobileStatus(){
  const isMobile = window.innerWidth <= 900;
  document.getElementById('mobileStatus').style.display = isMobile ? 'flex' : 'none';
}
checkMobileStatus();
window.addEventListener('resize', checkMobileStatus);

/* ── TOPOLOGY ── */
function renderTopo(){
  const byId = {};
  NODE_DATA.forEach(n=>byId[n.id]=n);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('topoSvg');
  svg.innerHTML = '';

  EDGE_DATA.forEach(([a,b])=>{
    const na=byId[a], nb=byId[b];
    const line = document.createElementNS(SVG_NS,'line');
    line.setAttribute('x1',na.cx); line.setAttribute('y1',na.cy);
    line.setAttribute('x2',nb.cx); line.setAttribute('y2',nb.cy);
    line.setAttribute('stroke','var(--ink-faint)');
    line.setAttribute('stroke-width','2');
    line.setAttribute('stroke-dasharray','3 5');
    line.setAttribute('stroke-linecap','round');
    svg.appendChild(line);
  });

  NODE_DATA.forEach(n=>{
    const active = state.activeNode===n.id;
    const g = document.createElementNS(SVG_NS,'g');
    g.setAttribute('transform',`translate(${n.cx-58} ${n.cy-21})`);
    g.style.cursor='pointer';

    const rect = document.createElementNS(SVG_NS,'rect');
    rect.setAttribute('width','116'); rect.setAttribute('height','42'); rect.setAttribute('rx','7');
    rect.setAttribute('fill', active?'var(--green)':'var(--card)');
    rect.setAttribute('stroke', active?'var(--green-ink)':'var(--ink)');
    rect.setAttribute('stroke-width', active?'2.5':'2');
    g.appendChild(rect);

    const t1 = document.createElementNS(SVG_NS,'text');
    t1.setAttribute('x','58'); t1.setAttribute('y','18'); t1.setAttribute('text-anchor','middle');
    t1.setAttribute('fill', active?'#0C3F2B':'var(--ink)');
    t1.style.fontFamily="'Bricolage Grotesque',sans-serif";
    t1.style.fontWeight='700'; t1.style.fontSize='13px';
    t1.textContent=n.label;
    g.appendChild(t1);

    const t2 = document.createElementNS(SVG_NS,'text');
    t2.setAttribute('x','58'); t2.setAttribute('y','32'); t2.setAttribute('text-anchor','middle');
    t2.setAttribute('fill', active?'var(--green-mid)':'var(--ink-soft)');
    t2.style.fontFamily="'JetBrains Mono',monospace";
    t2.style.fontSize='8.5px'; t2.style.letterSpacing='.03em';
    t2.textContent=n.sub;
    g.appendChild(t2);

    const setActive = ()=>{
      state.activeNode=n.id;
      renderTopoDetail();
      renderTopo();
    };
    g.addEventListener('mouseenter', setActive);
    g.addEventListener('click', setActive);
    svg.appendChild(g);
  });
}
function renderTopoDetail(){
  const n = NODE_DATA.find(x=>x.id===state.activeNode)||NODE_DATA[0];
  document.getElementById('topoGroup').textContent = n.group;
  document.getElementById('topoLabel').textContent = n.label;
  document.getElementById('topoRole').textContent  = n.role;
  document.getElementById('topoTools').textContent = n.tools;
}
renderTopo();
renderTopoDetail();

/* ── ASK ── */
function renderAskQuestions(){
  const el = document.getElementById('askQuestions');
  el.innerHTML = '';
  QUESTION_DATA.forEach((q,i)=>{
    const selected = state.ask.sel===q.id;
    const btn = document.createElement('button');
    btn.className='ask-q-btn';
    btn.style.background = selected?'var(--ink)':'var(--card)';
    btn.style.color = selected?'var(--paper)':'var(--ink)';
    const numEl = document.createElement('span');
    numEl.className='ask-q-num';
    numEl.style.color = selected?'var(--green)':'var(--ink-faint)';
    numEl.textContent='0'+(i+1);
    const qEl = document.createElement('span');
    qEl.textContent=q.q;
    btn.appendChild(numEl);
    btn.appendChild(qEl);
    btn.addEventListener('click',()=>selectAsk(q.id));
    el.appendChild(btn);
  });
}

function selectAsk(id){
  clearTimeout(askTimer);
  state.ask.sel=id; state.ask.status='loading';
  renderAskQuestions();
  renderAskPanel();
  askTimer = setTimeout(()=>{
    if(id==='incident' && !state.ask.failedIds.has(id)){
      state.ask.status='error';
      state.ask.failedIds.add(id);
    } else {
      state.ask.status='answered';
    }
    renderAskPanel();
  }, 750);
}

function renderAskPanel(){
  const statusEl=document.getElementById('askStatus');
  const body=document.getElementById('askBody');
  const s=state.ask;
  statusEl.textContent=s.status;

  if(s.status==='idle'){
    body.innerHTML=`<div class="ask-idle"><div class="ask-idle-icon">⌗</div><div class="ask-idle-main">Select a question to begin.</div><div class="ask-idle-sub">Five things people usually want to know.</div></div>`;
  } else if(s.status==='loading'){
    body.innerHTML=`<div class="ask-loading"><span class="ask-spinner"></span><span class="ask-spinner-txt">Querying the field manual…</span></div>`;
  } else if(s.status==='error'){
    body.innerHTML=`<div class="ask-error"><div class="ask-error-badge">⚠ on-call paged · timeout</div><p class="ask-error-p">The incident service didn't respond in time — fittingly, this answer is about an incident. Reliable systems plan for the retry.</p><button class="ask-retry-btn" id="retryBtn">↻ Retry request</button></div>`;
    document.getElementById('retryBtn').addEventListener('click',()=>selectAsk(s.sel));
  } else if(s.status==='answered'){
    const ans=ANSWER_DATA[s.sel];
    const q=QUESTION_DATA.find(x=>x.id===s.sel);
    body.innerHTML=`<div class="ask-answer"><div class="ask-answer-q">${q.q}</div><p class="ask-answer-a">${ans.a}</p><a href="#work" class="ask-answer-link"><span class="ask-link-arrow">→ ${ans.target}</span><span class="ask-link-label">${ans.link}</span></a></div>`;
  }
}

renderAskQuestions();
renderAskPanel();

/* ── CASES ── */
function renderCases(){
  const el=document.getElementById('casesContainer');
  el.innerHTML='';
  CASE_DATA.forEach((c,i)=>{
    const open=state.expanded===c.id;
    const card=document.createElement('div');
    card.className='case-card';
    const githubLink = c.github ? `<a href="${c.github}" class="case-link-btn" target="_blank" rel="noopener">${GITHUB_SVG}GitHub</a>` : '';
    const liveLink   = c.live   ? `<a href="${c.live}"   class="case-link-btn" target="_blank" rel="noopener">${EXTERNAL_SVG}Live site</a>` : '';
    card.innerHTML=`
      <button class="case-toggle">
        <div>
          <div class="case-meta">
            <span class="case-idx">0${i+1}</span>
            <span class="case-tag">${c.tag}</span>
            <span class="case-team">${c.team}</span>
          </div>
          <div class="case-title">${c.title}</div>
        </div>
        <div class="case-toggle-right">
          <span class="case-open-text">${open?'Collapse':'Expand case'}</span>
          <span class="case-sym">${open?'–':'+'}</span>
        </div>
      </button>
      <div class="case-links">${githubLink}${liveLink}</div>
      <div class="case-body">
        <div class="case-summary">
          <div>
            <div class="case-challenge-label">Challenge</div>
            <p class="case-challenge-p">${c.challenge}</p>
            <div class="case-tech">${c.tech.map(t=>`<span>${t}</span>`).join('')}</div>
          </div>
          <div>
            <div class="case-arch-label">Architecture</div>
            <div class="case-arch-items">${c.arch.map(a=>`<div class="case-arch-item"><span class="case-arch-dot"></span>${a}</div>`).join('')}</div>
          </div>
        </div>
        ${open?`<div class="case-expanded">
          <div class="case-approach"><div class="case-approach-label">Engineering approach</div><p class="case-approach-p">${c.approach}</p></div>
          <div class="case-outcome"><div class="case-outcome-label">Measurable outcome</div><p class="case-outcome-p">${c.outcome}</p></div>
        </div>`:''}
      </div>`;
    card.querySelector('.case-toggle').addEventListener('click',()=>{
      state.expanded = state.expanded===c.id ? null : c.id;
      renderCases();
    });
    el.appendChild(card);
  });
}
renderCases();

/* ── PLAYGROUND ── */
const BOX_COLOR = {
  ok:   {bg:'var(--green)',    bd:'var(--green-ink)'},
  warn: {bg:'var(--amber)',    bd:'var(--amber-ink)'},
  down: {bg:'var(--clay-box)', bd:'var(--clay-deep)'},
};
const TONE_MAP = {
  green:{bg:'var(--green-tint)', fg:'#0C3F2B',          dot:'var(--green-bd)'},
  amber:{bg:'var(--amber-tint)', fg:'var(--amber-deep)', dot:'var(--amber-ink)'},
  clay: {bg:'var(--clay-tint)',  fg:'var(--clay-deep)',  dot:'var(--clay)'},
};

function renderPlay(){
  const p=PLAY_DATA[state.play];
  const tone=TONE_MAP[p.tone];
  const bar=document.getElementById('playStatusBar');
  bar.style.background=tone.bg;
  document.getElementById('playDot').style.background=tone.dot;
  document.getElementById('playDot').style.border=`1.5px solid ${tone.fg}`;
  const txt=document.getElementById('playStatusTxt');
  txt.textContent=p.status; txt.style.color=tone.fg;

  const diag=document.getElementById('playDiagram');
  diag.innerHTML='';
  p.cols.forEach((col,ci)=>{
    let boxes=[];
    if(col.st==='mixed'){
      for(let j=0;j<col.n;j++) boxes.push(j===1?BOX_COLOR.down:BOX_COLOR.ok);
    } else {
      for(let j=0;j<col.n;j++) boxes.push(BOX_COLOR[col.st]);
    }
    const wrap=document.createElement('div');
    wrap.className='play-col';
    const inner=document.createElement('div');
    inner.className='play-col-inner';
    const boxWrap=document.createElement('div');
    boxWrap.className='play-boxes';
    boxes.forEach(b=>{
      const bx=document.createElement('div');
      bx.className='play-box';
      bx.style.background=b.bg; bx.style.borderColor=b.bd;
      boxWrap.appendChild(bx);
    });
    const lbl=document.createElement('div');
    lbl.className='play-col-label';
    lbl.textContent=col.t;
    inner.appendChild(boxWrap);
    inner.appendChild(lbl);
    wrap.appendChild(inner);
    if(ci<p.cols.length-1){
      const arr=document.createElement('div');
      arr.className='play-arrow';
      arr.textContent='→';
      wrap.appendChild(arr);
    }
    diag.appendChild(wrap);
  });

  document.getElementById('playNote').textContent=p.note;

  const tabs=document.getElementById('playTabs');
  tabs.innerHTML='';
  ['before','after','failure'].forEach(k=>{
    const pd=PLAY_DATA[k];
    const btn=document.createElement('button');
    btn.className='play-tab';
    btn.textContent=pd.label;
    const active=state.play===k;
    btn.style.background=active?'var(--ink)':'transparent';
    btn.style.color=active?'var(--paper)':'var(--ink)';
    btn.addEventListener('click',()=>{state.play=k;renderPlay();});
    tabs.appendChild(btn);
  });
}
renderPlay();

/* ── PRINCIPLES ── */
function renderPrinciples(){
  const el=document.getElementById('principlesGrid');
  el.innerHTML='';
  PRINCIPLE_DATA.forEach(p=>{
    const card=document.createElement('div');
    card.className='principle-card';
    let vis='';
    if(p.kind==='gauge'){
      vis=`<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px;"><span class="principle-big">${p.big}</span><span class="principle-sub">${p.sub}</span></div>
           <div class="principle-bar-track"><div class="principle-bar-fill" style="--pct:${p.pct};"></div></div>`;
    } else if(p.kind==='check'){
      vis=`<div class="principle-checks">${p.items.map(it=>`<div class="principle-check"><span class="principle-check-icon">✓</span>${it}</div>`).join('')}</div>`;
    } else if(p.kind==='spark'){
      vis=`<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:12px;"><span class="principle-big">${p.big}</span><span class="principle-sub">${p.sub}</span></div>
           <svg viewBox="0 0 200 48" width="100%" height="48" style="display:block;">
             <polyline points="0,38 25,30 50,34 75,22 100,26 125,16 150,20 175,11 200,14" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
             <polyline points="0,38 25,30 50,34 75,22 100,26 125,16 150,20 175,11 200,14 200,48 0,48" fill="var(--green-tint)" stroke="none" opacity="0.7"/>
           </svg>`;
    }
    card.innerHTML=`
      <div class="principle-head"><span class="principle-name">${p.name}</span><span class="principle-dot"></span></div>
      <div class="principle-vis">${vis}</div>
      <p class="principle-blurb">${p.blurb}</p>`;
    el.appendChild(card);
  });
}
renderPrinciples();

/* ── TIMELINE ── */
function renderTimeline(){
  const el=document.getElementById('timelineEl');
  el.innerHTML='';
  TIMELINE_DATA.forEach(t=>{
    const item=document.createElement('div');
    item.className='tl-item';
    item.innerHTML=`<div class="tl-when">${t.when}</div>
      <div class="tl-right"><span class="tl-dot"></span>
        <div class="tl-role">${t.role}</div>
        <div class="tl-org">${t.org}</div>
        <p class="tl-detail">${t.detail}</p>
      </div>`;
    el.appendChild(item);
  });
}
renderTimeline();

/* ── CAPABILITIES ── */
function renderCaps(){
  const el=document.getElementById('capsEl');
  el.innerHTML='';
  CAP_DATA.forEach(g=>{
    const row=document.createElement('div');
    row.className='cap-row';
    row.innerHTML=`<div class="cap-group">${g.group}</div>
      <div class="cap-items">${g.items.map(it=>`<span class="cap-tag">${it}</span>`).join('')}</div>`;
    el.appendChild(row);
  });
}
renderCaps();

/* ── FIELD NOTES ── */
function renderNotes(){
  const el=document.getElementById('notesGrid');
  el.innerHTML='';
  NOTES_DATA.forEach(n=>{
    const card=document.createElement('a');
    card.href='#';
    card.className='note-card';
    card.innerHTML=`<div class="note-meta"><span class="note-kicker">${n.kicker}</span><span class="note-mins">${n.mins}</span></div>
      <div class="note-title">${n.title}</div>
      <div class="note-pub">Published · ${n.pub}</div>`;
    el.appendChild(card);
  });
}
renderNotes();

/* ── ANIMATION OBSERVER ── */
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.querySelectorAll('.principle-bar-fill').forEach(b=>{
        b.style.animation='none';
        b.offsetHeight;
        b.style.animation='bar 1.2s ease forwards';
      });
    }
  });
},{threshold:0.2});
document.querySelectorAll('#principles').forEach(s=>io.observe(s));
