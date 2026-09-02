/* ============ CONFIG ============ */
const ACADEMY_PHONE = '221781171818'; // à remplacer par le vrai numéro WhatsApp de l'académie

const STEPS = [
  { id:'identification', label:'Identification' },
  { id:'scolaire', label:'Situation scolaire' },
  { id:'projet', label:'Ton projet' },
  { id:'dossier', label:'Dossier scolaire', visible: fd => fd.projet === 'etudes' || fd.projet === 'both' },
  { id:'football', label:'Football', visible: fd => fd.projet === 'football' || fd.projet === 'both' },
  { id:'complementaire', label:'Complément' },
  { id:'responsable', label:'Responsable légal' },
  { id:'autorisation', label:'Autorisation' },
  { id:'consentement', label:'Consentement' },
  { id:'recap', label:'Récapitulatif' },
];

let formData = { _projetBothRedirected: false };
let fileNames = {};
let currentIndex = 0;

function visibleSteps(){
  return STEPS.filter(s => !s.visible || s.visible(formData));
}

/* ============ FIELD BINDING ============ */
document.querySelectorAll('input[type="text"], input[type="date"], input[type="tel"], textarea, select').forEach(el=>{
  const key = el.dataset.field;
  if(!key) return;
  el.addEventListener('input', ()=>{ formData[key] = el.value; clearFieldError(el); });
});

document.querySelectorAll('.choice-row[data-field], .project-cards[data-field]').forEach(group=>{
  const key = group.dataset.field;
  group.querySelectorAll('input[type=radio]').forEach(radio=>{
    radio.addEventListener('change', ()=>{
      formData[key] = radio.value;
      clearFieldError(group);
      if(key === 'projet'){
        renderRail();
        formData._projetBothRedirected = false;
      }
      if(key === 'connuPar'){ toggleAutrePreciser(); }
    });
  });
});

document.querySelectorAll('.chip-grid[data-field]').forEach(group=>{
  const key = group.dataset.field;
  formData[key] = [];
  group.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      formData[key] = Array.from(group.querySelectorAll('input:checked')).map(i=>i.value);
    });
  });
});

document.querySelectorAll('.check-row input[type=checkbox][data-field]').forEach(cb=>{
  cb.addEventListener('change', ()=>{ formData[cb.dataset.field] = cb.checked; clearFieldError(cb); });
});

document.querySelectorAll('.dropzone').forEach(zone=>{
  const input = zone.querySelector('input[type=file]');
  const key = input.dataset.field;
  zone.addEventListener('click', ()=> input.click());
  input.addEventListener('change', ()=>{
    if(input.files && input.files[0]){
      fileNames[key] = input.files[0].name;
      formData[key] = input.files[0].name;
      zone.classList.add('has-file');
      zone.querySelector('.dropzone-filename').textContent = '✓ ' + input.files[0].name;
      clearFieldError(zone);
    }
  });
});

function toggleAutrePreciser(){
  const wrap = document.getElementById('autrePreciserWrap');
  wrap.classList.toggle('show', formData.connuPar === 'Autre');
}

function updateClasseViseeVisibility(){
  const isScolarise = formData.scolarise === 'Oui';
  const wrapper = document.getElementById('classeViseeWrapper');
  if (wrapper) {
    wrapper.style.display = isScolarise ? 'block' : 'none';
    if (!isScolarise) {
      formData.classeVisee = '';
      const input = document.querySelector('[data-field="classeVisee"]');
      if (input) input.value = '';
    }
  }
}

document.querySelectorAll('.choice-row[data-field="scolarise"] input').forEach(r=>{
  r.addEventListener('change', ()=>{
    const isScolarise = formData.scolarise === 'Oui';
    ['etabReqTag','classeActReqTag'].forEach(id=>{
      const tag = document.getElementById(id);
      tag.textContent = isScolarise ? '*' : 'optionnel';
      tag.className = isScolarise ? 'req' : 'opt';
    });
    updateClasseViseeVisibility();
    // Auto-advance to projet step if user selects "Non"
    if (formData.scolarise === 'Non') {
      // Validate the scolaire step (should be valid as only scolarise is required)
      if (validateStep('scolaire')) {
        const steps = visibleSteps();
        const currentIdx = steps.findIndex(s => s.id === 'scolaire');
        if (currentIdx >= 0 && currentIdx < steps.length - 1) {
          currentIndex = currentIdx + 1;
          showScreen(steps[currentIndex].id);
        }
      }
    }
  });
});

/* Bulletins: required only if user has them (aBulletins === 'Oui') */
document.querySelectorAll('.choice-row[data-field="aBulletins"] input').forEach(r=>{
  r.addEventListener('change', ()=>{
    const tag = document.getElementById('bulletinsReqTag');
    tag.style.display = formData.aBulletins === 'Oui' ? 'inline' : 'none';
  });
});

function clearFieldError(el){
  const group = el.closest('.field-group') || el.closest('.screen');
  const msg = (el.parentElement.querySelector('.error-msg')) || (group && group.querySelector('.error-msg'));
  if(msg) msg.classList.remove('show');
  el.classList && el.classList.remove('field-error');
}

/* ============ VALIDATION ============ */
function showError(container){
  const msg = container.parentElement ? container.parentElement.querySelector('.error-msg') : null;
  if(msg) msg.classList.add('show');
  else {
    const fg = container.closest('.field-group');
    if(fg) fg.querySelector('.error-msg')?.classList.add('show');
  }
}

function validateStep(stepId){
  let ok = true;
  const screen = document.querySelector(`.screen[data-screen="${stepId}"]`);

  function req(key, type){
    if(type==='text'){
      const input = screen.querySelector(`[data-field="${key}"]`);
      if(!formData[key] || !formData[key].trim()){ input.classList.add('field-error'); showError(input); ok = false; }
    } else if(type==='choice'){
      const group = screen.querySelector(`[data-field="${key}"]`);
      if(!formData[key]){ group.parentElement.querySelector('.error-msg')?.classList.add('show'); ok = false; }
    } else if(type==='check'){
      const input = screen.querySelector(`[data-field="${key}"]`);
      if(!formData[key]){ ok = false; input.closest('.field-group').querySelector('.error-msg')?.classList.add('show'); }
    } else if(type==='file'){
      const zone = screen.querySelector(`[data-dropzone="${key}"]`);
      if(!formData[key]){ zone.parentElement.querySelector('.error-msg')?.classList.add('show'); ok = false; }
    }
  }

  if(stepId === 'identification'){
    req('nom','text'); req('prenom','text'); req('naissance','text'); req('sexe','choice');
    req('adresse','text'); req('telParent','text');
  }
  if(stepId === 'scolaire'){
    req('scolarise','choice');
    if(formData.scolarise === 'Oui'){
      req('etablissement','text'); req('classeActuelle','text'); req('classeVisee','text');
    }
  }
  if(stepId === 'projet'){
    req('projet','choice');
  }
  if(stepId === 'dossier'){
    req('aBulletins','choice');
    if(formData.aBulletins === 'Oui') req('bulletinsFile','file');
  }
  if(stepId === 'football'){
    req('interesseFoot','choice'); req('poste','choice'); req('dejaClub','choice');
  }
  if(stepId === 'complementaire'){
    req('connuPar','choice');
  }
  if(stepId === 'responsable'){
    req('respNomPrenom','text'); req('respTel','text');
  }
  if(stepId === 'autorisation'){
    req('certifie','check'); req('autoContact','check');
  }
  if(stepId === 'consentement'){
    req('conditionsAccorde','check'); req('autoImage','choice'); req('donneesAccorde','check');
  }
  return ok;
}

/* ============ NAVIGATION ============ */
function currentStepId(){ return visibleSteps()[currentIndex].id; }

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=> s.classList.toggle('active', s.dataset.screen === id));
  const nav = document.getElementById('navButtons');
  nav.style.display = (id === 'success') ? 'none' : 'flex';
  const btnNext = document.getElementById('btnNext');
  const btnPrev = document.getElementById('btnPrev');
  btnPrev.style.visibility = (currentIndex === 0) ? 'hidden' : 'visible';
  btnNext.textContent = (id === 'recap') ? 'Envoyer le dossier →' : 'Suivant →';
  btnNext.className = 'btn ' + (id === 'recap' ? 'btn-submit' : 'btn-next');
  window.scrollTo({top:0, behavior:'smooth'});
  renderRail(id);
  updateMobileBar(id);
  if(id === 'recap') renderRecap();
}

document.getElementById('btnNext').addEventListener('click', ()=>{
  const steps = visibleSteps();
  const id = steps[currentIndex].id;

  if(id === 'recap'){
    submitForm();
    return;
  }

  // Special handling: if current step is projet and projet is both and we haven't redirected yet
  if (id === 'projet' && formData.projet === 'both' && !formData._projetBothRedirected) {
    if (validateStep('projet')) {
      // Mark that we have redirected
      formData._projetBothRedirected = true;
      const scolIdx = steps.findIndex(s => s.id === 'scolaire');
      if (scolIdx >= 0) {
        currentIndex = scolIdx;
        showScreen(steps[currentIndex].id);
        return;
      }
    }
  }

  if(!validateStep(id)) return;

  if(currentIndex < steps.length - 1){
    currentIndex++;
    showScreen(steps[currentIndex].id);
  }
});

document.getElementById('btnPrev').addEventListener('click', ()=>{
  if(currentIndex > 0){
    currentIndex--;
    showScreen(visibleSteps()[currentIndex].id);
  }
});

/* ============ RAIL ============ */
function renderRail(activeId){
  const steps = visibleSteps();
  const currentId = activeId === 'success' ? '__done__' : (activeId || steps[Math.min(currentIndex, steps.length-1)].id);
  const railEl = document.getElementById('railSteps');
  railEl.innerHTML = steps.map((s,i)=>{
    let cls;
    if(currentId === '__done__') cls = 'done';
    else cls = s.id === currentId ? 'current' : (i < currentIndex ? 'done' : '');
    return `<div class="step-row ${cls}"><div class="stamp"><span>${i+1}</span></div><div class="step-label">${s.label}</div></div>`;
  }).join('');
}

function updateMobileBar(activeId){
  const steps = visibleSteps();
  if(activeId === 'success'){
    document.getElementById('mobileStepLabel').textContent = `Terminé`;
    document.getElementById('mobileProgressFill').style.width = `100%`;
    return;
  }
  const idx = Math.min(currentIndex, steps.length-1);
  document.getElementById('mobileStepLabel').textContent = `Étape ${idx+1}/${steps.length}`;
  document.getElementById('mobileProgressFill').style.width = `${((idx+1)/steps.length)*100}%`;
}

/* ============ RECAP ============ */
function renderRecap(){
  const el = document.getElementById('recapContent');
  const sections = [
    { title:'Identification', step:'identification', rows:[
      ['Nom', formData.nom], ['Prénom(s)', formData.prenom], ['Date de naissance', formData.naissance],
      ['Sexe', formData.sexe], ['Adresse', formData.adresse], ['Téléphone parent', formData.telParent],
      ['WhatsApp', formData.whatsapp],
    ]},
    { title:'Situation scolaire', step:'scolaire', rows:[
      ['Scolarisé', formData.scolarise], ['Établissement', formData.etablissement],
      ['Classe actuelle', formData.classeActuelle], ['Classe visée', formData.classeVisee],
    ]},
    { title:'Projet', step:'projet', rows:[
      ['Choix', formData.projet === 'etudes' ? 'Études uniquement' : formData.projet === 'football' ? 'Football uniquement' : 'Études + Football'],
    ]},
  ];
  if(formData.projet === 'etudes' || formData.projet === 'both'){
    sections.push({ title:'Dossier scolaire', step:'dossier', rows:[
      ['A ses bulletins', formData.aBulletins], ['Bulletins joints', formData.bulletinsFile || '—'],
      ['Autre document', formData.autreDocFile || '—'],
    ]});
  }
  if(formData.projet === 'football' || formData.projet === 'both'){
    sections.push({ title:'Football', step:'football', rows:[
      ['Intéressé', formData.interesseFoot], ['Poste', formData.poste], ['Déjà en club', formData.dejaClub],
      ['Club / école', formData.nomClub || '—'], ['Ancienneté', formData.anciennete || '—'],
      ['Objectifs', (formData.objectifs||[]).join(', ') || '—'],
    ]});
  }
  sections.push({ title:'Complémentaire', step:'complementaire', rows:[
    ['Connu par', formData.connuPar === 'Autre' ? `Autre — ${formData.connuParAutre||''}` : formData.connuPar],
    ['Message', formData.messageLibre || '—'],
  ]});
  sections.push({ title:'Responsable légal', step:'responsable', rows:[
    ['Nom', formData.respNomPrenom], ['Lien', formData.lienEleve || '—'],
    ['Téléphone', formData.respTel], ['WhatsApp', formData.respWhatsapp || '—'],
  ]});
  sections.push({ title:'Autorisations', step:'autorisation', rows:[
    ['Informations exactes', formData.certifie ? 'Oui' : 'Non'],
    ['Autorise le contact', formData.autoContact ? 'Oui' : 'Non'],
  ]});
  sections.push({ title:'Consentement', step:'consentement', rows:[
    ['Conditions acceptées', formData.conditionsAccorde ? 'Oui' : 'Non'],
    ['Autorisation image', formData.autoImage],
    ['Données personnelles', formData.donneesAccorde ? 'Oui' : 'Non'],
  ]});

  el.innerHTML = sections.map(sec => `
    <div class="recap-section">
      <div class="recap-section-head">
        <h3>${sec.title}</h3>
        <button class="recap-edit" data-jump="${sec.step}">Modifier</button>
      </div>
      ${sec.rows.map(r => `<div class="recap-row"><span class="k">${r[0]}</span><span class="v">${r[1] || '—'}</span></div>`).join('')}
    </div>
  `).join('');

  el.querySelectorAll('.recap-edit').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const steps = visibleSteps();
      const idx = steps.findIndex(s => s.id === btn.dataset.jump);
      if(idx >= 0){ currentIndex = idx; showScreen(steps[idx].id); }
    });
  });
}

/* ============ SUBMIT ============ */
function buildWhatsAppMessage(){
  const lines = [];
  lines.push(`🎓⚽ PRÉINSCRIPTION ZÉNITH ACADÉMIE GUEZ`);
  lines.push(``);
  lines.push(`Candidat : ${formData.prenom||''} ${formData.nom||''}`);
  lines.push(`Né(e) le : ${formData.naissance||''} — ${formData.sexe||''}`);
  lines.push(`Adresse : ${formData.adresse||''}`);
  lines.push(`Tél : ${formData.telParent||''}`);
  lines.push(``);
  lines.push(`Projet : ${formData.projet === 'etudes' ? 'Études uniquement' : formData.projet === 'football' ? 'Football uniquement' : 'Études + Football'}`);
  lines.push(`Classe visée : ${formData.classeVisee||''}`);
  if(formData.projet === 'etudes' || formData.projet === 'both'){
    lines.push(`Bulletins : ${formData.bulletinsFile ? formData.bulletinsFile + ' (à transmettre en pièce jointe ici)' : 'non fournis'}`);
  }
  if(formData.projet === 'football' || formData.projet === 'both'){
    lines.push(`Poste : ${formData.poste||''} — Club actuel : ${formData.nomClub||'aucun'}`);
  }
  lines.push(``);
  lines.push(`Responsable légal : ${formData.respNomPrenom||''} (${formData.respTel||''})`);
  lines.push(``);
  lines.push(`Conditions acceptées : ${formData.conditionsAccorde ? 'Oui' : 'Non'}`);
  lines.push(`Autorisation image : ${formData.autoImage||''}`);
  lines.push(`Données personnelles : ${formData.donneesAccorde ? 'Oui' : 'Non'}`);
  lines.push(``);
  lines.push(`— Envoyé depuis le formulaire en ligne Zénith Académie —`);
  return lines.join('\n');
}

function submitForm(){
  const msg = buildWhatsAppMessage();
  const link = `https://wa.me/${ACADEMY_PHONE}?text=${encodeURIComponent(msg)}`;
  document.getElementById('waSendBtn').href = link;
  currentIndex = visibleSteps().length; // past recap
  showScreen('success');
}

/* ============ INIT ============ */
toggleAutrePreciser();
showScreen('identification');