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
  name: 'AD Access Recovery – Conceptual Workflow',
  principles: [
    'No policy changes',
    'No autonomous action',
    'No approval bypass',
    'Two-tier validation is illustrative only (no real SMS)',
    'All steps are logged (concept)'
  ],
  scope: 'AD-related access recovery only: password reset or account unlock (demo)'
};

function now(){return new Date().toLocaleString();}
function maskMobile(m){ return (m && m.length===8) ? '****' + m.slice(4) : '********'; }
function randOtp(){ return String(Math.floor(100000 + Math.random()*900000)); }
function endsWithEvenDigit(s){
  const d = String(s).slice(-1);
  return ['0','2','4','6','8'].includes(d);
}

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
    intent: null,              // 'reset' | 'unlock' | 'triage'
    detectedIssue: null,       // 'locked' | 'password'
    user:{staffId:null, mobile:null},
    otp:{value:null, attempts:0},
    transcript:[]
  };

  addAuditCard('Guardrails', [
    ['Mode', 'Concept demo (no execution)'],
    ['Scope', POLICY.scope],
    ['Principles', POLICY.principles.join(' • ')]
  ]);

  const intro = showAgentLanguage
    ? 'Hello — I’m an AI agent for AD access recovery (concept demo). I can help with password reset or account unlock, with clear validation and audit trail.'
    : 'Hello — this demo shows a guided AD access recovery experience (password reset / account unlock). No actions are executed.';

  addMsg('bot', intro, `Started: ${now()}`);
  addMsg('bot', 'Tell me what happened: e.g., “I can\'t login”, “reset password”, or “account locked”.');
}

function classify(text){
  const t = text.trim().toLowerCase();

  // high-level intents
  if (t.includes("can't login") || t.includes('cannot login') || t.includes("can\'t log in") || t.includes('cannot log in') || t.includes('can\'t sign in') || t.includes('cannot sign in') || t.includes('login failed')) return 'cant_login';
  if (t.includes('reset') || t.includes('forgot password') || t.includes('password reset')) return 'reset';
  if (t.includes('account locked') || t.includes('locked')) return 'locked';

  // commands
  if (t.includes('resend')) return 'resend_otp';
  if (t === 'unlock' || t.includes('self unlock')) return 'do_unlock';
  if (t === 'confirm' || t === 'yes') return 'yes';
  if (t === 'no') return 'no';
  if (t.includes('handoff') || t.includes('ticket')) return 'handoff';

  // numeric inputs
  if (/^\d{6}$/.test(t)) return 'otp';
  if (/^\d{8}$/.test(t)) return 'mobile';
  if (/^\d{5,7}$/.test(t)) return 'staffid';

  // new password (demo)
  if (t.length >= 4) return 'free_text';

  return 'unknown';
}

function sendOtp(){
  state.otp.value = randOtp();
  state.otp.attempts = 0;

  addAuditCard('OTP sent (concept)', [
    ['Sent to', maskMobile(state.user.mobile)],
    ['OTP (demo only)', state.otp.value],
    ['Note', 'In production, OTP is delivered via approved channel and never displayed']
  ]);

  addMsg('bot', `I’ve sent a 6-digit OTP to your mobile (${maskMobile(state.user.mobile)}). Enter the OTP to continue, or type “resend OTP”.`);
  state.stage = 'needOtp';
}

function simulateTicket(reason){
  const id = 'INC' + Math.floor(1000000 + Math.random()*9000000);
  addAuditCard('ServiceNow handoff (simulated)', [
    ['Record', id],
    ['Category', state.intent === 'reset' ? 'Account / Password Reset' : 'Account / Unlock'],
    ['Requester', state.user.staffId || '(unknown)'],
    ['Reason', reason || 'Handoff'],
    ['Guardrail', 'Human executes; agent provides context only']
  ]);
  addMsg('bot', `Created ticket ${id} (simulated). A service desk agent will follow the existing workflow.`);
  state.stage = 'ended';
  addMsg('bot', 'Anything else I can help with? (yes/no)');
  state.stage = 'post_help';
}

function finishAndAsk(){
  addMsg('bot', 'Anything else I can help with? (yes/no)');
  state.stage = 'post_help';
}

function handleUser(text){
  addMsg('user', text);
  const intent = classify(text);
  const value = text.trim();

  // START: interpret user's problem
  if(state.stage === 'start'){
    if(intent === 'reset'){
      state.intent = 'reset';
      addAuditCard('Intent recognised', [
        ['User intent', 'Password reset'],
        ['Scope check', 'AD password reset (demo)'],
        ['Next', 'Collect identity for OTP validation']
      ]);
      state.stage = 'needStaffId';
      addMsg('bot', 'To proceed, enter your Staff ID (5–7 digits).');
      return;
    }

    if(intent === 'locked'){
      state.intent = 'unlock';
      addAuditCard('Intent recognised', [
        ['User intent', 'Account locked'],
        ['Scope check', 'AD account unlock (demo)'],
        ['Next', 'Collect identity for OTP validation']
      ]);
      state.stage = 'needStaffId';
      addMsg('bot', 'To proceed, enter your Staff ID (5–7 digits).');
      return;
    }

    if(intent === 'cant_login'){
      state.intent = 'triage';
      addAuditCard('Triage (concept)', [
        ['User symptom', 'Cannot login'],
        ['Scope', 'We handle AD password reset / account unlock only'],
        ['Next', 'Collect identity then check account status (concept)']
      ]);
      addMsg('bot', 'I can help with AD password reset or account unlock. Let’s verify your identity first. Enter your Staff ID (5–7 digits).');
      state.stage = 'needStaffId';
      return;
    }

    addMsg('bot', 'I can help with AD password reset or account unlock. Try: “I can\'t login”, “reset password”, or “account locked”.');
    return;
  }

  // STAFF ID
  if(state.stage === 'needStaffId'){
    if(intent !== 'staffid'){
      addMsg('bot', 'Staff ID must be 5–7 digits. Please re-enter.');
      return;
    }
    state.user.staffId = value;
    addAuditCard('Validation — Tier 1 (concept)', [
      ['Staff ID', state.user.staffId],
      ['Status', 'Format check passed'],
      ['Next', 'Collect mobile for OTP']
    ]);
    state.stage = 'needMobile';
    addMsg('bot', 'Enter your mobile number (8 digits) for OTP delivery (concept).');
    return;
  }

  // MOBILE
  if(state.stage === 'needMobile'){
    if(intent !== 'mobile'){
      addMsg('bot', 'Mobile number must be exactly 8 digits. Please re-enter.');
      return;
    }
    state.user.mobile = value;
    addAuditCard('Validation — Tier 1 (concept)', [
      ['Mobile', maskMobile(state.user.mobile)],
      ['Status', 'Format check passed'],
      ['Next', 'Send OTP for Tier 2']
    ]);
    sendOtp();
    return;
  }

  // OTP
  if(state.stage === 'needOtp'){
    if(intent === 'resend_otp'){
      addMsg('bot', 'Resending OTP (concept)…');
      sendOtp();
      return;
    }

    if(intent !== 'otp'){
      addMsg('bot', 'Please enter the 6-digit OTP, or type “resend OTP”.');
      return;
    }

    state.otp.attempts += 1;
    const matched = value === state.otp.value;

    addAuditCard('Validation — Tier 2 (concept)', [
      ['OTP entered', '******'],
      ['Attempt', String(state.otp.attempts)],
      ['Result', matched ? 'Matched' : 'Not matched']
    ]);

    if(!matched){
      if(state.otp.attempts >= 3){
        addMsg('bot', 'OTP failed 3 times. For safety, handing off to Service Desk (simulated).');
        simulateTicket('OTP verification failed');
      } else {
        addMsg('bot', 'OTP does not match. Please try again or type “resend OTP”.');
      }
      return;
    }

    // OTP success — route by intent
    if(state.intent === 'reset'){
      addAuditCard('Proceed', [
        ['Validated', 'Yes'],
        ['Action (concept)', 'Guide password reset'],
        ['Guardrail', 'No real password set; demo only']
      ]);
      state.stage = 'needNewPassword';
      addMsg('bot', 'OTP validated. To simulate password reset, enter a NEW password (demo only — do NOT use a real password). Example: DemoPass#123');
      return;
    }

    if(state.intent === 'unlock'){
      addAuditCard('Account check (concept)', [
        ['Validated', 'Yes'],
        ['Detected', 'Account locked'],
        ['Next', 'Determine if self-unlock is eligible or approval is required']
      ]);

      // Decision: even-ending staffId => eligible self-unlock; odd => approval ticket
      const eligible = endsWithEvenDigit(state.user.staffId);
      if(eligible){
        state.stage = 'unlockChoice';
        addMsg('bot', 'Your account is locked. Self-unlock is eligible (concept). Type “unlock” to proceed, or “handoff” for Service Desk.');
      } else {
        addMsg('bot', 'Your account is locked. This lock type requires approval (concept). I will create a ticket for approval workflow.');
        simulateTicket('Unlock requires approval');
      }
      return;
    }

    if(state.intent === 'triage'){
      // In demo, we pretend to check and identify locked
      state.intent = 'unlock';
      addAuditCard('Account status check (concept)', [
        ['Validated', 'Yes'],
        ['Symptom', 'Cannot login'],
        ['Detected (demo)', 'Account locked'],
        ['Next', 'Attempt unlock or handoff based on eligibility']
      ]);

      const eligible = endsWithEvenDigit(state.user.staffId);
      if(eligible){
        state.stage = 'unlockChoice';
        addMsg('bot', 'I checked your account status (concept): it is LOCKED. Self-unlock is eligible. Type “unlock” to proceed, or “handoff”.');
      } else {
        addMsg('bot', 'I checked your account status (concept): it is LOCKED and requires approval. Creating a ticket (simulated).');
        simulateTicket('Triage: unlock requires approval');
      }
      return;
    }

    // fallback
    addMsg('bot', 'Validated, but I cannot determine the requested action. Please click Reset Demo.');
    return;
  }

  // Unlock choice
  if(state.stage === 'unlockChoice'){
    if(intent === 'do_unlock' || intent === 'yes'){
      addAuditCard('Self-unlock (concept)', [
        ['Action', 'Unlock account'],
        ['Result', 'Success (simulated)'],
        ['Audit', 'Logged in ServiceNow record in future state']
      ]);
      addMsg('bot', 'Account unlock completed (simulated). Please try logging in again.');
      finishAndAsk();
      return;
    }
    if(intent === 'handoff'){
      simulateTicket('User requested handoff for unlock');
      return;
    }
    if(intent === 'no'){
      addMsg('bot', 'Okay. If you change your mind, type “unlock” or click Reset Demo.');
      return;
    }
    addMsg('bot', 'Type “unlock” to proceed, or “handoff” for Service Desk.');
    return;
  }

  // New password (demo)
  if(state.stage === 'needNewPassword'){
    if(intent !== 'free_text'){
      addMsg('bot', 'Please enter a demo password string (do NOT use a real password).');
      return;
    }

    // Never store the password; only store length for demo audit
    addAuditCard('Password reset (concept)', [
      ['Action', 'Set new password'],
      ['Password', `Provided (length ${value.length})`],
      ['Result', 'Success (simulated)']
    ]);

    addMsg('bot', 'Password reset completed (simulated). Please try logging in again.');
    finishAndAsk();
    return;
  }

  // Post help
  if(state.stage === 'post_help'){
    if(intent === 'yes'){
      state.stage = 'start';
      state.intent = null;
      state.detectedIssue = null;
      addMsg('bot', 'Sure — tell me what happened: “I can\'t login”, “reset password”, or “account locked”.');
      return;
    }
    if(intent === 'no'){
      addAuditCard('Session ended', [
        ['Outcome', 'Completed'],
        ['User confirmed', 'No further help'],
        ['End time', now()]
      ]);
      addMsg('bot', 'Okay — session ended. You may close this window.');
      state.stage = 'ended';
      return;
    }
    addMsg('bot', 'Please reply “yes” or “no”.');
    return;
  }

  // End
  if(state.stage === 'ended'){
    addMsg('bot', 'Session ended. Click “Reset Demo” to start again.');
    return;
  }

  addMsg('bot', 'Click “Reset Demo” to restart.');
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
  a.download = 'ad_login_assistant_transcript.json';
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
