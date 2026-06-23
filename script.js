/* ── DATA ── */
const TOPO_NODES = [
  // EC2-1: Application Server
  {id:'app',      ec2:1, cx:88, cy:90,  label:'App / fake-svc', sub:':8080 · OTel SDK',
   sig:'teal',
   what:'Sample application instrumented with the OTel SDK. Emits HTTP traces, runtime metrics, and structured logs.',
   why:'Application EC2 isolates service traffic from monitoring overhead.',
   config:'OTel SDK exports to Collector :4317 via gRPC. Generates synthetic HTTP spans and runtime metrics.',
   rels:'→ OTel Collector · ← Blackbox Exporter'},
  {id:'otelcol',  ec2:1, cx:88, cy:178, label:'OTel Collector',  sub:':4317 gRPC recv',
   sig:'teal',
   what:'Receives all telemetry from the app and fans it out: metrics to Prometheus, logs to Loki, traces to Tempo.',
   why:'Co-located with the app on EC2-1 to minimise export latency.',
   config:'gRPC receiver :4317. Processors: batch, memory_limiter. Three export pipelines.',
   rels:'← App · → Prometheus (metrics) · → Loki (logs) · → Tempo (traces)'},
  {id:'nodeexp',  ec2:1, cx:88, cy:268, label:'Node Exporter',   sub:':9100 · host metrics',
   sig:'blue',
   what:'Exports OS and hardware metrics — CPU, memory, disk, and network — for the host it runs on.',
   why:'Runs locally on each EC2 instance to read hardware registers without network overhead.',
   config:'Default collectors enabled. Prometheus scrapes :9100/metrics every 15 s.',
   rels:'→ Prometheus (scrape)'},
  // EC2-2: Monitoring Server
  {id:'prom',     ec2:2, cx:280, cy:90,  label:'Prometheus',      sub:':9090 · TSDB',
   sig:'blue',
   what:'Time-series database. Scrapes metrics, evaluates burn-rate alerting rules, and stores samples.',
   why:'Dedicated monitoring EC2 keeps Prometheus memory and I/O separate from application workloads.',
   config:'Scrape targets: Node Exporter ×2, OTel Collector, Blackbox Exporter. Multi-window burn-rate SLOs (14.4× fast / 5× slow). promtool-validated.',
   rels:'← Node Exporter · ← OTel Collector · ← Blackbox · → Grafana · → Alertmanager'},
  {id:'loki',     ec2:2, cx:430, cy:90,  label:'Loki',            sub:':3100 · log store',
   sig:'green',
   what:'Log aggregation system. Receives structured log streams and indexes labels for querying.',
   why:'Co-located with Grafana so LogQL queries stay on the same host.',
   config:'HTTP receiver from OTel Collector. Grafana datasource on :3100.',
   rels:'← OTel Collector (logs) · → Grafana (LogQL)'},
  {id:'tempo',    ec2:2, cx:280, cy:185, label:'Tempo',           sub:':4317/:4318 · traces',
   sig:'violet',
   what:'Distributed tracing backend. Receives spans and stores them for Grafana TraceQL queries.',
   why:'Trace storage is I/O heavy — monitoring EC2 keeps it from competing with application I/O.',
   config:'OTel gRPC :4317, HTTP :4318, query API :3200. Trace-to-log exemplar links enabled.',
   rels:'← OTel Collector (traces) · → Grafana (TraceQL)'},
  {id:'grafana',  ec2:2, cx:430, cy:185, label:'Grafana',         sub:':3000 · dashboards',
   sig:'orange',
   what:'Visualization layer. Queries all four backends and unifies metrics, logs, and traces in one pane.',
   why:'All datasources are local — no cross-host latency. Central to the monitoring server.',
   config:'Datasources provisioned from config files (zero UI clicks): Prometheus, Loki, Tempo, Alertmanager. DORA dashboards, SLO burn-rate panel, exemplar-linked traces.',
   rels:'← Prometheus · ← Loki · ← Tempo · ← Alertmanager'},
  {id:'alertmgr', ec2:2, cx:280, cy:280, label:'Alertmanager',    sub:':9093 · routing',
   sig:'red',
   what:'Routes firing Prometheus alerts — deduplicates, groups, silences, and dispatches to channels.',
   why:'Lives beside Prometheus on the monitoring server for low-latency alert evaluation.',
   config:'Inhibition rules suppress symptom alerts when a cause fires. amtool-validated. Grafana datasource for alert history.',
   rels:'← Prometheus (rules) · → Grafana (alert state)'},
  {id:'blackbox', ec2:2, cx:430, cy:280, label:'Blackbox Exp.',   sub:':9115 · HTTP probes',
   sig:'amber',
   what:'Probes external endpoints via HTTP/TCP and reports availability and latency as Prometheus metrics.',
   why:'Runs on monitoring EC2 to test the full network path to App — not just the local process.',
   config:'HTTP probe targets App :8080. Prometheus scrapes :9115 every 30 s.',
   rels:'→ App (HTTP probe) · → Prometheus (scrape)'},
];

const TOPO_EDGES = [
  // OTel collection — teal, carries all signals
  {from:'app',      to:'otelcol',  signals:['metrics','logs','traces'], color:'var(--sig-teal)',   dash:false},
  // Metrics — blue
  {from:'otelcol',  to:'prom',     signals:['metrics'],                 color:'var(--sig-blue)',   dash:true},
  {from:'nodeexp',  to:'prom',     signals:['infra'],                   color:'var(--sig-blue)',   dash:true},
  {from:'prom',     to:'grafana',  signals:['metrics'],                 color:'var(--sig-blue)',   dash:false},
  {from:'prom',     to:'alertmgr', signals:['metrics'],                 color:'var(--sig-red)',    dash:false},
  {from:'alertmgr', to:'grafana',  signals:['metrics'],                 color:'var(--sig-orange)', dash:false},
  // Logs — green
  {from:'otelcol',  to:'loki',     signals:['logs'],                    color:'var(--sig-green)',  dash:false},
  {from:'loki',     to:'grafana',  signals:['logs'],                    color:'var(--sig-green)',  dash:false},
  // Traces — violet
  {from:'otelcol',  to:'tempo',    signals:['traces'],                  color:'var(--sig-violet)', dash:false},
  {from:'tempo',    to:'grafana',  signals:['traces'],                  color:'var(--sig-violet)', dash:false},
  // Infrastructure — amber probing + blue scrape
  {from:'blackbox', to:'app',      signals:['infra'],                   color:'var(--sig-amber)',  dash:true},
  {from:'blackbox', to:'prom',     signals:['infra'],                   color:'var(--sig-blue)',   dash:true},
];

const QUESTION_DATA = [
  {id:'reliable', q:'How do you design reliable systems?'},
  {id:'automate', q:'What have you automated?'},
  {id:'incident', q:'Show me a difficult incident you solved'},
  {id:'stack',    q:'What is your preferred stack?'},
  {id:'devex',    q:'How do you improve developer experience?'},
];
const ANSWER_DATA = {
  reliable:{
    a:'I start from the blast radius I can tolerate, not the happy path: explicit SLOs, redundancy across AZs, graceful degradation and runbooks for the day it breaks. Reliability is a budget you spend deliberately, not a number you hope for.',
    cta:'View reliability work →', href:'#work'},
  automate:{
    a:'Infrastructure as Terraform, delivery through GitHub Actions, TTL-based sandbox environments that clean themselves up, and synthetic monitors that catch failures before users do. If I do something twice by hand, the third time it does itself.',
    cta:'View SwiftDeploy →', href:'#work'},
  incident:{
    a:'During a high-volume payroll window, multiple clients in a shared environment began experiencing similar errors. Splunk correlation by F5 pool-member ID revealed one member accounting for ~70% of observed errors — the load balancer itself was healthy. I disabled the affected member, traffic redistributed, errors stopped immediately. Root cause: an old certificate and its replacement shared the same name, creating a stale association on that node.',
    cta:'Replay the incident →', href:'#playground'},
  stack:{
    a:'AWS and GCP for the substrate, Kubernetes for compute, Terraform and Ansible for state, Go for tooling, and the LGTM stack for observability. Opinionated defaults, escape hatches when the team needs them.',
    cta:'Explore my stack →', href:'#about'},
  devex:{
    a:'Golden paths over gatekeeping: self-service environments, policy-as-code gates that fail fast with a clear message, and documentation that reads like a map. The secure, correct path should also be the easiest one.',
    cta:'View developer-experience work →', href:'#work'},
};

const GITHUB_SVG = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;
const EXTERNAL_SVG = `<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M8 1h3m0 0v3m0-3L5 7"/></svg>`;

const CASE_DATA = [
  {id:'forge', tag:'CI/CD Platform', title:'Forge', team:'built from scratch · Python + Bash',
    github:'https://github.com/GideonIsBuilding/forge', live:null,
    challenge:'Build an artifact registry and pipeline engine from scratch — declarative pipelines, real dependency resolution, and job isolation strong enough to trust with untrusted builds.',
    approach:'Reads declarative YAML pipelines, resolves transitive dependencies with a custom semver implementation, and executes jobs in fully isolated Docker containers with cgroup-enforced CPU, memory and PID limits. Bearer-token auth with Argon2 hashing; live build logs streamed over SSE without buffering.',
    tech:['Python','FastAPI','Docker','SQLite','semver'],
    outcome:'Content-addressed blob storage with SHA-256 verification at every pull, and an immutable SQLite-backed registry whose unique constraint makes version overwrites impossible. Ships as a pip-installable CLI with Slack alerting on pipeline and integrity events.',
    arch:['parse YAML','resolve semver','isolate · cgroups','sign + store']},
  {id:'lgtm', tag:'Observability Platform', title:'LGTM Stack', team:'Bash + Terraform · 2× EC2',
    github:'https://github.com/GideonIsBuilding/lgtm-stack', live:null,
    challenge:'Stand up a production-minded Loki · Grafana · Tempo · Prometheus stack with zero manual UI clicks — every config, unit file and dashboard generated from code.',
    approach:'Provisioned entirely via Terraform and four sequential setup scripts that read a single manifest of pinned binary versions. A five-phase bring-up validates configs with promtool and amtool before any service starts, then health-checks each service before starting the next.',
    tech:['Bash','Terraform','Prometheus','Loki','Tempo','Grafana','OTel'],
    outcome:'Multi-window burn-rate SLO alerting (14.4× fast / 5× slow) derived from a 99.5% objective, with inhibition rules that suppress symptom alerts when a cause is already firing. DORA metrics via GitHub Actions; every service runs non-root behind ProtectSystem=full.',
    arch:['pin versions','generate configs','validate · bring-up','burn-rate alert']},
  {id:'swiftdeploy', tag:'Deployment CLI', title:'SwiftDeploy', team:'Go · policy-gated',
    github:'https://github.com/GideonIsBuilding/swiftdeploy', live:null,
    challenge:'Give teams a declarative way to deploy that is safe by default and observable from the very first command.',
    approach:'A Go CLI that reads a single manifest.yaml as the sole source of truth and manages the full container lifecycle. Gates every deploy behind an OPA infrastructure policy (disk, CPU, memory) and gates canary promotions behind live Prometheus metrics — error rate and p99 latency.',
    tech:['Go','OPA','Prometheus','Docker','Nginx'],
    outcome:'A live terminal dashboard scrapes /metrics every 3 seconds and shows real-time policy compliance; an append-only audit trail writes to history.jsonl and produces audit_report.md on demand. Runs as a non-root user with dropped Linux capabilities.',
    arch:['plan','OPA gate','apply','canary on metrics']},
  {id:'anomaly detector', tag:'DevSecOps', title:'Anomaly Detector', team:'Go · Z-score',
    github:'https://github.com/GideonIsBuilding/anomaly-detector', live:null,
    challenge:'Identify unusual patterns in large-scale operational data that is designed to minimize false positives.',
    approach:'Real-time HTTP traffic anomaly detection engine built alongside a Nextcloud instance. Continuously tails Nginx JSON access logs, maintains deque-based sliding windows per IP and globally, and computes a rolling 30-minute baseline using mean and standard deviation.',
    tech:['Go','Nginx','iptables','Docker'],
    outcome:'A robust anomaly detection pipeline that flags anomalies when the z-score exceeds 3.0 or the rate surpasses 5x the baseline mean — whichever fires first. Blocks offending IPs via iptables DROP rules at the kernel level within 5 seconds and releases bans on a backoff schedule (10min → 30min → 2hrs → permanent).',
    arch:['sliding windows','networking','apply','audit log','slack alerting']},
];

const INCIDENT_STAGES = [
  {id:'impact',
   label:'1 · Impact',
   status:'Multiple clients experiencing errors during payroll window',
   tone:'clay',
   nodes:[{st:'ok'},{st:'ok'},{st:'warn',badge:'errors'},{st:'ok'}],
   clients:[{st:'err'},{st:'err'},{st:'err'}],
   panel:{items:[
     {text:'Multiple clients affected simultaneously'},
     {text:'High-volume payroll processing window'},
     {text:'Shared environment — all tenants exposed'},
     {text:'Investigation opened in Splunk'},
   ]},
   obs:'Multiple clients in a shared environment began experiencing similar errors during a high-volume payroll window.',
   action:'Opened investigation. Pulled error logs from Splunk to begin correlating the failures.',
   result:'Confirmed elevated, correlated error rates across clients sharing the same environment.',
   lesson:'Shared environments amplify single points of failure — one unhealthy component can affect all tenants simultaneously.'},
  {id:'trace',
   label:'2 · Trace',
   status:'Splunk: one pool member accounts for ~70% of observed errors',
   tone:'blue',
   nodes:[{st:'ok'},{st:'ok'},{st:'down',badge:'~70% of errors'},{st:'ok'}],
   clients:[{st:'ok'},{st:'ok'},{st:'ok'}],
   panel:{hdr:'Splunk · log correlation',items:[
     {text:'Errors correlated by F5 pool-member ID'},
     {text:'Node A — within normal range', ok:true},
     {text:'Node B — within normal range', ok:true},
     {text:'Node C — ~70% of observed errors', hi:true},
     {text:'Node D — within normal range', ok:true},
     {text:'F5 Virtual Server — healthy', ok:true},
   ]},
   obs:'Splunk correlation of error events against F5 pool-member IDs revealed one member accounting for ~70% of observed errors.',
   action:'Cross-referenced errors with F5 pool-member identifiers in Splunk. Confirmed the F5 load balancer itself was operating correctly.',
   result:'Failure isolated to a single pool member. All other members and the load balancer were healthy.',
   lesson:'Correlating application errors with infrastructure identifiers — pool member, host, pod — is the fastest way to narrow scope and rule out platform-level causes.'},
  {id:'contain',
   label:'3 · Contain',
   status:'Affected member disabled · traffic redistributed · errors stopped',
   tone:'amber',
   nodes:[{st:'ok'},{st:'ok'},{st:'disabled'},{st:'ok'}],
   clients:[{st:'ok'},{st:'ok'},{st:'ok'}],
   panel:{items:[
     {text:'Affected pool member disabled in F5'},
     {text:'Traffic redistributed immediately'},
     {text:'Three healthy members remain in service', ok:true},
     {text:'Client-facing errors ceased', ok:true},
   ]},
   obs:'Pool member confirmed as error source. Remaining members healthy and available to absorb traffic.',
   action:'Disabled the affected member in the F5 pool. Traffic redistributed across the remaining healthy members.',
   result:'Client-facing errors ceased immediately after the member was removed from the pool.',
   lesson:'Removing a bad node from rotation before attempting repair restores service faster than in-place fixing under live traffic.'},
  {id:'recover',
   label:'4 · Recover',
   status:'Node restored · health checks passing · returned to pool',
   tone:'green',
   nodes:[{st:'ok'},{st:'ok'},{st:'restored'},{st:'ok'}],
   clients:[{st:'ok'},{st:'ok'},{st:'ok'}],
   panel:{items:[
     {text:'Old certificate deleted — new cert left in place'},
     {text:'Node restarted in isolation'},
     {text:'Health checks: all passing', ok:true},
     {text:'Error activity returned to baseline', ok:true},
     {text:'Member safely returned to the pool', ok:true},
   ]},
   obs:'Service fully restored across the remaining pool members. Affected node isolated for remediation.',
   action:'Deleted the old certificate being served to traffic, leaving only the replacement. Then restarted and restored the affected node. Ran validation and health checks in isolation before returning it to the F5 pool.',
   result:'Node passed all health checks and was safely returned to the pool. Full pool capacity restored.',
   lesson:'Always validate a recovered node in isolation before re-adding it — returning an unvalidated node to live traffic can restart the incident.'},
  {id:'rootcause',
   label:'5 · Root cause',
   status:'Certificate naming collision found in cert-management environment',
   tone:'violet',
   nodes:[{st:'ok'},{st:'ok'},{st:'ok'},{st:'ok'}],
   clients:[{st:'ok'},{st:'ok'},{st:'ok'}],
   panel:{hdr:'Certificate Manager · collision',items:[
     {text:'cert-name-x', tag:'old', note:'original certificate'},
     {text:'cert-name-x', tag:'new', note:'replacement certificate'},
     {text:'Duplicate name → ambiguous binding', hi:true},
     {text:'Stale association persisted on Node C under load'},
   ]},
   obs:'Investigation in the certificate-management environment revealed an old certificate and its replacement sharing the same name.',
   action:'Traced the naming collision to the affected pool member. The duplicate name created an ambiguous or stale certificate association on that node.',
   result:'Root cause confirmed: certificate naming collision left the node with an invalid or stale certificate binding, causing failures under load.',
   lesson:'Certificate names must be unique across their full lifecycle. Reusing a name between an old and replacement certificate creates invisible ambiguity that surfaces only under load.'},
];

const INCIDENT_CONTROLS = [
  'Unique certificate naming enforced across the full certificate lifecycle',
  'Per-node certificate validation during every rotation',
  'Post-rotation health checks required before pool re-entry',
  'Configuration-drift detection for certificate bindings',
  'Incident runbook updated with certificate-collision diagnostic pattern',
];

const OPERATING_PRINCIPLES = [
  {id:'correlate', num:'01',
   title:'Correlate before you speculate',
   why:'Evidence narrows the search space faster than assumptions.',
   action:'Correlate application errors with infrastructure identifiers such as pool member, node, host, pod, and availability zone.',
   evidence:'Splunk correlation revealed that one F5 pool member accounted for approximately 70% of the observed errors.',
   cta:{label:'Replay the incident →', href:'#playground'}},
  {id:'exit', num:'02',
   title:'Every change needs an exit',
   why:'A deployment plan is incomplete without a safe recovery path.',
   action:'Define health checks, rollback conditions, validation steps, and a known-good state before making production changes.',
   evidence:'Versioned infrastructure, automated validation, reversible releases, and documented recovery procedures.',
   cta:null},
  {id:'pipeline', num:'03',
   title:'The third repetition becomes a pipeline',
   why:'Repeated manual work creates inconsistency, delays, and avoidable operational risk.',
   action:'Convert recurring tasks into reviewed, observable, and reusable automation.',
   evidence:'Infrastructure as Code, CI/CD workflows, temporary environments, and SwiftDeploy.',
   cta:{label:'View SwiftDeploy →', href:'#work'}},
  {id:'observe', num:'04',
   title:'Observe boundaries, not only applications',
   why:'An application can appear healthy while its host, endpoint, certificate, dependency, or telemetry path is failing.',
   action:'Monitor services, infrastructure, endpoints, dependencies, and the telemetry pipeline itself.',
   evidence:'OpenTelemetry, Prometheus, Loki, Tempo, Node Exporter, and Blackbox Exporter.',
   cta:{label:'Explore the observability lab →', href:'#hero'}},
  {id:'safe', num:'05',
   title:'Make the safe path the easy path',
   why:'Security and reliability should be built into platform defaults, not depend on every engineer remembering every rule.',
   action:'Provide secure defaults through least privilege, secrets management, policy gates, unique resource identities, and safe self-service workflows.',
   evidence:'Reusable infrastructure modules, controlled access, automated validation, and platform guardrails.',
   cta:null},
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
  {pub:'Syntasso',            mins:'7 min', title:'The 10 Best MCP Servers for Cloud-Native Engineers in 2025',  kicker:'Cloud-Native',  href:'https://www.syntasso.io/post/the-10-best-mcp-servers-for-cloud-native-engineers-in-2025'},
  {pub:'EverythingDevOps',    mins:'19 min', title:'Building a Production-Grade LGTM Stack on Two Servers; Everything That Worked and Everything That Broke',  kicker:'Observability',  href:'https://news.everythingdevops.dev/p/building-a-production-grade-lgtm-stack'},
  {pub:'Medium',              mins:'40 min', title:'I Built a Tool That Detects DDoS Attacks in Real Time — Here\'s Exactly How It Works',  kicker:'DevSecOps',  href:'https://medium.com/@gideonisbuilding/i-built-a-tool-that-detects-ddos-attacks-in-real-time-heres-exactly-how-it-works-95860a781468'},
  {pub:'Medium',              mins:'16 min', title:'What If Your Deployment Tool Was Smart Enough to Refuse Bad Deploys?',  kicker:'Developer Experience',  href:'https://medium.com/@gideonisbuilding/what-if-your-deployment-tool-was-smart-enough-to-refuse-bad-deploys-3a8523659db3'},
];

/* ── STATE ── */
const state = {
  theme: 'light',
  topoFilter: 'all',
  topoActive: 'grafana',
  ask: {sel:null, status:'idle', failedIds:new Set()},
  expanded: 'forge',
  incStage: 'impact',
  principle: 'correlate',
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
const TOPO_BY_ID = {};
TOPO_NODES.forEach(n => TOPO_BY_ID[n.id] = n);
const T_HW = 55, T_HH = 18; // half-width, half-height of node rects

function topoEdgePath(e) {
  const s = TOPO_BY_ID[e.from], t = TOPO_BY_ID[e.to];
  const x1 = s.cx, y1 = s.cy, x2 = t.cx, y2 = t.cy;

  if (s.id === 'app' && t.id === 'otelcol')
    return `M ${x1} ${y1+T_HH} L ${x2} ${y2-T_HH}`;

  if (s.id === 'prom' && t.id === 'alertmgr')
    return `M ${x1} ${y1+T_HH} C ${x1-32} ${y1+60} ${x2-32} ${y2-60} ${x2} ${y2-T_HH}`;

  // Within EC2-2, same row (horizontal)
  if (s.ec2 === 2 && t.ec2 === 2 && Math.abs(y1-y2) < 8)
    return `M ${x1+T_HW} ${y1} L ${x2-T_HW} ${y2}`;

  // Within EC2-2, same column (loki→grafana, vertical)
  if (s.ec2 === 2 && t.ec2 === 2 && Math.abs(x1-x2) < 8)
    return `M ${x1} ${y1+T_HH} L ${x2} ${y2-T_HH}`;

  // EC2-1 to EC2-2 — S-curve exiting right, entering left
  if (s.ec2 === 1 && t.ec2 === 2) {
    const sx = x1+T_HW, ex = x2-T_HW, dx = ex-sx;
    return `M ${sx} ${y1} C ${sx+dx*0.42} ${y1} ${ex-dx*0.42} ${y2} ${ex} ${y2}`;
  }

  // EC2-2 to EC2-1 (blackbox → app) — S-curve exiting left, entering right
  if (s.ec2 === 2 && t.ec2 === 1) {
    const sx = x1-T_HW, ex = x2+T_HW, dx = sx-ex;
    return `M ${sx} ${y1} C ${sx-dx*0.42} ${y1} ${ex+dx*0.42} ${y2} ${ex} ${y2}`;
  }

  // Within EC2-2, diagonal (blackbox→prom, alertmgr→grafana)
  if (x1 > x2) return `M ${x1-T_HW} ${y1} L ${x2+T_HW} ${y2}`;
  return `M ${x1+T_HW} ${y1} L ${x2-T_HW} ${y2}`;
}

function topoActiveNodeIds() {
  if (state.topoFilter === 'all') return null;
  const ids = new Set();
  TOPO_EDGES.forEach(e => {
    if (e.signals.includes(state.topoFilter)) { ids.add(e.from); ids.add(e.to); }
  });
  return ids;
}

function renderTopo() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('topoSvg');
  svg.innerHTML = '';
  const activeIds = topoActiveNodeIds();

  // EC2 container rectangles
  [{x:6,y:28,w:163,h:308,label:'EC2 — Application Server',color:'var(--sig-teal)'},
   {x:188,y:28,w:354,h:330,label:'EC2 — Monitoring Server',color:'var(--sig-orange)'}
  ].forEach(ec2 => {
    const lbl = document.createElementNS(NS,'text');
    lbl.setAttribute('x', ec2.x + ec2.w/2); lbl.setAttribute('y', ec2.y-7);
    lbl.setAttribute('text-anchor','middle'); lbl.setAttribute('fill', ec2.color);
    lbl.setAttribute('opacity','0.8');
    lbl.style.fontFamily="'JetBrains Mono',monospace"; lbl.style.fontSize='8.5px';
    lbl.style.letterSpacing='.08em'; lbl.style.textTransform='uppercase';
    lbl.textContent = ec2.label;
    svg.appendChild(lbl);

    const r = document.createElementNS(NS,'rect');
    r.setAttribute('x',ec2.x); r.setAttribute('y',ec2.y);
    r.setAttribute('width',ec2.w); r.setAttribute('height',ec2.h);
    r.setAttribute('rx','8'); r.setAttribute('fill','none');
    r.setAttribute('stroke', ec2.color); r.setAttribute('stroke-width','1.5');
    r.setAttribute('stroke-dasharray','5 4'); r.setAttribute('opacity','0.35');
    svg.appendChild(r);
  });

  // Edges
  TOPO_EDGES.forEach(e => {
    const active = state.topoFilter === 'all' || e.signals.includes(state.topoFilter);
    const path = document.createElementNS(NS,'path');
    path.setAttribute('d', topoEdgePath(e));
    path.setAttribute('fill','none');
    path.setAttribute('stroke', active ? e.color : 'var(--ink-faint)');
    path.setAttribute('stroke-width', active ? '1.8' : '1');
    path.setAttribute('stroke-linecap','round');
    path.setAttribute('opacity', active ? '1' : '0.15');
    if (e.dash) path.setAttribute('stroke-dasharray','4 4');
    svg.appendChild(path);
  });

  // Nodes
  TOPO_NODES.forEach(n => {
    const isVisible = !activeIds || activeIds.has(n.id);
    const isSelected = state.topoActive === n.id;
    const g = document.createElementNS(NS,'g');
    g.setAttribute('transform',`translate(${n.cx-T_HW} ${n.cy-T_HH})`);
    g.style.cursor = 'pointer';
    g.style.opacity = isVisible ? '1' : '0.22';

    const rect = document.createElementNS(NS,'rect');
    rect.setAttribute('width', T_HW*2); rect.setAttribute('height', T_HH*2);
    rect.setAttribute('rx','6'); rect.setAttribute('fill','var(--card)');
    rect.setAttribute('stroke', isSelected ? `var(--sig-${n.sig})` : 'var(--line)');
    rect.setAttribute('stroke-width', isSelected ? '2' : '1.5');
    g.appendChild(rect);

    // Left signal accent bar
    const acc = document.createElementNS(NS,'rect');
    acc.setAttribute('x','0'); acc.setAttribute('y','4');
    acc.setAttribute('width','3'); acc.setAttribute('height', T_HH*2-8);
    acc.setAttribute('rx','1.5'); acc.setAttribute('fill',`var(--sig-${n.sig})`);
    g.appendChild(acc);

    const t1 = document.createElementNS(NS,'text');
    t1.setAttribute('x', T_HW+3); t1.setAttribute('y','13');
    t1.setAttribute('text-anchor','middle'); t1.setAttribute('fill','var(--ink)');
    t1.style.fontFamily="'Bricolage Grotesque',sans-serif";
    t1.style.fontWeight='700'; t1.style.fontSize='11.5px';
    t1.textContent = n.label;
    g.appendChild(t1);

    const t2 = document.createElementNS(NS,'text');
    t2.setAttribute('x', T_HW+3); t2.setAttribute('y','26');
    t2.setAttribute('text-anchor','middle'); t2.setAttribute('fill','var(--ink-faint)');
    t2.style.fontFamily="'JetBrains Mono',monospace";
    t2.style.fontSize='8px'; t2.style.letterSpacing='.02em';
    t2.textContent = n.sub;
    g.appendChild(t2);

    g.addEventListener('click', () => {
      state.topoActive = n.id;
      renderTopoDetail();
      renderTopo();
    });
    svg.appendChild(g);
  });
}

function renderTopoDetail() {
  const n = TOPO_BY_ID[state.topoActive] || TOPO_NODES[0];
  const sigLabels = {teal:'OTel · collection', blue:'metrics', green:'logs', violet:'traces', orange:'visualization', red:'alerting', amber:'probing'};
  const groupEl = document.getElementById('topoGroup');
  groupEl.textContent = sigLabels[n.sig] || n.sig;
  groupEl.dataset.sig = n.sig;
  document.getElementById('topoLabel').textContent = n.label;
  document.getElementById('topoRole').textContent = n.what;
  document.getElementById('topoTools').innerHTML =
    `<div class="topo-info-row"><span class="topo-info-key">why here</span>${n.why}</div>` +
    `<div class="topo-info-row"><span class="topo-info-key">config</span>${n.config}</div>` +
    `<div class="topo-info-row"><span class="topo-info-key">connects</span>${n.rels}</div>`;
}

function renderTopoFilters() {
  const el = document.getElementById('topoFilters');
  if (!el) return;
  const filters = [
    {key:'all',     label:'All'},
    {key:'infra',   label:'Infrastructure'},
    {key:'metrics', label:'Metrics'},
    {key:'logs',    label:'Logs'},
    {key:'traces',  label:'Traces'},
  ];
  el.innerHTML = '';
  filters.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'topo-filter-btn' + (state.topoFilter === f.key ? ' active' : '');
    btn.dataset.signal = f.key;
    btn.textContent = f.label;
    btn.addEventListener('click', () => {
      state.topoFilter = f.key;
      renderTopo();
      renderTopoFilters();
    });
    el.appendChild(btn);
  });
}

renderTopo();
renderTopoDetail();
renderTopoFilters();

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
    body.innerHTML=`<div class="ask-answer"><div class="ask-answer-q">${q.q}</div><p class="ask-answer-a">${ans.a}</p><a href="${ans.href}" class="ask-answer-link">${ans.cta}</a></div>`;
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

/* ── INCIDENT REPLAY ── */
const INC_TONES = {
  clay:   {bg:'var(--clay-tint)',         fg:'var(--clay-deep)',  dot:'var(--clay)'},
  blue:   {bg:'rgba(74,143,212,.09)',     fg:'var(--sig-blue)',   dot:'var(--sig-blue)'},
  amber:  {bg:'var(--amber-tint)',        fg:'var(--amber-deep)', dot:'var(--amber-ink)'},
  green:  {bg:'var(--green-tint)',        fg:'var(--green-ink)',  dot:'var(--green-bd)'},
  violet: {bg:'rgba(123,94,167,.09)',     fg:'var(--sig-violet)', dot:'var(--sig-violet)'},
};

function buildRightPanel(s) {
  const p = s.panel;
  const tone = INC_TONES[s.tone];
  let html = '<div class="inc-right-panel">';
  if (p.hdr) html += `<div class="inc-rpanel-hdr">${p.hdr}</div>`;
  html += '<ul class="inc-rpanel-list">';
  p.items.forEach(it => {
    let cls = 'inc-rpanel-item';
    if (it.ok)  cls += ' inc-rpanel-ok';
    if (it.hi)  cls += ' inc-rpanel-hi';
    const dotColor = it.ok ? 'var(--green)' : it.hi ? 'var(--clay)' : tone.dot;
    html += `<li class="${cls}">`;
    html += `<span class="inc-rpanel-dot" style="background:${dotColor}"></span>`;
    html += '<span class="inc-rpanel-content">';
    if (it.tag) html += `<span class="inc-rpanel-tag inc-rpanel-tag--${it.tag}">${it.tag}</span>`;
    html += `<span class="inc-rpanel-text">${it.text}</span>`;
    if (it.note) html += `<span class="inc-rpanel-note">${it.note}</span>`;
    html += '</span>';
    html += '</li>';
  });
  html += '</ul></div>';
  return html;
}

function buildIncArch(s) {
  const wrap = document.createElement('div');
  wrap.className = 'inc-layout';

  // ── LEFT 65%: topology ──
  const topo = document.createElement('div');
  topo.className = 'inc-topo-col';

  const row = document.createElement('div');
  row.className = 'inc-main-row';

  // Clients column
  const cCol = document.createElement('div');
  cCol.className = 'inc-col';
  cCol.innerHTML = '<div class="inc-col-label">Clients</div>';
  s.clients.forEach((c, i) => {
    const box = document.createElement('div');
    box.className = `inc-client inc-client--${c.st}`;
    box.innerHTML = `<span class="inc-dot"></span>Client ${String.fromCharCode(65+i)}`;
    cCol.appendChild(box);
  });
  row.appendChild(cCol);

  const a1 = document.createElement('div');
  a1.className = 'inc-arrow'; a1.textContent = '→';
  row.appendChild(a1);

  // F5 box (visual anchor)
  const f5 = document.createElement('div');
  f5.className = 'inc-f5';
  f5.innerHTML = '<div class="inc-box-title">F5 Virtual Server</div><div class="inc-box-sub">load balancer · healthy</div>';
  row.appendChild(f5);

  const a2 = document.createElement('div');
  a2.className = 'inc-arrow'; a2.textContent = '→';
  row.appendChild(a2);

  // Pool column
  const pCol = document.createElement('div');
  pCol.className = 'inc-col';
  pCol.innerHTML = '<div class="inc-col-label">Pool Members</div>';
  const nodesWrap = document.createElement('div');
  nodesWrap.className = 'inc-nodes';
  s.nodes.forEach((n, i) => {
    const box = document.createElement('div');
    box.className = `inc-node inc-node--${n.st}`;
    box.innerHTML = `<span class="inc-dot"></span><span class="inc-node-lbl">Node ${String.fromCharCode(65+i)}</span>${n.badge ? `<span class="inc-badge">${n.badge}</span>` : ''}`;
    nodesWrap.appendChild(box);
  });
  pCol.appendChild(nodesWrap);
  row.appendChild(pCol);
  topo.appendChild(row);
  wrap.appendChild(topo);

  // ── RIGHT 35%: live evidence panel ──
  const divider = document.createElement('div');
  divider.className = 'inc-col-divider';
  wrap.appendChild(divider);

  const right = document.createElement('div');
  right.innerHTML = buildRightPanel(s);
  wrap.appendChild(right);

  return wrap;
}

function buildEvidence(s) {
  const fields = [
    {k:'Observation', v:s.obs},
    {k:'Action taken', v:s.action},
    {k:'Result',       v:s.result},
    {k:'Engineering lesson', v:s.lesson},
  ];
  let html = '<div class="inc-evidence">';
  fields.forEach(f => {
    html += `<div class="inc-ev-card"><div class="inc-ev-key">${f.k}</div><p class="inc-ev-val">${f.v}</p></div>`;
  });
  html += '</div>';

  if (s.id === 'rootcause') {
    html += '<div class="inc-controls"><div class="inc-controls-hdr">Preventative controls</div><ul class="inc-controls-list">';
    INCIDENT_CONTROLS.forEach(c => {
      html += `<li><span class="inc-ctrl-tick">✓</span>${c}</li>`;
    });
    html += '</ul></div>';
  }
  return html;
}

function renderIncident() {
  const s = INCIDENT_STAGES.find(x => x.id === state.incStage) || INCIDENT_STAGES[0];
  const tone = INC_TONES[s.tone];

  // Tabs
  const tabs = document.getElementById('playTabs');
  tabs.innerHTML = '';
  INCIDENT_STAGES.forEach(st => {
    const btn = document.createElement('button');
    btn.className = 'inc-tab' + (st.id === state.incStage ? ' active' : '');
    btn.dataset.tone = st.tone;
    btn.textContent = st.label;
    btn.addEventListener('click', () => { state.incStage = st.id; renderIncident(); });
    tabs.appendChild(btn);
  });

  // Status bar
  const bar = document.getElementById('playStatusBar');
  bar.style.background = tone.bg;
  const dot = document.getElementById('playDot');
  dot.style.background = tone.dot;
  dot.style.border = `1.5px solid ${tone.fg}`;
  const txt = document.getElementById('playStatusTxt');
  txt.textContent = s.status; txt.style.color = tone.fg;

  // Architecture diagram
  const diag = document.getElementById('playDiagram');
  diag.innerHTML = '';
  diag.appendChild(buildIncArch(s));

  // Evidence panel
  document.getElementById('playNote').innerHTML = buildEvidence(s);
}
renderIncident();

/* ── OPERATING MANUAL (principles) ── */
function principleBody(p) {
  return `<div class="opman-num">${p.num}</div>
    <h3 class="opman-title">${p.title}</h3>
    <div class="opman-section"><div class="opman-field-label">Why it matters</div><p class="opman-field-val">${p.why}</p></div>
    <div class="opman-section"><div class="opman-field-label">My default action</div><p class="opman-field-val">${p.action}</p></div>
    <div class="opman-section"><div class="opman-field-label">Evidence</div><p class="opman-field-val">${p.evidence}</p></div>
    ${p.cta ? `<a href="${p.cta.href}" class="opman-cta">${p.cta.label}</a>` : ''}`;
}

function renderPrinciples(){
  const el = document.getElementById('principlesGrid');
  el.innerHTML = '';
  const active = OPERATING_PRINCIPLES.find(p => p.id === state.principle) || OPERATING_PRINCIPLES[0];

  const wrap = document.createElement('div');
  wrap.className = 'opman';

  // Desktop featured panel (left 60%)
  const featured = document.createElement('div');
  featured.className = 'opman-featured';
  featured.innerHTML = principleBody(active);
  wrap.appendChild(featured);

  // Index list (right 40%)
  const idx = document.createElement('div');
  idx.className = 'opman-index';
  OPERATING_PRINCIPLES.forEach(p => {
    const isActive = p.id === state.principle;
    const item = document.createElement('div');
    item.className = 'opman-idx-item' + (isActive ? ' active' : '');
    item.innerHTML = `<div class="opman-idx-hdr">
        <span class="opman-idx-num">${p.num}</span>
        <span class="opman-idx-title">${p.title}</span>
        <span class="opman-idx-indicator"></span>
      </div>
      <div class="opman-idx-body">${principleBody(p)}</div>`;
    item.querySelector('.opman-idx-hdr').addEventListener('click', () => {
      state.principle = p.id;
      renderPrinciples();
    });
    idx.appendChild(item);
  });
  wrap.appendChild(idx);

  el.appendChild(wrap);
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
    card.href=n.href||'#';
    card.className='note-card';
    card.innerHTML=`<div class="note-meta"><span class="note-kicker">${n.kicker}</span><span class="note-mins">${n.mins}</span></div>
      <div class="note-title">${n.title}</div>
      <div class="note-pub">Published · ${n.pub}</div>`;
    el.appendChild(card);
  });
}
renderNotes();

document.querySelectorAll('[data-analytics="resume"]').forEach(link => {
  link.addEventListener('click', () => {
    window.gtag?.('event', 'resume_click', {
      event_category: 'engagement',
      event_label: 'resume'
    });
  });
});