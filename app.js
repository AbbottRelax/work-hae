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
    { id:'R1', when:'Standard reset with eligible user', then:'Self-service guidance after Staff ID + Mobile + OTP (concept)' },
    { id:'R2', when:'Account locked / repeated failed attempts', then:'Explain lockout cause; guide to unlock/reset path (concept)' },
    { id:'R3', when:'Approval required (appraiser) and requester is shift worker', then:'Prepare approval request; advise expected wait; offer service desk handoff' },
    { id:'R4', when:'Identity uncertainty or high-risk signal', then:'Escalate to service desk/security (human decision)' }
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

// ===== PATCHED classify() =====
function classify(text) {
  const t = text.trim().toLowerCase();

  if (t.includes('reset') || t.includes('forgot')) return 'reset';
  if (t.includes('locked')) return 'locked';
  if (t.includes('resend')) return 'resend_otp';
  if (t.includes('handoff')) return 'handoff';
  if (t.includes('show steps')) return 'show_steps';
  if (t.includes('prepare approval')) return 'prepare_approval';

  if (/^\d{6}$/.test(t)) return 'otp';        // OTP: 6 digits
  if (/^\d{8}$/.test(t)) return 'mobile';     // Mobile: exactly 8 digits
  if (/^\d{5,7}$/.test(t)) return 'staffid';  // Staff ID: 5–7 digits

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

// ===== PATCHED handleUser() =====
function handleUser(text) {
  addMsg('user', text);
  const intent = classify(text);
  const value = text.trim();

  // START
  if (state.stage === 'start') {
    if (intent === 'reset' || intent === 'locked') {
      state.scenario = intent === 'locked' ? 'locked' : 'reset';

      addAuditCard('Intent recognised', [
        ['User intent', state.scenario === 'reset' ? 'Password reset' : 'Account locked'],
        ['Decision rule', state.scenario === 'reset' ? 'R1' : 'R2'],
        ['Explanation', 'Assistant guides steps; no actions executed']
      ]);

      state.stage = 'needStaffId';
      addMsg('bot', '1st-tier validation (concept): please enter your Staff ID (5–7 digits).');
    } else {
      addMsg('bot', 'Please start with “reset password” or “account locked”.');
    }
    return;
  }

  // STAFF ID
  if (state.stage === 'needStaffId') {
    if (intent !== 'staffid') {
      addMsg('bot', 'Staff ID must be 5–7 digits. Please re-enter.');
      return;
    }

    state.user.staffId = value;

    addAuditCard('1st-tier validation (concept)', [
      ['Staff ID', state.user.staffId],
      ['Status', 'Format check passed'],
      ['Guardrail', 'No real identity verification performed']
    ]);

    state.stage = 'needMobile';
    addMsg('bot', 'Please enter your mobile number (8 digits) for OTP delivery (concept).');
    return;
  }

  // MOBILE
  if (state.stage === 'needMobile') {
    if (intent !== 'mobile') {
      addMsg('bot', 'Mobile number must be exactly 8 digits. Please re-enter.');
      return;
    }

    state.user.mobile = value;

    addAuditCard('1st-tier validation (concept)', [
      ['Mobile', maskMobile(state.user.mobile)],
      ['Status', 'Format check passed'],
      ['Next', 'Send OTP for 2nd-tier validation']
    ]);

    sendOtp();
    return;
  }

  // OTP
  if (state.stage === 'needOtp') {
    if (intent === 'resend_otp') {
      addMsg('bot', 'Resending OTP (concept)…');
      sendOtp();
      return;
    }

    if (intent !== 'otp') {
      addMsg('bot', 'Please enter the 6-digit OTP, or type “resend OTP”.');
      return;
    }

    state.otp.attempts += 1;
    const matched = value === state.otp.value;

    addAuditCard('2nd-tier validation (concept)', [
      ['OTP entered', '******'],
      ['Attempt', String(state.otp.attempts)],
      ['Result', matched ? 'Matched' : 'Not matched']
    ]);

    if (!matched) {
      if (state.otp.attempts >= 3) {
        addMsg('bot', 'OTP failed 3 times. For safety, handing off to Service Desk (simulated).');
        simulateTicket('OTP failure');
      } else {
        addMsg('bot', 'OTP does not match. Please try again or type “resend OTP”.');
      }
      return;
    }

    state.stage = 'needShift';
    addMsg('bot', 'OTP validated. Are you currently on a shift where your appraiser may be unavailable? (yes/no)');
    return;
  }

  // SHIFT / APPROVAL
  if (state.stage === 'needShift') {
    const yes = value.toLowerCase().includes('y');
    state.user.shift = yes ? 'shift-worker / off-hours' : 'standard hours';
    state.approvalRequired = yes;

    addAuditCard('Decision point', [
      ['Scenario', state.scenario === 'reset' ? 'Password reset' : 'Account locked'],
      ['Shift context', state.user.shift],
      ['Approval required?', state.approvalRequired ? 'Likely (existing workflow)' : 'Not required'],
      ['Rules applied', state.approvalRequired ? 'R3' : (state.scenario === 'reset' ? 'R1' : 'R2')]
    ]);

    if (state.approvalRequired) {
      state.stage = 'approvalChoice';
      addMsg('bot', 'Approval may be required. Type “prepare approval” or “handoff”.');
    } else {
      state.stage = 'stepsChoice';
      addMsg('bot', 'Self-service guidance available (concept). Type “show steps” or “handoff”.');
    }
    return;
  }

  // approvalChoice
  if (state.stage === 'approvalChoice') {
    if (intent === 'prepare_approval') {
      addAuditCard('Approval package (concept)', [
        ['What will be sent', 'Requester staff ID + justification + timestamp'],
        ['Approval owner', 'Appraiser (existing workflow)'],
        ['Audit', 'All messages logged in ServiceNow record (future state)']
      ]);
      addMsg('bot', 'Prepared approval request draft (concept). Type “handoff” to simulate ticket creation.');
      return;
    }
    if (intent === 'handoff') {
      simulateTicket('Approval required');
      return;
    }
    addMsg('bot', 'Type “prepare approval” or “handoff”.');
    return;
  }

  // stepsChoice
  if (state.stage === 'stepsChoice') {
    if (intent === 'show_steps') {
      addAuditCard('Guided steps (concept)', [
        ['Step 1', 'Confirm reset request channel (portal/chat/mobile)'],
        ['Step 2', 'Perform identity verification steps (as-is)'],
        ['Step 3', 'Reset password using existing tool'],
        ['Step 4', 'If mobile: re-sync credentials / re-authenticate']
      ]);
      addMsg('bot', 'Steps are shown in the Audit Trail panel. Type “handoff” for service desk support.');
      return;
    }
    if (intent === 'handoff') {
      simulateTicket('User requested handoff');
      return;
    }
    addMsg('bot', 'Type “show steps” or “handoff”.');
    return;
  }

  addMsg('bot', 'Please click “Reset Demo” to restart.');
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
