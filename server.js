const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, app: "Capital City G17" }));

const QUESTIONS = [
  { category: "01 / ENTRADAS DE CAPITAL", question: "Quando um sócio realiza uma entrada em dinheiro para subscrever capital social, qual é o efeito principal?", answers: ["Aumenta o ativo e o capital próprio", "Aumenta sempre o passivo", "É registada como um gasto", "Diminui o capital próprio"], correct: 0, explanation: "A entrada realizada para capital social aumenta os meios financeiros da empresa e o capital próprio." },
  { category: "02 / SUPRIMENTOS E PRESTAÇÕES ACESSÓRIAS", question: "Qual é a característica típica de um suprimento?", answers: ["É sempre uma entrada definitiva no capital social", "É um empréstimo do sócio à sociedade", "É uma distribuição de lucros", "É uma reserva obrigatória"], correct: 1, explanation: "O suprimento é, em regra, um empréstimo do sócio à sociedade, normalmente reconhecido como uma dívida." },
  { category: "03 / RESERVAS E AÇÕES OU QUOTAS PRÓPRIAS", question: "Qual é uma das funções da reserva legal?", answers: ["Financiar despesas pessoais dos sócios", "Substituir o capital social", "Reforçar a proteção financeira da sociedade, nos termos da lei", "Garantir dividendos todos os anos"], correct: 2, explanation: "A reserva legal é constituída nos termos legais e contribui para a proteção do capital da sociedade." },
  { category: "04 / PERDA DE CAPITAL E DIVIDENDOS", question: "Se, devido a perdas, o capital próprio ficar reduzido a menos de metade do capital social, o que deve acontecer?", answers: ["A situação pode ser ignorada", "Os dividendos devem aumentar", "A empresa deve distribuir todas as reservas", "Os órgãos sociais devem considerar as medidas e os deveres legais aplicáveis"], correct: 3, explanation: "A perda de metade do capital social desencadeia deveres legais específicos. A distribuição de dividendos também está sujeita a limites." },
  { category: "05 / AUDITORIA: RISCOS E PROCEDIMENTOS", question: "Qual é um procedimento adequado para auditar os movimentos do capital próprio?", answers: ["Conferir atas, deliberações, registos contabilísticos e comprovativos bancários", "Aceitar apenas a explicação verbal da gerência", "Verificar exclusivamente as vendas", "Ignorar os movimentos ocorridos durante o exercício"], correct: 0, explanation: "O auditor obtém prova apropriada e analisa riscos inerentes e de controlo, reservas, dividendos e classificações contabilísticas." }
];

const rooms = new Map();
const timers = new Map();
function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do { code = Array.from({ length: 5 }, () => chars[crypto.randomInt(chars.length)]).join(""); }
  while (rooms.has(code));
  return code;
}
function getRanking(room) {
  return [...room.players.values()]
    .sort((a,b) => b.score-a.score || b.correct-a.correct || a.elapsed-b.elapsed || a.name.localeCompare(b.name,"pt"))
    .map((p,i) => ({ position:i+1, name:p.name, score:p.score, correct:p.correct }));
}
function clearTimer(code) { if (timers.has(code)) clearTimeout(timers.get(code)); timers.delete(code); }
function broadcastLobby(room) { io.to(room.code).emit("lobby:update", { players:getRanking(room) }); }
function endRound(room) {
  if (room.status !== "question") return;
  clearTimer(room.code);
  room.status = "round-end";
  const q = QUESTIONS[room.index];
  for (const p of room.players.values()) {
    if (!p.answered) {
      p.answered = true;
      io.to(p.id).emit("player:feedback", { correct:false, points:0, message:"MISSÃO FALHADA", detail:"O tempo terminou. Não recebeste pontos nesta missão." });
    }
  }
  io.to(room.code).emit("round:ended", { index:room.index, explanation:q.explanation, ranking:getRanking(room) });
}
function startRound(room) {
  clearTimer(room.code);
  room.status = "question";
  room.started = Date.now();
  room.ends = room.started + 30000;
  for (const p of room.players.values()) p.answered = false;
  const q = QUESTIONS[room.index];
  io.to(room.code).emit("question:start", { index:room.index, total:QUESTIONS.length, category:q.category, question:q.question, answers:q.answers, endsAt:room.ends });
  timers.set(room.code, setTimeout(() => endRound(room), 30000));
}
function finishGame(room) {
  room.status = "finished";
  clearTimer(room.code);
  io.to(room.code).emit("game:finished", { ranking:getRanking(room) });
}
io.on("connection", socket => {
  socket.on("host:create", (_data, callback) => {
    const code = makeCode();
    const room = { code, host:socket.id, players:new Map(), status:"lobby", index:0 };
    rooms.set(code, room);
    socket.join(code);
    socket.data.hostCode = code;
    callback?.({ ok:true, code });
  });
  socket.on("player:join", ({ code, name }, callback) => {
    code = String(code || "").trim().toUpperCase();
    name = String(name || "").trim().slice(0,20);
    const room = rooms.get(code);
    if (!room) return callback?.({ ok:false, error:"Sala não encontrada. Confirma o código ou QR Code." });
    if (!name) return callback?.({ ok:false, error:"Escreve o teu nome ou nickname." });
    if (room.status !== "lobby") return callback?.({ ok:false, error:"A missão já começou." });
    if ([...room.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase()))
      return callback?.({ ok:false, error:"Esse nome já está a ser utilizado." });
    room.players.set(socket.id, { id:socket.id, name, score:0, correct:0, elapsed:0, answered:false });
    socket.join(code);
    socket.data.roomCode = code;
    callback?.({ ok:true });
    broadcastLobby(room);
  });
  socket.on("host:start", ({ code }) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.host !== socket.id || room.status !== "lobby") return;
    if (!room.players.size) return socket.emit("host:error", "Ainda não há jogadores na sala.");
    room.index = 0;
    startRound(room);
  });
  socket.on("player:answer", ({ answer }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.status !== "question") return;
    const player = room.players.get(socket.id);
    if (!player || player.answered) return;
    const selected = Number(answer), q = QUESTIONS[room.index];
    if (!Number.isInteger(selected) || selected < 0 || selected >= q.answers.length) return;
    player.answered = true;
    const elapsed = Math.max(0, Date.now() - room.started);
    player.elapsed += elapsed;
    const correct = selected === q.correct;
    let points = 0;
    if (correct) {
      player.correct++;
      const bonus = Math.floor(Math.max(0, room.ends - Date.now()) / 30000 * 1000);
      points = 1000 + bonus;
      player.score += points;
    }
    socket.emit("player:feedback", {
      correct, points,
      message:correct ? "MISSÃO COMPLETA" : "MISSÃO FALHADA",
      detail:correct ? `Resposta certa! ${points} pontos: 1000 pela resposta e ${points-1000} de bónus pela rapidez.` : "Resposta incorreta. Não recebeste pontos nesta missão."
    });
    broadcastLobby(room);
    if ([...room.players.values()].every(p => p.answered)) endRound(room);
  });
  socket.on("host:next", ({ code }) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.host !== socket.id || room.status !== "round-end") return;
    if (room.index === QUESTIONS.length - 1) finishGame(room);
    else { room.index++; startRound(room); }
  });
  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (room && room.players.delete(socket.id)) {
      broadcastLobby(room);
      if (room.status === "question" && room.players.size && [...room.players.values()].every(p => p.answered)) endRound(room);
    }
    const hostRoom = rooms.get(socket.data.hostCode);
    if (hostRoom && hostRoom.host === socket.id) {
      clearTimer(hostRoom.code);
      io.to(hostRoom.code).emit("room:closed");
      rooms.delete(hostRoom.code);
    }
  });
});
server.listen(PORT, "0.0.0.0", () => console.log(`Capital City G17 ativo na porta ${PORT}`));
