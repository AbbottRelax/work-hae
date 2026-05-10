const $ = (id)=>document.getElementById(id);
const messages = $('messages');
const audit = $('audit');
const input = $('input');
const sendBtn = $('sendBtn');
const resetBtn = $('resetBtn');
const modeToggle = $('modeToggle');
const createTicketBtn = $('createTicketBtn');
const exportBtn = $('exportBtn');

let showAgentLanguage = false;
let state;

const POLICY = {
  name: 'Password Reset – Existing Security Workflow (Concept)',
  principles: [
    'No policy changes',
    'No autonomous action',
    'Approvals and escalation remain as-is',
    'Two-tier validation is illustrative only (no real SMS)',
    'All steps are logged'
  ],
  decisionRules: [
    { id:'R1', when:'Standard reset with eligible user', then:'Allow self-service guidance after Staff ID + Mobile + OTP (concept)' },
    { id:'R2', when:'Account locked / repeated failed attempts', then:'Explain lockout cause; guide to unlock/reset path (concept)' },
    { id:'R3', when:'Approval required (appraiser) and requester is shift worker', then:'Prepare approval request; advise expected wait; offer service desk handoff' },
    { id:'R4', when:'Identity uncertainty or high-risk signal', then:'Escalate to service desk/security (human decision)' }
  ],
  dataSources: [
    'ServiceNow: category/subcategory, resolution code, reopen flag (for measurement)',
    'Identity workflow owner guidance (for approvals)',
    'Knowledge articles (KA) baseline'
  ]
};

function now(){return new Date().toLocaleString();}
function maskMobile(m){ return (m && m.length===8) ? '****' + m.slice(4) : '********'; }
function randOtp(){ return String(Math.floor(100000 + Math.random()*900000)); }

function addMsg(role, text, meta){
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  if(meta){
    const m = document.createElement('span');
    m.className = 'meta';
    m.textContent = meta;
    div.appendChild(m);
  }
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  state.transcript.push({ts: new Date().toISOString(), role, text});
}

function addAuditCard(title, kvPairs){
  const card = document.createElement('div');
  card.className = 'card';
  const h = document.createElement('div');
  h.className = 'cardTitle';
  h.textContent = title;
  card.appendChild(h);
  const grid = document.createElement('div');
  grid.className = 'kv';
  kvPairs.forEach(([k,v])=>{
    const kk = document.createElement('div'); kk.className='k'; kk.textContent = k;
    const vv = document.createElement('div'); vv.textContent = v;
    grid.appendChild(kk); grid.appendChild(vv);
  });
  card.appendChild(grid);
  audit.appendChild(card);
  audit.scrollTop = audit.scrollHeight;
}

function boot(){
  messages.innerHTML='';
  audit.innerHTML='';
  state = {
    stage:'start',
    user:{staffId:null, mobile:null, shift:null},
    scenario:null,
    approvalRequired:null,
    otp:{value:null, attempts:0, sentTo:null},
    transcript:[]
  };

  addAuditCard('Guardrails', [
    ['Mode', 'Concept demo (no execution)'],
    ['Principles', POLICY.principles.join(' • ')]
  ]);

  const intro = showAgentLanguage
    ? 'Hello — I’m an AI assistant for Password Reset (concept demo). I guide you through the existing process and explain when approvals or escalation apply.'
    : 'Hello — this assistant demonstrates a future-state guided Password Reset experience. It follows the existing process and does not execute actions.';
  addMsg('bot', intro, `Started: ${now()}`);
  addMsg('bot', 'To begin, tell me: “reset password” or “account locked”.');
}

function classify(text){
  const t = text.toLowerCase().trim();
  if(t.includes('locked')) return 'locked';
  if(t.includes('forgot') || t.includes('reset')) return 'reset';
  if(t.includes('resend')) return 'resend';
  if(t.includes('handoff')) return 'handoff';
  if(t.includes('show steps')) return 'show_steps';
  if(t.includes('prepare approval')) return 'prepare_approval';
  if(/^\d{6}$/.test(t)) return 'otp';
  if(/^\d{8}$/.test(t)) return 'mobile';
  if(/^\d{5,8}$/.test(t)) return 'staffid';
  return 'unknown';
}

function sendOtp(){
  state.otp.value = randOtp();
  state.otp.attempts = 0;
  state.otp.sentTo = state.user.mobile;

  addAuditCard('OTP sent (concept)', [
    ['Sent to', maskMobile(state.user.mobile)],
    ['OTP (demo only)', state.otp.value],
    ['Note', 'In production, OTP is delivered via approved channel and never displayed on-screen']
  ]);

  addMsg('bot', `I’ve sent a 6-digit OTP to your mobile (${maskMobile(state.user.mobile)}). Enter the OTP to continue, or type “resend OTP”.`);
  state.stage = 'needOtp';
}

function simulateTicket(reason){
  const id = 'INC' + Math.floor(1000000 + Math.random()*9000000);
  addAuditCard('ServiceNow handoff (simulated)', [
    ['Record', id],
    ['Category', 'Account / Password Reset'],
    ['Requester', state.user.staffId || '(unknown)'],
    ['Reason', reason || 'Handoff'],
    ['Guardrail', 'Human executes; assistant provides context only']
  ]);
  addMsg('bot', `Created ticket ${id} (simulated). A service desk agent will follow the existing workflow.`);
  state.stage = 'done';
}

function handleUser(text){
  addMsg('user', text);
  const intent = classify(text);
  const t = text.trim();

  // Start
  if(state.stage==='start'){
    if(intent==='reset' || intent==='locked'){
      state.scenario = (intent==='locked') ? 'locked' : 'reset';
      addAuditCard('Intent recognised', [
        ['User intent', state.scenario==='reset' ? 'Password reset' : 'Account locked'],
        ['Decision rule', state.scenario==='reset' ? 'R1' : 'R2'],
        ['Explanation', 'Assistant guides steps; no actions executed']
      ]);
      state.stage = 'needStaffId';
      addMsg('bot', '1st-tier validation (concept): enter your Staff ID (5–8 digits).');
    } else {
      addMsg('bot', 'Try “reset password” or “account locked”.');
    }
    return;
  }

  // Staff ID
  if(state.stage==='needStaffId'){
    if(intent==='staffid'){
      state.user.staffId = t;
      addAuditCard('1st-tier validation (concept)', [
        ['Staff ID', state.user.staffId],
        ['Status', 'Format check passed'],
        ['Guardrail', 'No real identity verification performed']
      ]);
      state.stage = 'needMobile';
      addMsg('bot', 'Enter your Mobile number (8 digits) for OTP delivery (conceptual).');
    } else {
      addMsg('bot', 'Staff ID should be 5–8 digits. Please re-enter.');
    }
    return;
  }

  // Mobile
  if(state.stage==='needMobile'){
    if(intent==='mobile'){
      state.user.mobile = t;
      addAuditCard('1st-tier validation (concept)', [
        ['Mobile', maskMobile(state.user.mobile)],
        ['Status', 'Format check passed'],
        ['Next', 'Send OTP for 2nd-tier validation']
      ]);
      sendOtp();
    } else {
      addMsg('bot', 'Mobile number should be exactly 8 digits. Please re-enter.');
    }
    return;
  }

  // OTP
  if(state.stage==='needOtp'){
    if(intent==='resend'){
      addMsg('bot', 'Resending OTP (concept)…');
      sendOtp();
      return;
    }
    if(intent==='otp'){
      state.otp.attempts += 1;
      const ok = (t === state.otp.value);
      addAuditCard('2nd-tier validation (concept)', [
        ['OTP entered', '******'],
        ['Attempt', String(state.otp.attempts)],
        ['Result', ok ? 'Matched' : 'Not matched']
      ]);
      if(ok){
        state.stage = 'needShift';
        addMsg('bot', 'OTP validated. Are you currently on a shift where your appraiser may be unavailable? (yes/no)');
      } else {
        if(state.otp.attempts >= 3){
          addMsg('bot', 'OTP failed 3 times. For safety, I will hand off to the Service Desk (simulated).');
          simulateTicket('OTP failure');
        } else {
          addMsg('bot', 'OTP does not match. Try again, or type “resend OTP”.');
        }
      }
    } else {
      addMsg('bot', 'Please enter the 6-digit OTP, or type “resend OTP”.');
    }
    return;
  }

  // Shift decision
  if(state.stage==='needShift'){
    const low = text.toLowerCase();
    state.user.shift = (low.includes('y') || low.includes('yes')) ? 'shift-worker / off-hours' : 'standard hours';
    state.approvalRequired = (state.user.shift !== 'standard hours');

    addAuditCard('Decision point', [
      ['Scenario', state.scenario==='reset' ? 'Password reset' : 'Account locked'],
      ['Shift context', state.user.shift],
      ['Approval required?', state.approvalRequired ? 'Likely (existing appraiser approval path)' : 'Not required for standard path'],
      ['Rules applied', state.approvalRequired ? 'R3' : (state.scenario==='reset' ? 'R1' : 'R2')]
    ]);

    if(state.scenario==='locked'){
      addMsg('bot', 'Lockouts often happen after repeated attempts or out-of-sync mobile credentials. I’ll guide the safe recovery steps.');
    }

    if(state.approvalRequired){
      addMsg('bot', 'Approval may be needed due to shift context. Type “prepare approval” or “handoff”.');
      state.stage = 'approvalChoice';
    } else {
      addMsg('bot', 'Self-service guidance is available (concept). Type “show steps” for details or “handoff” for service desk (simulated).');
      state.stage = 'stepsChoice';
    }
    return;
  }

  if(state.stage==='approvalChoice'){
    if(intent==='prepare_approval'){
      addAuditCard('Approval package (concept)', [
        ['What will be sent', 'Requester staff ID + justification + timestamp'],
        ['Approval owner', 'Appraiser (existing workflow)'],
        ['Audit', 'All messages logged in ServiceNow record (future state)']
      ]);
      addMsg('bot', 'Prepared approval request draft (concept). Type “handoff” to simulate ticket creation.');
    } else if(intent==='handoff'){
      simulateTicket('Approval required');
    } else {
      addMsg('bot', 'Type “prepare approval” or “handoff”.');
    }
    return;
  }

  if(state.stage==='stepsChoice'){
    if(intent==='show_steps'){
      addAuditCard('Guided steps (concept)', [
        ['Step 1', 'Confirm reset request channel (portal/chat/mobile)'],
        ['Step 2', 'Perform identity verification steps (as-is)'],
        ['Step 3', 'Reset password using existing tool'],
        ['Step 4', 'If mobile: re-sync credentials / re-authenticate']
      ]);
      addMsg('bot', 'Steps are shown in the Audit Trail panel. Type “handoff” for service desk support.');
    } else if(intent==='handoff'){
      simulateTicket('User requested handoff');
    } else {
      addMsg('bot', 'Type “show steps” or “handoff”.');
    }
    return;
  }

  addMsg('bot', 'Type “reset password” or click Reset Demo.');
}

function exportTranscript(){
  const data = {
    exportedAt: new Date().toISOString(),
    mode: showAgentLanguage ? 'AI-Agent language ON' : 'Concept language',
    transcript: state.transcript,
    auditPolicy: POLICY
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'password_reset_assistant_transcript.json';
  a.click();
  URL.revokeObjectURL(url);
}

sendBtn.addEventListener('click', ()=>{
  const v = input.value.trim();
  if(!v) return;
  input.value='';
  handleUser(v);
});
input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendBtn.click(); });
resetBtn.addEventListener('click', boot);
modeToggle.addEventListener('change', (e)=>{ showAgentLanguage = e.target.checked; boot(); });
createTicketBtn.addEventListener('click', ()=>simulateTicket('Manual simulate ticket'));
exportBtn.addEventListener('click', exportTranscript);

Array.from(document.querySelectorAll('.pill')).forEach(p=>{
  p.addEventListener('click', ()=>{ input.value = p.textContent.replace('Try: ',''); sendBtn.click(); });
});

boot();
