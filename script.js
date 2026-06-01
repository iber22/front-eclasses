const API_URL = 'http://localhost:3000';

let state = {
    competitors: [],
    teams: [],
    games: [],
    matches: []
};

let usuarios = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    await loadUsuarios();
    setupNavigation();
    renderAll();
});

async function loadAllData() {
    try {
        const [gamesRes, teamsRes, competitorsRes, matchesRes] = await Promise.all([
            fetch(`${API_URL}/games`),
            fetch(`${API_URL}/teams`),
            fetch(`${API_URL}/competitors`),
            fetch(`${API_URL}/matches`)
        ]);

        state.games = await gamesRes.json();
        state.teams = await teamsRes.json();
        state.competitors = await competitorsRes.json();
        state.matches = await matchesRes.json();
    } catch (error) {
        console.error("Erro ao carregar dados da API:", error);
    }
}

async function loadUsuarios() {
    try {
        const res = await fetch(`${API_URL}/usuarios`);
        usuarios = await res.json();
    } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        usuarios = [];
    }
}

function renderAll() {
    renderDashboard();
    renderJogos();
    renderTimes();
    renderCompetidores();
    renderConfrontos();
    renderUsuarios();
}

async function saveItem(event, collection) {
    event.preventDefault();
    const formData = new FormData(event.target);
    let newItem = Object.fromEntries(formData.entries());

    if (newItem.teamId) newItem.teamId = Number(newItem.teamId);
    if (newItem.gameId) newItem.gameId = Number(newItem.gameId);
    if (newItem.team1Id) newItem.team1Id = Number(newItem.team1Id);
    if (newItem.team2Id) newItem.team2Id = Number(newItem.team2Id);
    if (newItem.idade) newItem.idade = Number(newItem.idade);

    try {
        const response = await fetch(`${API_URL}/${collection}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        });

        if (!response.ok) throw new Error('Erro ao salvar');

        await loadAllData();
        renderAll();
        closeModal();
    } catch (err) {
        console.error(err);
    }
}

async function finishMatch(id) {
    const match = state.matches.find(m => m.id == id);
    if (!match) return;

    const s1 = prompt(`Placar para ${state.teams.find(t => t.id == match.team1Id)?.name}:`, "0");
    const s2 = prompt(`Placar para ${state.teams.find(t => t.id == match.team2Id)?.name}:`, "0");

    if (s1 === null || s2 === null) return;

    try {
        await fetch(`${API_URL}/matches/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                score1: Number(s1),
                score2: Number(s2),
                status: 'finished'
            })
        });

        await loadAllData();
        renderAll();
    } catch (err) {
        console.error(err);
    }
}

async function saveUsuario(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const novo = Object.fromEntries(formData.entries());

    try {
        await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novo)
        });
        await loadUsuarios();
        renderAll();
        closeModal();
    } catch (err) {
        console.error(err);
    }
}

async function editarUsuario(id) {
    const user = usuarios.find(u => u.id === id);
    if (!user) return;

    const nome = prompt("Novo nome:", user.nome);
    const email = prompt("Novo email:", user.email);
    const nickname = prompt("Novo nickname:", user.nickname || "");
    const idade = prompt("Nova idade:", user.idade || "");

    if (!nome || !email) return;

    try {
        await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nome, 
                email, 
                nickname, 
                idade: idade ? Number(idade) : null 
            })
        });
        await loadUsuarios();
        renderAll();
    } catch (err) {
        console.error(err);
    }
}

async function deletarUsuario(id) {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    try {
        await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
        await loadUsuarios();
        renderAll();
    } catch (err) {
        console.error(err);
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('#sidebar-nav li');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');
            switchView(viewId);
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`view-${viewId}`).classList.add('active');
}

function renderDashboard() {
    const statsContainer = document.getElementById('dashboard-stats');
    const upcomingContainer = document.getElementById('upcoming-matches');
   
    const totalTeams = state.teams.length;
    const totalPlayers = state.competitors.length;
    const finishedMatches = state.matches.filter(m => m.status === 'finished').length;
    const scheduledMatches = state.matches.filter(m => m.status === 'scheduled').length;

    statsContainer.innerHTML = `
        <div class="card">
            <span class="card-tag">Torneio</span>
            <h3>${totalTeams}</h3>
            <p class="subtitle">Equipes</p>
        </div>
        <div class="card">
            <span class="card-tag">Atletas</span>
            <h3>${totalPlayers}</h3>
            <p class="subtitle">Competidores</p>
        </div>
        <div class="card">
            <span class="card-tag">Encerrados</span>
            <h3>${finishedMatches}</h3>
            <p class="subtitle">Resultados</p>
        </div>
        <div class="card">
            <span class="card-tag">Pendentes</span>
            <h3>${scheduledMatches}</h3>
            <p class="subtitle">Agendamentos</p>
        </div>
    `;

    const upcoming = state.matches.filter(m => m.status === 'scheduled').slice(0, 3);
    upcomingContainer.innerHTML = upcoming.map(m => {
        const game = state.games.find(g => g.id == m.gameId);
        const t1 = state.teams.find(t => t.id == m.team1Id);
        const t2 = state.teams.find(t => t.id == m.team2Id);
        return `
            <div class="card">
                <span class="card-tag">${game?.name || 'Jogo'}</span>
                <div class="match-card">
                    <div class="team-score"><strong>${t1?.name || 'TBD'}</strong></div>
                    <div class="vs">VS</div>
                    <div class="team-score"><strong>${t2?.name || 'TBD'}</strong></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderJogos() {
    const list = document.getElementById('list-jogos');
    list.innerHTML = state.games.map(g => `
        <div class="card">
            <span class="card-tag">${g.genre}</span>
            <h3>${g.name}</h3>
            <p class="subtitle">ID: ${g.id}</p>
        </div>
    `).join('');
}

function renderTimes() {
    const list = document.getElementById('list-times');
    list.innerHTML = state.teams.map(t => `
        <div class="card" style="border-right: 4px solid ${t.color}">
            <span class="card-tag">EQUIPE</span>
            <h3>${t.name}</h3>
            <p class="subtitle">${state.competitors.filter(c => c.teamId == t.id).length} Jogadores</p>
        </div>
    `).join('');
}

function renderCompetidores() {
    const list = document.getElementById('list-competidores');
    list.innerHTML = state.competitors.map(c => {
        const team = state.teams.find(t => t.id == c.teamId);
        return `
            <div class="card">
                <span class="card-tag">${team?.name || 'Sem Time'}</span>
                <h3>${c.nickname}</h3>
                <p class="subtitle">${c.name}</p>
            </div>
        `;
    }).join('');
}

function renderConfrontos() {
    const list = document.getElementById('list-confrontos');
    list.innerHTML = state.matches.map(m => {
        const game = state.games.find(g => g.id == m.gameId);
        const t1 = state.teams.find(t => t.id == m.team1Id);
        const t2 = state.teams.find(t => t.id == m.team2Id);
        const dateStr = new Date(m.date).toLocaleString('pt-BR');
       
        return `
            <div class="card">
                <span class="card-tag">${game?.name || 'Jogo'} | ${dateStr}</span>
                <div class="match-card">
                    <div class="team-score">
                        <strong>${t1?.name || '???'}</strong>
                        <div class="score">${m.score1}</div>
                    </div>
                    <div class="vs">VS</div>
                    <div class="team-score">
                        <strong>${t2?.name || '???'}</strong>
                        <div class="score">${m.score2}</div>
                    </div>
                </div>
                <div style="margin-top: 1rem; text-align: center;">
                    <span class="card-tag" style="background: ${m.status === 'finished' ? '#10b981' : '#f59e0b'}">
                        ${m.status === 'finished' ? 'FINALIZADO' : 'AGENDADO'}
                    </span>
                    ${m.status === 'scheduled' ? `<button onclick="finishMatch(${m.id})" style="padding: 4px 8px; font-size: 0.7rem; margin-left: 8px;">Finalizar</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderUsuarios() {
    const container = document.getElementById('list-usuarios');
    if (!container) return;
    container.innerHTML = usuarios.map(u => `
        <div class="card">
            <span class="card-tag">USUÁRIO</span>
            <h3>${u.nickname || u.nome}</h3>
            <p class="subtitle">${u.nome}</p>
            <p><strong>Email:</strong> ${u.email}</p>
            ${u.idade ? `<p><strong>Idade:</strong> ${u.idade} anos</p>` : ''}
            <div style="margin-top: 15px; display: flex; gap: 8px;">
                <button onclick="editarUsuario(${u.id})" style="flex:1; padding:8px 12px;">Editar</button>
                <button onclick="deletarUsuario(${u.id})" style="flex:1; padding:8px 12px; background:#ef4444; color:white;">Excluir</button>
            </div>
        </div>
    `).join('');
}

const modal = document.getElementById('modal-container');
const formContent = document.getElementById('form-content');

function showForm(type) {
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'all';
    }, 10);

    let html = '';
   
    if (type === 'jogo') {
        html = `
            <h2>Adicionar Jogo</h2>
            <form onsubmit="saveItem(event, 'games')">
                <div class="form-group">
                    <label>Nome do Jogo</label>
                    <input type="text" name="name" required placeholder="Ex: CS2">
                </div>
                <div class="form-group">
                    <label>Gênero</label>
                    <input type="text" name="genre" required placeholder="Ex: FPS">
                </div>
                <div style="display:flex; gap: 1rem;">
                    <button type="submit" class="btn-primary">Salvar</button>
                    <button type="button" onclick="closeModal()">Cancelar</button>
                </div>
            </form>
        `;
    } else if (type === 'time') {
        html = `
            <h2>Adicionar Time</h2>
            <form onsubmit="saveItem(event, 'teams')">
                <div class="form-group">
                    <label>Nome da Equipe</label>
                    <input type="text" name="name" required placeholder="Ex: Ninjas da Noite">
                </div>
                <div class="form-group">
                    <label>Cor Identidade</label>
                    <input type="color" name="color" value="#6366f1">
                </div>
                <div style="display:flex; gap: 1rem;">
                    <button type="submit" class="btn-primary">Criar</button>
                    <button type="button" onclick="closeModal()">Cancelar</button>
                </div>
            </form>
        `;
    } else if (type === 'competidor') {
        html = `
            <h2>Registrar Competidor</h2>
            <form onsubmit="saveItem(event, 'competitors')">
                <div class="form-group">
                    <label>Nome Completo</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>Nickname</label>
                    <input type="text" name="nickname" required>
                </div>
                <div class="form-group">
                    <label>Time</label>
                    <select name="teamId" required>
                        ${state.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                </div>
                <div style="display:flex; gap: 1rem;">
                    <button type="submit" class="btn-primary">Registrar</button>
                    <button type="button" onclick="closeModal()">Cancelar</button>
                </div>
            </form>
        `;
    } else if (type === 'confronto') {
        html = `
            <h2>Novo Confronto</h2>
            <form onsubmit="saveItem(event, 'matches')">
                <div class="form-group">
                    <label>Jogo</label>
                    <select name="gameId" required>
                        ${state.games.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                    </select>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Time A</label>
                        <select name="team1Id" required>
                            ${state.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Time B</label>
                        <select name="team2Id" required>
                            ${state.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Data/Hora</label>
                    <input type="datetime-local" name="date" required value="${new Date().toISOString().slice(0,16)}">
                </div>
                <input type="hidden" name="score1" value="0">
                <input type="hidden" name="score2" value="0">
                <input type="hidden" name="status" value="scheduled">
                <div style="display:flex; gap: 1rem;">
                    <button type="submit" class="btn-primary">Agendar</button>
                    <button type="button" onclick="closeModal()">Cancelar</button>
                </div>
            </form>
        `;
    } else if (type === 'usuario') {
        html = `
            <h2>Novo Usuário</h2>
            <form onsubmit="saveUsuario(event)">
                <div class="form-group">
                    <label>Nome Completo</label>
                    <input type="text" name="nome" required placeholder="Ex: Lucas Mendes">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required placeholder="lucas@email.com">
                </div>
                <div class="form-group">
                    <label>Nickname (opcional)</label>
                    <input type="text" name="nickname" placeholder="Ex: Luc4sG4mer">
                </div>
                <div class="form-group">
                    <label>Idade</label>
                    <input type="number" name="idade" placeholder="18">
                </div>
                <div style="display:flex; gap: 1rem;">
                    <button type="submit" class="btn-primary">Cadastrar Usuário</button>
                    <button type="button" onclick="closeModal()">Cancelar</button>
                </div>
            </form>
        `;
    }
   
    formContent.innerHTML = html;
}

function closeModal() {
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}
