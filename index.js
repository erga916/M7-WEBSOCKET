const express = require("express");
const app = express();
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer);
const fs = require("fs");

app.use(express.static("public"));

let preguntas = [];

function loadQuestions(filename) {
  fs.readFile(filename, (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    preguntas = JSON.parse(data).map((pregunta) => ({ ...pregunta, responded: 0 }));
    //console.log("Preguntas cargadas:", preguntas);
  });
}

let players = [];

io.on("connection", (socket) => {
  socket.on("changeQuestionFile", (data) => {
    loadQuestions(data.filename);
  });
  //console.log("Un cliente se ha conectado.");
  let gameStarted = false;
  socket.on("join", ({ nickname }, callback) => {
    //console.log(`El jugador ${nickname} se ha unido.`);
    if (players.some((player) => player.name === nickname)) {
      callback({ status: "error", message: "El nombre de usuario ya está en uso." });
    } else {
      players.push({ id: socket.id, name: nickname, score: 0 });
      io.emit("players", players);
      if (players.length === 1) {
        socket.emit("showStartButton", { hostId: socket.id });
        socket.emit("showQuestionSelect", { hostId: socket.id });
      }
      callback({ status: "success" });
    }
  });

  socket.on("startGame", () => {
    if (!gameStarted && players.length > 0) {
      io.emit("liveScoreboard", players);
      gameStarted = true;
      startGame();
    }
  });

  socket.on("answer", (data) => {
    //console.log(`El jugador ${data.nickname} ha respondido: ${data.answer}`);
    let player = players.find((p) => p.name === data.nickname);
    if (player) {
      let question = preguntas[data.question];
      let answer = question.answers[data.answer];
      if (answer.correct) {
        player.score += question.time;
        io.emit("players", players);
        io.emit("liveScoreboard", players);
      }

      question.responded++;
      if (question.responded === players.length) {
        nextQuestion();
      }
    }
  });

  socket.on("disconnect", () => {
    //console.log(`El jugador ${socket.id} se ha desconectado.`);
    players = players.filter((p) => p.id !== socket.id);
    io.emit("players", players);
  });

  socket.on("restart", () => {
    players = players.map(player => ({ ...player, score: 0 }));
    io.emit("players", players);
    if (players.length > 0) {
      startGame();
    }
  });
});

let questionIndex = 0;
let intervalId;

function startGame() {
  io.emit("hidePodium");
  io.emit("hideWaitingPlayers");
  questionIndex = 0;
  nextQuestion();
  io.emit("liveScoreboard", players);
}

function nextQuestion() {
  if (questionIndex >= preguntas.length) {
    endGame();
    return;
  }

  let question = preguntas[questionIndex];
  io.emit("question", { index: questionIndex, text: question.text, answers: question.answers, time: question.time });
  question.responded = 0;
  questionIndex++;

  clearTimeout(intervalId);
  intervalId = setTimeout(nextQuestion, question.time * 1000);
}

function endGame() {
  //console.log("El juego ha terminado");
  players.sort((a, b) => b.score - a.score);
  let winners = players.slice(0, 3);
  io.emit("winners", winners);
}

httpServer.listen(3000, () => {
  console.log("Servidor escuchando en http://localhost:3000");
});

loadQuestions("preguntas1.json");
