# Front E-classes (GamerClass)

Interface web do sistema de controle de competições de jogos online. Permite **visualizar, cadastrar, editar e excluir** jogos, times, competidores e confrontos, consumindo a API `api-eclasses` (que usa o banco no Supabase).

HTML + CSS + JavaScript puro, sem build.

## Como rodar

1. Deixe a **API rodando** (veja o README do `api-eclasses`). Por padrão ela fica em `http://localhost:3000`.
2. Sirva esta pasta por qualquer servidor estático, por exemplo:
   - extensão **Live Server** do VS Code (botão direito em `index.html` → *Open with Live Server*), ou
   - `npx serve .`, ou
   - `python -m http.server 5500`
3. Abra o endereço no navegador.

Se a API estiver fora do ar, a tela mostra uma faixa de erro com o botão **Tentar novamente**.

## Apontar para outra API

A URL fica em uma única linha, no topo de [`service/api.js`](service/api.js):

```js
const BASE_URL = 'http://localhost:3000/api';
```

Ao publicar a API, troque pela URL dela (ex.: `https://minha-api.onrender.com/api`).

## O que dá para fazer

| Tela | Criar | Editar | Excluir |
|---|---|---|---|
| Jogos | botão **Novo Jogo** | ícone de lápis no card | ícone de lixeira (com confirmação) |
| Times | **Novo Time** (com cor) | idem | idem |
| Competidores | **Novo Competidor** (time opcional) | idem | idem |
| Confrontos | **Registrar Confronto** | idem (placar e status) | idem |

Em confrontos agendados, o botão **Finalizar** abre a edição já com o status "Finalizado" para lançar o placar.

Mensagens de erro da API aparecem em avisos no canto da tela. Exemplos: nome duplicado, ou tentar excluir um time que ainda tem confrontos.

## Estrutura

```
index.html               páginas e modal
service/api.js           chamadas à API (GET, POST, PUT, DELETE)
controller/app.js        estado, renderização, formulários, criar / editar / excluir
style/                   index.css (layout) e components.css (cards, modal, botões, avisos)
```
