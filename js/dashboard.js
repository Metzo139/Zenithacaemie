const projectLabels = {
  etudes: 'Études uniquement',
  football: 'Football uniquement',
  both: 'Études + Football',
  'Non renseigné': 'Non renseigné',
};

const sourceLabels = {
  'Recommandation / Bouche-à-oreille': 'Recommandation',
  'Événement / Détection': 'Événement',
  'Non renseigné': 'Non renseigné',
};

const tokenKey = 'zenith_dashboard_token';
const statusMessage = document.getElementById('statusMessage');

function getToken() {
  let token = sessionStorage.getItem(tokenKey);
  if (!token) {
    token = window.prompt('Entrez le token administrateur du tableau de bord :');
    if (token) sessionStorage.setItem(tokenKey, token.trim());
  }
  return token;
}

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

async function loadDashboard() {
  const token = getToken();
  if (!token) return;
  statusMessage.textContent = '';
  document.getElementById('refreshButton').disabled = true;
  try {
    const response = await fetch('/api/dashboard', { headers: { 'x-dashboard-token': token } });
    const result = await response.json();
    if (response.status === 401) {
      sessionStorage.removeItem(tokenKey);
      throw new Error('Token invalide. Recharge la page pour réessayer.');
    }
    if (!response.ok) throw new Error(result.error || 'Erreur de chargement');

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
loadDashboard();
