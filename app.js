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
let state = {
  stage: 'start',
  user: { employeeId: null, shift: null },
  scenario: null, // 'forgot' | 'locked'
  approvalRequired: null,
  transcript: []
};

const POLICY = {
  name: 'Password Reset – Existing Security Workflow (Concept)',
  principles: [
    'No policy changes',
    'No autonomous action',
    'Approvals and escalation remain as-is',
    'All steps are logged'
  ],
  decisionRules: [
    { id:'R1', when:'Standard forgot-password with eligible user', then:'Guide user through existing self-service steps' },
    { id:'R2', when:'Account locked / repeated failed attempts', then:'Explain lockout cause; guide to unlock/reset path' },
    { id:'R3', when:'Approval required (appraiser) and requester is shift worker', then:'Prepare approval request; advise expected wait; offer service desk handoff' },
    { id:'R4', when:'Identity uncertainty or high-risk signal', then:'Escalate to security/service desk (human decision)' }
  ],
  dataSources: [
    'ServiceNow: category/subcategory, resolution code, reopen flag (for measurement)',
    'Identity workflow owner guidance (for approvals)',
    'Knowledge articles (KA) baseline'
  ]
};

function now(){return new Date().toLocaleString();}
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
  state = { stage:'start', user:{employeeId:null, shift:null}, scenario:null, approvalRequired:null, transcript:[] };

  addAuditCard('Guardrails', [
    ['Mode', 'Concept demo (no execution)'],
    ['Principles', POLICY.principles.join(' • ')]
  ]);

  const intro = showAgentLanguage
    ? 'Hello — I’m an AI assistant for Password Reset (concept demo). I can guide you through the existing process and explain when approvals or escalation apply.'
    : 'Hello — this assistant demonstrates a future-state guided Password Reset experience. It follows the existing process and does not execute actions.';
  addMsg('bot', intro, `Started: ${now()}`);

  addMsg('bot', 'To begin, tell me: “reset password” or “account locked”.');
}

function classify(text){
  const t = text.toLowerCase();
  if(t.includes('locked')) return 'locked';
  if(t.includes('forgot') || t.includes('reset')) return 'forgot';
  if(t.includes('night') || t.includes('shift')) return 'shift';
  if(/\b\d{5,8}\b/.test(t)) return 'empid';
  if(t.includes('approve') || t.includes('appraiser')) return 'approval';
  return 'unknown';
}

function handleUser(text){
  addMsg('user', text);

  const intent = classify(text);

  // Extract employeeId if present
  const m = text.match(/\b(\d{5,8})\b/);
  if(m && !state.user.employeeId) state.user.employeeId = m[1];

  // Stage machine
  if(state.stage==='start'){
    if(intent==='forgot' || intent==='locked'){
      state.scenario = intent;
      state.stage = 'needEmp';
      addAuditCard('Intent recognised', [
        ['User intent', intent==='forgot'?'Forgot password / reset':'Account locked'],
        ['Decision rule', intent==='forgot'?'R1':'R2'],
        ['Explanation', 'Assistant will guide steps; no actions executed']
      ]);
      addMsg('bot', 'Got it. Please provide your Employee ID (5–8 digits) for eligibility checks (conceptual).');
    } else {
      addMsg('bot', 'Try “reset password” or “account locked”.');
    }
    return;
  }

  if(state.stage==='needEmp'){
    if(state.user.employeeId){
      state.stage = 'needShift';
      addAuditCard('Identity context (concept)', [
        ['Employee ID', state.user.employeeId],
        ['Risk', 'Low (format only)'],
        ['If uncertainty', 'Rule R4: escalate to service desk/security']
      ]);
      addMsg('bot', 'Thanks. Are you currently on a shift where your appraiser may be unavailable? (yes/no)');
    } else {
      addMsg('bot', 'Please type your Employee ID (5–8 digits).');
    }
    return;
  }

  if(state.stage==='needShift'){
    const t = text.toLowerCase();
    state.user.shift = (t.includes('y') || t.includes('yes')) ? 'shift-worker / off-hours' : 'standard hours';

    // Conceptual decision: require approval if shift-worker or if user mentions appraiser
    state.approvalRequired = (state.user.shift !== 'standard hours');

    addAuditCard('Decision point', [
      ['Scenario', state.scenario==='forgot'?'Forgot password':'Account locked'],
      ['Shift context', state.user.shift],
      ['Approval required?', state.approvalRequired ? 'Likely (appraiser approval path)' : 'Not required for standard path'],
      ['Rules applied', state.approvalRequired ? 'R3' : (state.scenario==='forgot'?'R1':'R2')]
    ]);

    if(state.scenario==='locked'){
      addMsg('bot', 'Lockouts often happen after repeated attempts or out-of-sync mobile credentials. I’ll guide the safe recovery steps.');
    }

    if(state.approvalRequired){
      addMsg('bot', 'Based on shift context, approval may be needed. I can prepare an approval request and offer a service desk handoff (concept).');
      addMsg('bot', 'Next: type “prepare approval” or “handoff”.');
      state.stage = 'approvalChoice';
    } else {
      addMsg('bot', 'Next steps (guided):\n1) Use the existing self-service reset option\n2) Complete identity verification steps\n3) Confirm sign-in and mobile credential sync\n\nType “show steps” for detail or “handoff” to create a ticket (simulated).');
      state.stage = 'stepsChoice';
    }
    return;
  }

  if(state.stage==='approvalChoice'){
    const t = text.toLowerCase();
    if(t.includes('prepare')){
      addAuditCard('Approval package (concept)', [
        ['What will be sent', 'Requester info + justification + timestamp'],
        ['Approval owner', 'Appraiser (existing workflow)'],
        ['Audit', 'All messages logged in ServiceNow record (future state)']
      ]);
      addMsg('bot', 'Prepared approval request draft.\n- Subject: Password Reset Approval\n- Requester: ' + state.user.employeeId + '\n- Reason: Access recovery\n- Time: ' + now() + '\n\nType “handoff” to simulate ticket creation.');
    } else if(t.includes('handoff')){
      simulateTicket();
    } else {
      addMsg('bot', 'Type “prepare approval” or “handoff”.');
    }
    return;
  }

  if(state.stage==='stepsChoice'){
    const t = text.toLowerCase();
    if(t.includes('show')){
      addAuditCard('Guided steps (concept)', [
        ['Step 1', 'Confirm reset request channel (portal/chat/mobile)'],
        ['Step 2', 'Perform identity verification (as-is)'],
        ['Step 3', 'Reset password using existing tool'],
        ['Step 4', 'If mobile: re-sync credentials / re-authenticate']
      ]);
      addMsg('bot', 'Detailed steps shown in the Audit Trail panel. Type “handoff” for service desk support.');
    } else if(t.includes('handoff')){
      simulateTicket();
    } else {
      addMsg('bot', 'Type “show steps” or “handoff”.');
    }
    return;
  }

  // Fallback
  addMsg('bot', 'I can guide password reset (concept). Type “reset password” or click Reset Demo.');
}

function simulateTicket(){
  const id = 'INC' + Math.floor(1000000 + Math.random()*9000000);
  addAuditCard('ServiceNow handoff (simulated)', [
    ['Record', id],
    ['Category', 'Account / Password Reset'],
    ['Context', `${state.scenario}; ${state.user.shift}`],
    ['Guardrail', 'Human executes; assistant provides context only']
  ]);
  addMsg('bot', `Created ticket ${id} (simulated). A service desk agent will follow the existing workflow.`);
  state.stage = 'done';
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
  const t = input.value.trim();
  if(!t) return;
  input.value='';
  handleUser(t);
});
input.addEventListener('keydown', (e)=>{
  if(e.key==='Enter') sendBtn.click();
});
resetBtn.addEventListener('click', boot);
modeToggle.addEventListener('change', (e)=>{
  showAgentLanguage = e.target.checked;
  boot();
});
createTicketBtn.addEventListener('click', simulateTicket);
exportBtn.addEventListener('click', exportTranscript);

// Click pills to send
Array.from(document.querySelectorAll('.pill')).forEach(p=>{
  p.addEventListener('click', ()=>{ input.value = p.textContent.replace('Try: ',''); sendBtn.click(); });
});

boot();
