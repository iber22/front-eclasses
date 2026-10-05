// Camada de acesso à API (api-eclasses).
//
// Para publicar o projeto, troque a URL abaixo pela URL da sua API no ar
// (ex.: 'https://minha-api.onrender.com/api').
const BASE_URL = 'http://localhost:3000/api';

// Erro com a mensagem vinda da API (ou de conexão), pronto para mostrar ao usuário.
class ApiError extends Error {
    constructor(mensagem, status = 0, codigo = null) {
        super(mensagem);
        this.status = status;
        this.codigo = codigo;
    }
}

// Faz a requisição, desembrulha o formato { status, data } da API
// e transforma qualquer falha em ApiError.
async function _request(metodo, caminho, corpo) {
    const opcoes = { method: metodo };

    if (corpo !== undefined) {
        opcoes.headers = { 'Content-Type': 'application/json' };
        opcoes.body = JSON.stringify(corpo);
    }

    let resposta;
    try {
        resposta = await fetch(`${BASE_URL}${caminho}`, opcoes);
    } catch (erro) {
        throw new ApiError('Não foi possível conectar à API. Verifique se o servidor está rodando.');
    }

    let json = null;
    try {
        json = await resposta.json();
    } catch (erro) {
        // resposta sem JSON: tratada abaixo
    }

    if (!resposta.ok || !json || json.status === 'erro') {
        const detalhes = json?.detalhes?.length ? ` (${json.detalhes.join('; ')})` : '';
        const mensagem = json?.erro ? json.erro + detalhes : `Erro inesperado (status ${resposta.status})`;
        throw new ApiError(mensagem, resposta.status, json?.codigo ?? null);
    }

    return json.data;
}

// --- Jogos ---
const getJogos = () => _request('GET', '/jogos');
const criarJogo = (dados) => _request('POST', '/jogos', dados);
const atualizarJogo = (id, dados) => _request('PUT', `/jogos/${id}`, dados);
const excluirJogo = (id) => _request('DELETE', `/jogos/${id}`);

// --- Times ---
const getTimes = () => _request('GET', '/times');
const criarTime = (dados) => _request('POST', '/times', dados);
const atualizarTime = (id, dados) => _request('PUT', `/times/${id}`, dados);
const excluirTime = (id) => _request('DELETE', `/times/${id}`);

// --- Competidores ---
const getCompetidores = () => _request('GET', '/competidores');
const criarCompetidor = (dados) => _request('POST', '/competidores', dados);
const atualizarCompetidor = (id, dados) => _request('PUT', `/competidores/${id}`, dados);
const excluirCompetidor = (id) => _request('DELETE', `/competidores/${id}`);

// --- Confrontos ---
const getConfrontos = () => _request('GET', '/confrontos');
const criarConfronto = (dados) => _request('POST', '/confrontos', dados);
const atualizarConfronto = (id, dados) => _request('PUT', `/confrontos/${id}`, dados);
const excluirConfronto = (id) => _request('DELETE', `/confrontos/${id}`);
