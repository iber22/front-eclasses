// Estado global da aplicação
let state = {
    jogos: [],
    times: [],
    competidores: [],
    confrontos: [],
};

// Configuração de cada tipo de item: funções da API e textos usados na tela.
// (as funções criarX / atualizarX / excluirX vêm de service/api.js)
const ENTIDADES = {
    jogo: {
        colecao: 'jogos',
        rotulo: 'Jogo',
        criar: criarJogo,
        atualizar: atualizarJogo,
        excluir: excluirJogo,
        nome: (j) => j.name,
        aviso: 'Jogos que já têm confrontos cadastrados não podem ser excluídos.',
    },
    time: {
        colecao: 'times',
        rotulo: 'Time',
        criar: criarTime,
        atualizar: atualizarTime,
        excluir: excluirTime,
        nome: (t) => t.name,
        aviso: 'Os competidores deste time ficarão sem time. Times que já têm confrontos cadastrados não podem ser excluídos.',
    },
    competidor: {
        colecao: 'competidores',
        rotulo: 'Competidor',
        criar: criarCompetidor,
        atualizar: atualizarCompetidor,
        excluir: excluirCompetidor,
        nome: (c) => c.nickname,
        aviso: '',
    },
    confronto: {
        colecao: 'confrontos',
        rotulo: 'Confronto',
        criar: criarConfronto,
        atualizar: atualizarConfronto,
        excluir: excluirConfronto,
        nome: (c) => `${nomeTime(c.team1Id)} x ${nomeTime(c.team2Id)}`,
        aviso: '',
    },
};

// --- Utilitários ---

// Escapa HTML: nomes digitados pelo usuário nunca devem virar tags na página.
function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[c]));
}

// Só aceita cores #RRGGBB antes de usar em style="..."
function corSegura(cor) {
    return /^#[0-9a-f]{6}$/i.test(cor) ? cor : '#6366f1';
}

function nomeTime(id) {
    return state.times.find((t) => t.id == id)?.name || '???';
}

// Converte uma data (ISO) para o formato do <input type="datetime-local">,
// usando o fuso do navegador. Sem valor, usa o momento atual.
function dataParaInput(valor) {
    const d = valor ? new Date(valor) : new Date();
    const dois = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

// Mensagem temporária no canto da tela
function mostrarToast(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    toast.textContent = mensagem;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), tipo === 'erro' ? 7000 : 3500);
}

// Faixa de aviso fixa (usada quando a API não responde)
function mostrarAlerta(mensagem) {
    const alerta = document.getElementById('app-alert');
    alerta.innerHTML = `
        <span>${esc(mensagem)}</span>
        <button type="button" class="btn-secondary" onclick="recarregar()">Tentar novamente</button>
    `;
    alerta.hidden = false;
}

function esconderAlerta() {
    document.getElementById('app-alert').hidden = true;
}

// --- Inicialização ---

document.addEventListener('DOMContentLoaded', async () => {
    configurarNavegacao();
    await carregarDados();
    renderizarTudo();
});

// Busca todos os dados via service
async function carregarDados() {
    try {
        const [jogos, times, competidores, confrontos] = await Promise.all([
            getJogos(),
            getTimes(),
            getCompetidores(),
            getConfrontos(),
        ]);

        state.jogos = jogos;
        state.times = times;
        state.competidores = competidores;
        state.confrontos = confrontos;
        esconderAlerta();
        return true;
    } catch (erro) {
        console.error('Erro ao carregar dados:', erro);
        mostrarAlerta(`Não foi possível carregar os dados. ${erro.message}`);
        return false;
    }
}

// Recarrega tudo da API e redesenha a tela
window.recarregar = async function () {
    await carregarDados();
    renderizarTudo();
};

// Configura cliques na navegação lateral
function configurarNavegacao() {
    const itens = document.querySelectorAll('#sidebar-nav li');

    itens.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            trocarView(view);
            itens.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function trocarView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
}

function renderizarTudo() {
    renderizarDashboard();
    renderizarJogos();
    renderizarTimes();
    renderizarCompetidores();
    renderizarConfrontos();
}

// --- Funções de renderização ---

function vazio(mensagem) {
    return `<p class="empty">${esc(mensagem)}</p>`;
}

// Botões de editar / excluir no rodapé de cada card
function botoesAcao(tipo, id, nome) {
    return `
        <div class="card-actions">
            <button type="button" class="btn-icon" onclick="editarItem('${tipo}', ${id})"
                title="Editar" aria-label="Editar ${esc(nome)}"><i class="fas fa-pen"></i></button>
            <button type="button" class="btn-icon btn-icon-danger" onclick="pedirExclusao('${tipo}', ${id})"
                title="Excluir" aria-label="Excluir ${esc(nome)}"><i class="fas fa-trash"></i></button>
        </div>
    `;
}

function renderizarDashboard() {
    const stats = document.getElementById('dashboard-stats');
    const proximos = document.getElementById('upcoming-matches');

    const encerrados = state.confrontos.filter(c => c.status === 'finished').length;
    const agendados = state.confrontos.filter(c => c.status === 'scheduled').length;

    stats.innerHTML = `
        <div class="card">
            <span class="card-tag">Torneio</span>
            <h3>${state.times.length}</h3>
            <p class="subtitle">Equipes</p>
        </div>
        <div class="card">
            <span class="card-tag">Atletas</span>
            <h3>${state.competidores.length}</h3>
            <p class="subtitle">Competidores</p>
        </div>
        <div class="card">
            <span class="card-tag">Encerrados</span>
            <h3>${encerrados}</h3>
            <p class="subtitle">Resultados</p>
        </div>
        <div class="card">
            <span class="card-tag">Pendentes</span>
            <h3>${agendados}</h3>
            <p class="subtitle">Agendamentos</p>
        </div>
    `;

    // Os 3 agendamentos mais próximos, em ordem de data
    const lista = state.confrontos
        .filter(c => c.status === 'scheduled')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);

    proximos.innerHTML = lista.length ? lista.map(c => {
        const jogo = state.jogos.find(j => j.id == c.gameId);
        const time1 = state.times.find(t => t.id == c.team1Id);
        const time2 = state.times.find(t => t.id == c.team2Id);
        return `
            <div class="card">
                <span class="card-tag">${esc(jogo?.name || 'Jogo')}</span>
                <div class="match-card">
                    <div class="team-score"><strong>${esc(time1?.name || 'TBD')}</strong></div>
                    <div class="vs">VS</div>
                    <div class="team-score"><strong>${esc(time2?.name || 'TBD')}</strong></div>
                </div>
            </div>
        `;
    }).join('') : vazio('Nenhum confronto agendado.');
}

function renderizarJogos() {
    const lista = document.getElementById('list-jogos');
    lista.innerHTML = state.jogos.length ? state.jogos.map(j => `
        <div class="card">
            <span class="card-tag">${esc(j.genre)}</span>
            <h3>${esc(j.name)}</h3>
            <p class="subtitle">ID: ${j.id}</p>
            ${botoesAcao('jogo', j.id, j.name)}
        </div>
    `).join('') : vazio('Nenhum jogo cadastrado ainda.');
}

function renderizarTimes() {
    const lista = document.getElementById('list-times');
    lista.innerHTML = state.times.length ? state.times.map(t => `
        <div class="card" style="border-right: 4px solid ${corSegura(t.color)}">
            <span class="card-tag">EQUIPE</span>
            <h3>${esc(t.name)}</h3>
            <p class="subtitle">${state.competidores.filter(c => c.teamId == t.id).length} Jogadores</p>
            ${botoesAcao('time', t.id, t.name)}
        </div>
    `).join('') : vazio('Nenhum time cadastrado ainda.');
}

function renderizarCompetidores() {
    const lista = document.getElementById('list-competidores');
    lista.innerHTML = state.competidores.length ? state.competidores.map(c => {
        const time = state.times.find(t => t.id == c.teamId);
        return `
            <div class="card">
                <span class="card-tag">${esc(time?.name || 'Sem Time')}</span>
                <h3>${esc(c.nickname)}</h3>
                <p class="subtitle">${esc(c.name)}</p>
                ${botoesAcao('competidor', c.id, c.nickname)}
            </div>
        `;
    }).join('') : vazio('Nenhum competidor cadastrado ainda.');
}

function renderizarConfrontos() {
    const lista = document.getElementById('list-confrontos');
    lista.innerHTML = state.confrontos.length ? state.confrontos.map(c => {
        const jogo = state.jogos.find(j => j.id == c.gameId);
        const time1 = state.times.find(t => t.id == c.team1Id);
        const time2 = state.times.find(t => t.id == c.team2Id);
        const data = new Date(c.date).toLocaleString('pt-BR');
        const nome = `${time1?.name || '???'} x ${time2?.name || '???'}`;

        return `
            <div class="card">
                <span class="card-tag">${esc(jogo?.name || 'Jogo')} | ${esc(data)}</span>
                <div class="match-card">
                    <div class="team-score">
                        <strong>${esc(time1?.name || '???')}</strong>
                        <div class="score">${c.score1}</div>
                    </div>
                    <div class="vs">VS</div>
                    <div class="team-score">
                        <strong>${esc(time2?.name || '???')}</strong>
                        <div class="score">${c.score2}</div>
                    </div>
                </div>
                <div style="margin-top: 1rem; text-align: center;">
                    <span class="card-tag" style="background: ${c.status === 'finished' ? '#10b981' : '#f59e0b'}">
                        ${c.status === 'finished' ? 'FINALIZADO' : 'AGENDADO'}
                    </span>
                    ${c.status === 'scheduled'
                        ? `<button type="button" class="btn-small" onclick="encerrarConfrontos(${c.id})">Finalizar</button>`
                        : ''}
                </div>
                ${botoesAcao('confronto', c.id, nome)}
            </div>
        `;
    }).join('') : vazio('Nenhum confronto registrado ainda.');
}

// --- Modal ---

const modal = document.getElementById('modal-container');
const formContent = document.getElementById('form-content');

function abrirModal() {
    modal.classList.add('open');
    // foco no primeiro campo (ou no primeiro botão) para quem usa teclado
    setTimeout(() => formContent.querySelector('input:not([type="hidden"]), select, button')?.focus(), 50);
}

window.fecharModal = function () {
    modal.classList.remove('open');
};

// clicar fora do formulário ou apertar Esc fecha o modal
modal.addEventListener('click', (e) => {
    if (e.target === modal) fecharModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModal();
});

// <option> de uma lista; `selecionado` é o id que deve vir marcado
function opcoes(lista, rotulo, selecionado) {
    return lista
        .map(i => `<option value="${i.id}" ${i.id == selecionado ? 'selected' : ''}>${esc(rotulo(i))}</option>`)
        .join('');
}

// Monta o HTML do formulário. Com `item` é edição (campos preenchidos); sem `item`, criação.
function montarFormulario(tipo, item, finalizar) {
    const editando = Boolean(item);
    const id = editando ? item.id : 'null';
    const titulo = `${editando ? 'Editar' : 'Adicionar'} ${ENTIDADES[tipo].rotulo}`;
    const botaoSalvar = editando ? 'Salvar alterações' : 'Salvar';
    const acoes = `
        <div class="form-actions">
            <button type="submit" class="btn-primary">${botaoSalvar}</button>
            <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
        </div>
    `;
    const abrir = `<h2>${titulo}</h2><form onsubmit="salvarItem(event, '${tipo}', ${id})">`;

    if (tipo === 'jogo') {
        return `${abrir}
            <div class="form-group">
                <label for="f-name">Nome do Jogo</label>
                <input id="f-name" type="text" name="name" required maxlength="100" placeholder="Ex: CS2" value="${esc(item?.name)}">
            </div>
            <div class="form-group">
                <label for="f-genre">Gênero</label>
                <input id="f-genre" type="text" name="genre" required maxlength="50" placeholder="Ex: FPS" value="${esc(item?.genre)}">
            </div>
            ${acoes}
        </form>`;
    }

    if (tipo === 'time') {
        return `${abrir}
            <div class="form-group">
                <label for="f-name">Nome da Equipe</label>
                <input id="f-name" type="text" name="name" required maxlength="100" placeholder="Ex: Ninjas da Noite" value="${esc(item?.name)}">
            </div>
            <div class="form-group">
                <label for="f-color">Cor Identidade</label>
                <input id="f-color" type="color" name="color" value="${corSegura(item?.color || '#6366f1')}">
            </div>
            ${acoes}
        </form>`;
    }

    if (tipo === 'competidor') {
        // Na criação já vem o primeiro time marcado; na edição, o time atual (ou "Sem time")
        const timeSelecionado = editando ? item.teamId : state.times[0]?.id;
        return `${abrir}
            <div class="form-group">
                <label for="f-name">Nome Completo</label>
                <input id="f-name" type="text" name="name" required maxlength="100" value="${esc(item?.name)}">
            </div>
            <div class="form-group">
                <label for="f-nickname">Nickname</label>
                <input id="f-nickname" type="text" name="nickname" required maxlength="50" value="${esc(item?.nickname)}">
            </div>
            <div class="form-group">
                <label for="f-team">Time</label>
                <select id="f-team" name="teamId">
                    <option value="" ${timeSelecionado ? '' : 'selected'}>Sem time</option>
                    ${opcoes(state.times, t => t.name, timeSelecionado)}
                </select>
            </div>
            ${acoes}
        </form>`;
    }

    // confronto
    const time1 = editando ? item.team1Id : state.times[0]?.id;
    const time2 = editando ? item.team2Id : state.times[1]?.id;
    const status = finalizar ? 'finished' : (item?.status || 'scheduled');

    // Placar e status só aparecem ao editar; ao criar, o confronto nasce 0 x 0 e agendado
    const camposResultado = editando ? `
        <div class="form-row">
            <div class="form-group">
                <label for="f-score1">Placar Time A</label>
                <input id="f-score1" type="number" name="score1" min="0" max="999" required value="${item.score1}">
            </div>
            <div class="form-group">
                <label for="f-score2">Placar Time B</label>
                <input id="f-score2" type="number" name="score2" min="0" max="999" required value="${item.score2}">
            </div>
        </div>
        <div class="form-group">
            <label for="f-status">Status</label>
            <select id="f-status" name="status">
                <option value="scheduled" ${status === 'scheduled' ? 'selected' : ''}>Agendado</option>
                <option value="finished" ${status === 'finished' ? 'selected' : ''}>Finalizado</option>
            </select>
        </div>
    ` : `
        <input type="hidden" name="score1" value="0">
        <input type="hidden" name="score2" value="0">
        <input type="hidden" name="status" value="scheduled">
    `;

    return `${abrir}
        <div class="form-group">
            <label for="f-game">Jogo</label>
            <select id="f-game" name="gameId" required>${opcoes(state.jogos, j => j.name, item?.gameId)}</select>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="f-team1">Time A</label>
                <select id="f-team1" name="team1Id" required>${opcoes(state.times, t => t.name, time1)}</select>
            </div>
            <div class="form-group">
                <label for="f-team2">Time B</label>
                <select id="f-team2" name="team2Id" required>${opcoes(state.times, t => t.name, time2)}</select>
            </div>
        </div>
        <div class="form-group">
            <label for="f-date">Data/Hora</label>
            <input id="f-date" type="datetime-local" name="date" required value="${dataParaInput(item?.date)}">
        </div>
        ${camposResultado}
        ${acoes}
    </form>`;
}

// Abre o formulário de criação (item = null) ou de edição (item = objeto existente)
window.abrirFormulario = function (tipo, item = null, finalizar = false) {
    if (tipo === 'confronto' && (state.jogos.length < 1 || state.times.length < 2)) {
        mostrarToast('Cadastre pelo menos 1 jogo e 2 times antes de registrar um confronto.', 'erro');
        return;
    }

    formContent.innerHTML = montarFormulario(tipo, item, finalizar);
    abrirModal();
};

window.editarItem = function (tipo, id, finalizar = false) {
    const item = state[ENTIDADES[tipo].colecao].find(i => i.id == id);
    if (!item) return;
    abrirFormulario(tipo, item, finalizar);
};

// "Finalizar" abre a edição do confronto já com o status "Finalizado"
window.encerrarConfrontos = function (id) {
    editarItem('confronto', id, true);
};

// --- Salvar (POST / PUT) ---

// Lê o formulário e devolve o objeto no formato que a API espera
function lerFormulario(tipo, form) {
    const f = Object.fromEntries(new FormData(form).entries());

    switch (tipo) {
        case 'jogo':
            return { name: f.name.trim(), genre: f.genre.trim() };

        case 'time':
            return { name: f.name.trim(), color: f.color };

        case 'competidor':
            return {
                name: f.name.trim(),
                nickname: f.nickname.trim(),
                teamId: f.teamId ? Number(f.teamId) : null,
            };

        case 'confronto': {
            if (f.team1Id === f.team2Id) {
                throw new Error('Escolha dois times diferentes para o confronto.');
            }
            const data = new Date(f.date);
            if (Number.isNaN(data.getTime())) {
                throw new Error('Informe uma data e hora válidas.');
            }
            return {
                gameId: Number(f.gameId),
                team1Id: Number(f.team1Id),
                team2Id: Number(f.team2Id),
                score1: Number(f.score1),
                score2: Number(f.score2),
                status: f.status,
                // toISOString inclui o fuso: o horário digitado é o do navegador
                date: data.toISOString(),
            };
        }
    }
}

// id = null -> cria (POST); id = número -> atualiza (PUT)
window.salvarItem = async function (event, tipo, id) {
    event.preventDefault();
    const form = event.target;
    const entidade = ENTIDADES[tipo];

    let dados;
    try {
        dados = lerFormulario(tipo, form);
    } catch (erro) {
        mostrarToast(erro.message, 'erro');
        return;
    }

    // evita duplo clique criando o registro duas vezes
    const botao = form.querySelector('button[type="submit"]');
    const textoBotao = botao.textContent;
    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
        if (id) {
            await entidade.atualizar(id, dados);
        } else {
            await entidade.criar(dados);
        }
        fecharModal();
        mostrarToast(`${entidade.rotulo} ${id ? 'atualizado' : 'criado'} com sucesso!`);
        await recarregar();
    } catch (erro) {
        mostrarToast(erro.message, 'erro');
        botao.disabled = false;
        botao.textContent = textoBotao;
    }
};

// --- Excluir (DELETE) ---

window.pedirExclusao = function (tipo, id) {
    const entidade = ENTIDADES[tipo];
    const item = state[entidade.colecao].find(i => i.id == id);
    if (!item) return;

    formContent.innerHTML = `
        <h2>Excluir ${entidade.rotulo}</h2>
        <p class="confirm-text">Tem certeza que deseja excluir <strong>${esc(entidade.nome(item))}</strong>? Esta ação não pode ser desfeita.</p>
        ${entidade.aviso ? `<p class="confirm-aviso">${esc(entidade.aviso)}</p>` : ''}
        <div class="form-actions">
            <button type="button" class="btn-danger" onclick="confirmarExclusao('${tipo}', ${id}, this)">Excluir</button>
            <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
        </div>
    `;
    abrirModal();
};

window.confirmarExclusao = async function (tipo, id, botao) {
    const entidade = ENTIDADES[tipo];
    botao.disabled = true;
    botao.textContent = 'Excluindo...';

    try {
        await entidade.excluir(id);
        mostrarToast(`${entidade.rotulo} excluído com sucesso!`);
    } catch (erro) {
        // ex.: 409 quando o item ainda é usado por confrontos
        mostrarToast(erro.message, 'erro');
    } finally {
        fecharModal();
        await recarregar();
    }
};
