/* ============ CONFIG ============ */
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
let selectedFiles = {};
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
      selectedFiles[key] = input.files[0];
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
let logoDataUrl;

async function getLogoDataUrl(){
  if(logoDataUrl) return logoDataUrl;
  const response = await fetch('assets/logo.png');
  if(!response.ok) throw new Error('Le logo Zénith est indisponible.');
  const blob = await response.blob();
  logoDataUrl = await new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return logoDataUrl;
}

async function buildPdf(){
  const jsPdf = window.jspdf?.jsPDF;
  if(!jsPdf) throw new Error('Le générateur PDF est indisponible.');

  const logo = await getLogoDataUrl();
  const pdf = new jsPdf();
  const margin = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const brandGreen = [115, 211, 44];
  const dark = [20, 24, 19];
  const muted = [103, 112, 105];
  let y = 18;
  const projectLabel = formData.projet === 'etudes' ? 'Études uniquement' : formData.projet === 'football' ? 'Football uniquement' : 'Études + Football';
  const sections = [
    { title:'Identification', rows:[
      ['Nom', formData.nom], ['Prénom(s)', formData.prenom], ['Date de naissance', formData.naissance],
      ['Sexe', formData.sexe], ['Adresse', formData.adresse], ['Téléphone parent', formData.telParent], ['WhatsApp', formData.whatsapp],
    ]},
    { title:'Situation scolaire', rows:[
      ['Scolarisé', formData.scolarise], ['Établissement', formData.etablissement], ['Classe actuelle', formData.classeActuelle], ['Classe visée', formData.classeVisee],
    ]},
    { title:'Projet choisi', rows:[['Parcours', projectLabel]] },
  ];
  if(formData.projet === 'etudes' || formData.projet === 'both') sections.push({ title:'Dossier scolaire', rows:[
    ['A ses bulletins', formData.aBulletins], ['Bulletins joints', formData.bulletinsFile], ['Autre document', formData.autreDocFile],
  ]});
  if(formData.projet === 'football' || formData.projet === 'both') sections.push({ title:'Football', rows:[
    ['Intéressé', formData.interesseFoot], ['Poste', formData.poste], ['Déjà en club', formData.dejaClub], ['Club / école', formData.nomClub],
    ['Ancienneté', formData.anciennete], ['Objectifs', (formData.objectifs || []).join(', ')],
  ]});
  sections.push(
    { title:'Complémentaire', rows:[['Connu par', formData.connuPar === 'Autre' ? `Autre — ${formData.connuParAutre || ''}` : formData.connuPar], ['Message', formData.messageLibre]] },
    { title:'Responsable légal', rows:[['Nom', formData.respNomPrenom], ['Lien', formData.lienEleve], ['Téléphone', formData.respTel], ['WhatsApp', formData.respWhatsapp]] },
    { title:'Autorisations et consentement', rows:[['Informations exactes', formData.certifie ? 'Oui' : 'Non'], ['Autorise le contact', formData.autoContact ? 'Oui' : 'Non'], ['Conditions acceptées', formData.conditionsAccorde ? 'Oui' : 'Non'], ['Autorisation image', formData.autoImage], ['Données personnelles', formData.donneesAccorde ? 'Oui' : 'Non']] },
  );

  const addFooter = () => {
    pdf.setDrawColor(225, 230, 223);
    pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text('Zénith Académie Guez  •  Dossier de préinscription', margin, pageHeight - 8);
    pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align:'right' });
  };
  const addHeader = () => {
    pdf.setFillColor(...dark);
    pdf.rect(0, 0, pageWidth, 38, 'F');
    pdf.setFillColor(...brandGreen);
    pdf.rect(0, 0, 7, 38, 'F');
    pdf.addImage(logo, 'PNG', margin, 7, 31, 22);
    pdf.setFontSize(13);
    pdf.text('ZÉNITH ACADÉMIE GUEZ', pageWidth / 2, 14, { align:'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(190, 201, 188);
    pdf.text('DOSSIER DE PRÉINSCRIPTION', pageWidth / 2, 23, { align:'center' });
    pdf.text(new Date().toLocaleDateString('fr-FR'), pageWidth - margin, 17, { align:'right' });
    y = 51;
  };
  const ensureSpace = height => {
    if(y + height > pageHeight - 23){ addFooter(); pdf.addPage(); addHeader(); }
  };

  addHeader();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...dark);
  pdf.text('Récapitulatif de candidature', margin, y);
  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...muted);
  pdf.text('Merci pour ton intérêt pour notre académie.', margin, y);
  y += 10;
  pdf.setFillColor(235, 249, 226);
  pdf.roundedRect(margin, y, contentWidth, 15, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(55, 114, 32);
  pdf.text(`Parcours sélectionné : ${projectLabel}`, margin + 7, y + 9.5);
  y += 25;

  sections.forEach(section => {
    const rowsHeight = section.rows.reduce((height, [, value]) => {
      const lines = pdf.splitTextToSize(String(value || '—'), contentWidth - 72);
      return height + Math.max(9, lines.length * 4.5 + 5);
    }, 0);
    ensureSpace(rowsHeight + 16);
    pdf.setFillColor(...brandGreen);
    pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(section.title, margin + 5, y + 5.5);
    y += 13;
    section.rows.forEach(([label, value]) => {
      const lines = pdf.splitTextToSize(String(value || '—'), contentWidth - 72);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text(label.toUpperCase(), margin + 3, y + 3.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...dark);
      pdf.text(lines, margin + 69, y + 3.5);
      y += Math.max(9, lines.length * 4.5 + 5);
    });
    y += 5;
  });
  addFooter();

  return pdf.output('blob');
}

async function sendPdfToWhatsApp(){
  const pdfBlob = await buildPdf();
  const pdfFile = new File([pdfBlob], 'preinscription-zenith.pdf', { type: 'application/pdf' });
  const whatsappNumber = '221781171818';
  const message = 'Bonjour, voici le récapitulatif PDF de ma préinscription à Zénith Académie Guez.';

  if (navigator.canShare?.({ files: [pdfFile] })) {
    await navigator.share({ files: [pdfFile], text: message });
    return;
  }

  const downloadUrl = URL.createObjectURL(pdfBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = pdfFile.name;
  downloadLink.click();
  URL.revokeObjectURL(downloadUrl);
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
}

async function submitForm(){
  const submitButton = document.getElementById('btnNext');
  submitButton.disabled = true;
  submitButton.textContent = 'Enregistrement...';
  try {
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value])=>{
      if(key === '_projetBothRedirected') return;
      payload.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''));
    });
    Object.entries(selectedFiles).forEach(([key, file])=> payload.append(key, file, file.name));

    const response = await fetch('/api/submit', {
      method: 'POST',
      body: payload,
    });
    const result = await response.json();
    if(!response.ok) throw new Error(result.error || 'Impossible d’enregistrer le dossier.');

    const downloadButton = document.getElementById('downloadPdfBtn');
    downloadButton.onclick = async event => {
      event.preventDefault();
      try {
        const pdfBlob = await buildPdf();
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const temporaryLink = document.createElement('a');
        temporaryLink.href = downloadUrl;
        temporaryLink.download = 'preinscription-zenith.pdf';
        temporaryLink.click();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      } catch(err) { alert(err.message); }
    };
    const whatsappButton = document.getElementById('whatsappPdfBtn');
    whatsappButton.onclick = async event => {
      event.preventDefault();
      try { await sendPdfToWhatsApp(); } catch(err) {
        if (err.name !== 'AbortError') alert(err.message);
      }
    };
    currentIndex = visibleSteps().length;
    showScreen('success');
  } catch(err) {
    console.error('Submission error:', err);
    alert(`Erreur lors de l’enregistrement : ${err.message}`);
    submitButton.disabled = false;
    submitButton.textContent = 'Envoyer le dossier →';
  }
}

/* ============ INIT ============ */
toggleAutrePreciser();
showScreen('identification');