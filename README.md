# CAPITAL CITY G17 — The Accounting Heist

Jogo de perguntas multiplayer para a apresentação do Grupo 17 sobre Capital Próprio e Auditoria.

## Conteúdo
- `server.js`: servidor Node.js + Express + Socket.IO (salas em tempo real).
- `public/index.html`: interface responsiva com estética urbana/cinematográfica inspirada em videojogos de mundo aberto.
- `render.yaml`: configuração para publicação no Render.

## Executar localmente
1. Instalar Node.js 18 ou superior.
2. Na pasta do projeto, executar `npm install`.
3. Executar `npm start`.
4. Abrir `http://localhost:3000`.

## Publicar no Render
1. Criar uma conta em https://render.com/.
2. Colocar esta pasta num repositório GitHub.
3. No Render, escolher **New +** → **Web Service**.
4. Ligar o repositório GitHub do Capital City G17.
5. O Render deverá detetar o `render.yaml`. Se pedir os comandos, usar:
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Escolher a região mais próxima disponível e o plano adequado. O plano gratuito pode suspender o serviço quando está inativo.
7. Carregar em **Create Web Service** e aguardar o estado **Live**.
8. Abrir o endereço `https://...onrender.com`.

## Como usar
- O anfitrião abre o endereço público e carrega em **Criar uma sala**.
- Os jogadores digitalizam o QR Code ou abrem o mesmo endereço com o código da sala.
- O anfitrião inicia a missão e avança entre as cinco rondas.
- A pontuação recompensa a resposta certa e a rapidez: 1000 pontos base + até 1000 pontos de bónus.
- A classificação final ordena por pontos, respostas certas e tempo total de resposta.

## Importante
- As salas e pontuações ficam na memória do servidor. Um reinício do serviço apaga as salas em curso; cria a sala perto do início da apresentação.
- Para o QR Code é usada uma API externa de geração de QR e para as imagens/fonte são usados recursos externos. É necessária ligação à internet.
- O plano gratuito do Render pode demorar algum tempo a acordar após inatividade. Testar o endereço antes da apresentação.
- O visual é inspirado na linguagem cinematográfica de jogos urbanos, sem usar logótipos, personagens ou imagens oficiais de GTA.
- Antes de uma apresentação avaliada, confirma com o docente a formulação e correção das perguntas jurídicas/contabilísticas.
