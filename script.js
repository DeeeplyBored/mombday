const screens = {
  intro: document.getElementById("introScreen"),
  game: document.getElementById("gameScreen"),
  level: document.getElementById("levelScreen"),
  unlock: document.getElementById("unlockScreen"),
  card: document.getElementById("cardScreen")
};

const board = document.getElementById("board");
const scoreEl = document.getElementById("score");
const goalEl = document.getElementById("goal");
const levelNumberEl = document.getElementById("levelNumber");
const progressBar = document.getElementById("progressBar");
const levelTitle = document.getElementById("levelTitle");
const levelQuote = document.getElementById("levelQuote");
const nextLevelButton = document.getElementById("nextLevelButton");

const SIZE = 6;
const TYPES = ["heart", "flower", "star", "berry", "bow"];
const SYMBOLS = {
  heart: "♥",
  flower: "✿",
  star: "★",
  berry: "●",
  bow: "🎀"
};

const TILE_COLORS = {
  heart: "#e9d5ff",
  flower: "#ddd0f5",
  star: "#f3e7ba",
  berry: "#f0d4e5",
  bow: "#d8c5ed"
};

const LEVELS = [
  {
    goal: 250,
    title: "LOOK AT YOU GO!",
    quote: "One step closer to your surprise..."
  },
  {
    goal: 500,
    title: "I KNEW YOU WERE GOOD AT THIS!",
    quote: "Maybe I should have made it harder."
  },
  {
    goal: 800,
    title: "YOU DID IT!",
    quote: "Now for your surprise! 🎁"
  }
];

let boardState = [];
let selected = null;
let score = 0;
let level = 0;
let locked = false;

function showScreen(screen) {
  Object.values(screens).forEach((element) => {
    element.classList.remove("active");
  });
  screen.classList.add("active");
}

function randomType() {
  return TYPES[Math.floor(Math.random() * TYPES.length)];
}

function makeBoard() {
  boardState = [];

  for (let row = 0; row < SIZE; row++) {
    boardState[row] = [];

    for (let col = 0; col < SIZE; col++) {
      let type;

      do {
        type = randomType();
      } while (
        (col >= 2 &&
          boardState[row][col - 1] === type &&
          boardState[row][col - 2] === type) ||
        (row >= 2 &&
          boardState[row - 1][col] === type &&
          boardState[row - 2][col] === type)
      );

      boardState[row][col] = type;
    }
  }
}

function renderBoard() {
  board.innerHTML = "";

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const type = boardState[row][col];
      const tile = document.createElement("button");

      tile.type = "button";
      tile.className = `tile symbol-${type}`;
      tile.textContent = SYMBOLS[type];
      tile.style.background = TILE_COLORS[type];
      tile.dataset.row = row;
      tile.dataset.col = col;
      tile.setAttribute("aria-label", `${type}, row ${row + 1}, column ${col + 1}`);

      tile.addEventListener("click", () => handleTileClick(row, col));
      board.appendChild(tile);
    }
  }

  if (selected) {
    const selectedTile = getTile(selected.row, selected.col);
    if (selectedTile) selectedTile.classList.add("selected");
  }
}

function getTile(row, col) {
  return board.querySelector(
    `.tile[data-row="${row}"][data-col="${col}"]`
  );
}

function areAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function handleTileClick(row, col) {
  if (locked) return;

  const current = { row, col };

  if (!selected) {
    selected = current;
    renderBoard();
    return;
  }

  if (selected.row === row && selected.col === col) {
    selected = null;
    renderBoard();
    return;
  }

  if (!areAdjacent(selected, current)) {
    selected = current;
    renderBoard();
    return;
  }

  const first = selected;
  selected = null;
  trySwap(first, current);
}

function trySwap(a, b) {
  locked = true;

  [boardState[a.row][a.col], boardState[b.row][b.col]] = [
    boardState[b.row][b.col],
    boardState[a.row][a.col]
  ];

  renderBoard();

  const matches = findMatches();

  if (matches.length === 0) {
    setTimeout(() => {
      [boardState[a.row][a.col], boardState[b.row][b.col]] = [
        boardState[b.row][b.col],
        boardState[a.row][a.col]
      ];
      renderBoard();
      locked = false;
    }, 180);

    return;
  }

  resolveMatches(matches);
}

function findMatches() {
  const matches = new Set();

  for (let row = 0; row < SIZE; row++) {
    let start = 0;

    while (start < SIZE) {
      let end = start + 1;

      while (
        end < SIZE &&
        boardState[row][end] === boardState[row][start]
      ) {
        end++;
      }

      if (end - start >= 3) {
        for (let col = start; col < end; col++) {
          matches.add(`${row},${col}`);
        }
      }

      start = end;
    }
  }

  for (let col = 0; col < SIZE; col++) {
    let start = 0;

    while (start < SIZE) {
      let end = start + 1;

      while (
        end < SIZE &&
        boardState[end][col] === boardState[start][col]
      ) {
        end++;
      }

      if (end - start >= 3) {
        for (let row = start; row < end; row++) {
          matches.add(`${row},${col}`);
        }
      }

      start = end;
    }
  }

  return [...matches].map((value) => {
    const [row, col] = value.split(",").map(Number);
    return { row, col };
  });
}

function resolveMatches(matches) {
  const points = matches.length * 10;
  score += points;

  updateScore();

  matches.forEach(({ row, col }) => {
    const tile = getTile(row, col);
    if (tile) tile.classList.add("matched");
  });

  setTimeout(() => {
    matches.forEach(({ row, col }) => {
      boardState[row][col] = null;
    });

    collapseBoard();
    refillBoard();
    renderBoard();

    setTimeout(() => {
      const chain = findMatches();

      if (chain.length) {
        resolveMatches(chain);
      } else {
        locked = false;

        if (score >= LEVELS[level].goal) {
          finishLevel();
        }
      }
    }, 100);
  }, 230);
}

function collapseBoard() {
  for (let col = 0; col < SIZE; col++) {
    let writeRow = SIZE - 1;

    for (let row = SIZE - 1; row >= 0; row--) {
      if (boardState[row][col] !== null) {
        boardState[writeRow][col] = boardState[row][col];
        writeRow--;
      }
    }

    while (writeRow >= 0) {
      boardState[writeRow][col] = null;
      writeRow--;
    }
  }
}

function refillBoard() {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (boardState[row][col] === null) {
        boardState[row][col] = randomType();
      }
    }
  }
}

function updateScore() {
  const goal = LEVELS[level].goal;
  scoreEl.textContent = score;
  goalEl.textContent = goal;

  const percent = Math.min(100, (score / goal) * 100);
  progressBar.style.width = `${percent}%`;
}

function startLevel() {
  selected = null;
  locked = false;
  score = 0;

  const currentLevel = LEVELS[level];

  levelNumberEl.textContent = level + 1;
  goalEl.textContent = currentLevel.goal;
  updateScore();

  makeBoard();
  renderBoard();
  showScreen(screens.game);
}

function finishLevel() {
  locked = true;

  const currentLevel = LEVELS[level];

  levelTitle.textContent = currentLevel.title;
  levelQuote.textContent = currentLevel.quote;

  if (level === LEVELS.length - 1) {
    nextLevelButton.textContent = "Unlock my surprise →";
    nextLevelButton.onclick = () => showScreen(screens.unlock);
  } else {
    nextLevelButton.textContent = "Next level →";
    nextLevelButton.onclick = () => {
      level++;
      startLevel();
    };
  }

  showScreen(screens.level);
}

document.getElementById("startButton").addEventListener("click", () => {
  level = 0;
  startLevel();
});

document.getElementById("openCardButton").addEventListener("click", () => {
  showScreen(screens.card);
});


const originalButton = document.getElementById("originalButton");
const originalOverlay = document.getElementById("originalOverlay");
const closeOriginalButton = document.getElementById("closeOriginalButton");
const overlayBackdrop = document.getElementById("overlayBackdrop");

function openOriginalImage() {
  originalOverlay.hidden = false;
}

function closeOriginalImage() {
  originalOverlay.hidden = true;
}

if (originalButton && originalOverlay && closeOriginalButton && overlayBackdrop) {
  originalButton.addEventListener("click", openOriginalImage);
  closeOriginalButton.addEventListener("click", closeOriginalImage);
  overlayBackdrop.addEventListener("click", closeOriginalImage);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !originalOverlay.hidden) {
      closeOriginalImage();
    }
  });
}
