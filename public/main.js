const socket = io();

const sendButton = document.getElementById("sendButton");
const nicknameInput = document.getElementById("nicknameInput");
const game = document.getElementById("game");
const questionElement = document.getElementById("question");
const answersElement = document.getElementById("answers");
const restartButton = document.getElementById("restartButton");
const startButton = document.getElementById("startButton");
const questionSelect = document.getElementById("questionSelect");
const labelSelect = document.getElementById("labelSelect");
const inputColor = document.getElementById("inputColor");
const spanColor = document.getElementById("spanColor");

startButton.addEventListener("click", () => {
  socket.emit("startGame");
  startButton.style.display = "none";
  liveScoreboard.style.display = "block";
  waitingPlayers.style.display = "none";
  questionSelect.style.display = "none";
  labelSelect.style.display = "none";
});

sendButton.addEventListener("click", () => {
  const nickname = nicknameInput.value;
  if (!nickname) {
    return;
  }

  socket.emit("join", { nickname }, (response) => {
    if (response.status === "error") {
      alert(response.message);
    } else {
      spanColor.style.display = "none";
      inputColor.style.display = "none";
      sendButton.style.display = "none";
      nicknameInput.style.display = "none";
      game.style.display = "block";
      waitingPlayers.style.display = "block";
    }
  });
});

function displayQuestion(question) {
  questionElement.textContent = question.text;
  answersElement.innerHTML = "";

  question.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.textContent = answer.text;
    button.onclick = () => {
      socket.emit("answer", { nickname: nicknameInput.value, question: question.index, answer: index });
      disableAnswerButtons();
    };
    answersElement.appendChild(button);
  });
}

let hostId = null;

socket.on("showStartButton", (data) => {
  hostId = data.hostId;
  startButton.style.display = "inline";
});

socket.on("startGame", () => {
  waitingPlayers.style.display = "none";
  if (!window.gameStarted && players.length > 0) {
    window.gameStarted = true;
    startGame();
  }
  if (socket.id === hostId) {
    questionSelect.style.display = "none";
    labelSelect.style.display = "none";
  }
});

socket.on("question", (data) => {
  displayQuestion(data);
  enableAnswerButtons();
  liveScoreboard.style.display = "block";
});

const pointsElement = document.getElementById("points");

socket.on("players", (players) => {
  updateWaitingPlayers(players);
  const player = players.find((p) => p.name === nicknameInput.value);
  if (player) {
    pointsElement.textContent = player.score;
  }
});

socket.on("winners", (winners) => {
  questionElement.textContent = "El juego ha terminado";
  answersElement.innerHTML = "Ganadores: " + winners.map(w => w.name).join(", ");
  if (socket.id === hostId) {
    restartButton.style.display = "block";
    questionSelect.style.display = "inline";
    labelSelect.style.display = "inline-block";
  }
  liveScoreboard.style.display = "none";
  document.getElementById("podium").style.display = "block";
  displayPodium(winners);
});

socket.on("liveScoreboard", (players) => {
  updateLiveScoreboard(players);
});

restartButton.addEventListener("click", () => {
  socket.emit("restart");
  restartButton.style.display = "none";
  questionSelect.style.display = "none";
  labelSelect.style.display = "none";
  resetGameUI();
});

function disableAnswerButtons() {
  const buttons = answersElement.getElementsByTagName("button");
  for (const button of buttons) {
    button.disabled = true;
  }
}

function enableAnswerButtons() {
  const buttons = answersElement.getElementsByTagName("button");
  for (const button of buttons) {
    button.disabled = false;
  }
}

function updateLiveScoreboard(players) {
  const liveScores = document.getElementById("liveScores");
  liveScores.innerHTML = "";
  players
    .slice() // Crea una copia de la lista de jugadores para no modificar la lista original
    .sort((a, b) => b.score - a.score) // Ordena las puntuaciones de mayor a menor
    .forEach((player) => {
      const li = document.createElement("li");
      li.textContent = `${player.name} ➜ ${player.score}`;
      liveScores.appendChild(li);
    });
}

function displayPodium(winners) {
  const top3Players = document.getElementById("top3Players");
  top3Players.innerHTML = "";
  winners.slice(0, 3).forEach((winner, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${winner.name}: ${winner.score}`;
    top3Players.appendChild(li);
  });
}

function resetGameUI() {
  window.gameStarted = false;
  questionElement.textContent = "";
  answersElement.innerHTML = "";
  pointsElement.textContent = "0";
  liveScoreboard.style.display = "none";
  podium.style.display = "none";
  updateLiveScoreboard(players); // Añade esta línea
}

socket.on("hidePodium", () => {
  document.getElementById("podium").style.display = "none";
});

function updateWaitingPlayers(players) {
  const playersList = document.getElementById("playersList");
  playersList.innerHTML = "";
  players.forEach((player) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = player.name;
    tr.appendChild(td);
    playersList.appendChild(tr);
  });
}

socket.on("hideWaitingPlayers", () => {
  waitingPlayers.style.display = "none";
});

socket.on("showQuestionSelect", (data) => {
  if (socket.id === data.hostId) {
    questionSelect.style.display = "inline";
    labelSelect.style.display = "inline-block";
  }
});

questionSelect.addEventListener("change", () => {
  const selectedFile = questionSelect.value;
  socket.emit("changeQuestionFile", { filename: selectedFile });
});
