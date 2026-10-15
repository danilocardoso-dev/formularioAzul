const loginView = document.querySelector('#login-view');
const dashboardView = document.querySelector('#dashboard-view');
const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
const list = document.querySelector('#cadastros-list');
const emptyState = document.querySelector('#empty-state');
const total = document.querySelector('#total-cadastros');
const search = document.querySelector('#busca');
let registrations = [];

function showLogin() {
  loginView.hidden = false;
  dashboardView.hidden = true;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function render(items) {
  list.replaceChildren();
  emptyState.hidden = items.length > 0;
  items.forEach((registration) => {
    const row = document.createElement('tr');
    [registration.nome, registration.telefone, registration.empresa, formatDate(registration.criadoEm)].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    list.appendChild(row);
  });
}

async function loadRegistrations() {
  const response = await fetch('/api/admin/cadastros');
  if (response.status === 401) {
    showLogin();
    return;
  }
  if (!response.ok) throw new Error('Não foi possível carregar os cadastros.');
  registrations = await response.json();
  total.textContent = registrations.length;
  render(registrations);
  showDashboard();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = '';
  const button = loginForm.querySelector('button');
  button.disabled = true;

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(loginForm)))
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Acesso não autorizado.');
    loginForm.reset();
    await loadRegistrations();
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.className = 'message message--error';
  } finally {
    button.disabled = false;
  }
});

search.addEventListener('input', () => {
  const query = search.value.trim().toLocaleLowerCase('pt-BR');
  const filtered = registrations.filter((item) =>
    [item.nome, item.telefone, item.empresa].some((value) => value.toLocaleLowerCase('pt-BR').includes(query))
  );
  render(filtered);
});

document.querySelector('#refresh-button').addEventListener('click', () => loadRegistrations().catch(alert));
document.querySelector('#logout-button').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

loadRegistrations().catch(() => showLogin());
