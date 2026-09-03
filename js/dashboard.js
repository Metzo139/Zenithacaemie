const projectLabels = {
  etudes: 'Études uniquement',
  football: 'Football uniquement',
  both: 'Études + Football',
  'Non renseigné': 'Non renseigné',
};

const sourceLabels = {
  'Recommandation / Bouche-à-oreille': 'Recommandation',
  'Événement / Détection': 'Événement',
  Facebook: 'Facebook',
  Instagram: 'Instagram',
  TikTok: 'TikTok',
  'Non renseigné': 'Non renseigné',
};

const statusMessage = document.getElementById('statusMessage');
const authPanel = document.getElementById('authPanel');
const authForm = document.getElementById('authForm');
const authMessage = document.getElementById('authMessage');
let supabaseClient;
let exportRows = [];

const exportColumns = [
  ['created_at', 'Date de candidature'], ['nom', 'Nom'], ['prenom', 'Prénom(s)'], ['naissance', 'Date de naissance'],
  ['sexe', 'Sexe'], ['adresse', 'Adresse'], ['tel_parent', 'Téléphone parent'], ['whatsapp', 'WhatsApp'],
  ['scolarise', 'Scolarisé'], ['etablissement', 'Établissement'], ['classe_actuelle', 'Classe actuelle'], ['classe_visee', 'Classe visée'],
  ['projet', 'Projet'], ['a_bulletins', 'A des bulletins'], ['bulletins_file', 'Bulletins joints'], ['autre_doc_file', 'Autre document'],
  ['interesse_foot', 'Intéressé football'], ['poste', 'Poste'], ['deja_club', 'Déjà en club'], ['nom_club', 'Club / école'],
  ['anciennete', 'Ancienneté'], ['objectifs', 'Objectifs'], ['connu_par', 'Connu par'], ['connu_par_autre', 'Autre source'],
  ['message_libre', 'Message'], ['resp_nom_prenom', 'Responsable légal'], ['lien_eleve', 'Lien avec l’élève'], ['resp_tel', 'Téléphone responsable'],
  ['resp_whatsapp', 'WhatsApp responsable'], ['certifie', 'Informations exactes'], ['auto_contact', 'Autorise le contact'],
  ['conditions_accorde', 'Conditions acceptées'], ['auto_image', 'Autorisation image'], ['donnees_accorde', 'Données personnelles'],
];

function formatProject(value) {
  return projectLabels[value] || value;
}

function drawBars(elementId, values, formatLabel = value => value) {
  const element = document.getElementById(elementId);
  const entries = Object.entries(values || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    element.innerHTML = '<p class="empty-state">Aucune donnée pour le moment.</p>';
    return;
  }
  const maximum = Math.max(...entries.map(([, total]) => total));
  element.innerHTML = entries.map(([label, total]) => `
    <div class="bar-row">
      <span class="bar-label" title="${label}">${formatLabel(label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(total / maximum) * 100}%"></span></span>
      <span class="bar-value">${total}</span>
    </div>
  `).join('');
}

function renderRecent(rows) {
  const table = document.getElementById('recentTable');
  if (!rows?.length) {
    table.innerHTML = '<tr><td colspan="5" class="empty-state">Aucune candidature pour le moment.</td></tr>';
    return;
  }
  table.innerHTML = rows.map(row => `
    <tr>
      <td><strong>${row.prenom || ''} ${row.nom || 'Candidat'}</strong></td>
      <td>${formatProject(row.projet || 'Non renseigné')}</td>
      <td>${sourceLabels[row.connu_par] || row.connu_par || 'Non renseigné'}</td>
      <td>${row.classe_visee || '—'}</td>
      <td>${new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
    </tr>
  `).join('');
}

function csvValue(value) {
  const normalized = Array.isArray(value) ? value.join(', ') : value ?? '';
  return `"${String(normalized).replace(/"/g, '""')}"`;
}

function exportCsv() {
  if (!exportRows.length) {
    statusMessage.textContent = 'Aucune candidature à exporter.';
    return;
  }
  const header = exportColumns.map(([, label]) => csvValue(label)).join(';');
  const lines = exportRows.map(row => exportColumns.map(([key]) => csvValue(row[key])).join(';'));
  const csv = `\uFEFF${[header, ...lines].join('\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `candidatures-zenith-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  statusMessage.textContent = `${exportRows.length} candidature(s) exportée(s).`;
}

async function loadDashboard() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  statusMessage.textContent = '';
  document.getElementById('refreshButton').disabled = true;
  try {
    const response = await fetch('/api/dashboard', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const result = await response.json();
    if (response.status === 401) throw new Error('Session invalide. Reconnecte-toi.');
    if (!response.ok) throw new Error(result.error || 'Erreur de chargement');
    exportRows = result.exportRows || [];

    document.getElementById('totalKpi').textContent = result.total;
    document.getElementById('studiesKpi').textContent = result.projects?.etudes || 0;
    document.getElementById('bothKpi').textContent = result.projects?.both || 0;
    document.getElementById('footballKpi').textContent = result.projects?.football || 0;
    document.getElementById('bulletinsKpi').textContent = result.documents?.bulletins || 0;
    document.getElementById('otherDocsKpi').textContent = result.documents?.autres || 0;
    drawBars('projectsChart', result.projects, formatProject);
    drawBars('sourcesChart', result.sources, value => sourceLabels[value] || value);
    drawBars('monthsChart', result.months);
    renderRecent(result.recent);
  } catch (error) {
    statusMessage.textContent = error.message;
  } finally {
    document.getElementById('refreshButton').disabled = false;
  }
}

document.getElementById('refreshButton').addEventListener('click', loadDashboard);
document.getElementById('exportButton').addEventListener('click', exportCsv);

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  authMessage.textContent = 'Connexion...';
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById('authEmail').value,
    password: document.getElementById('authPassword').value,
  });
  if (error) { authMessage.textContent = error.message; return; }
  authMessage.textContent = '';
  authPanel.hidden = true;
  document.querySelector('.dashboard-shell').hidden = false;
  loadDashboard();
});

async function initialize(){
  const response = await fetch('/api/config');
  if (!response.ok) {
    throw new Error('Le dashboard doit être ouvert depuis le site déployé, pas depuis un fichier local.');
  }
  const config = await response.json();
  if (!config.url || !config.anonKey) {
    throw new Error('Configuration Supabase manquante.');
  }
  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  const { data: { session } } = await supabaseClient.auth.getSession();
  authPanel.hidden = Boolean(session);
  document.querySelector('.dashboard-shell').hidden = !session;
  if (session) loadDashboard();
}

initialize().catch(error => { authMessage.textContent = error.message; });
