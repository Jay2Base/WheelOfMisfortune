const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");

const setupMode = document.getElementById("setupMode");
const playMode = document.getElementById("playMode");
const resetMode = document.getElementById("resetMode");

const itemInput = document.getElementById("itemInput");
const startButton = document.getElementById("startButton");
const spinButton = document.getElementById("spinButton");
const nextSpinButton = document.getElementById("nextSpinButton");
const restartButton = document.getElementById("restartButton");
const resultText = document.getElementById("resultText");
const remainingText = document.getElementById("remainingText");
const errorText = document.getElementById("errorText");
const winnerModal = document.getElementById("winnerModal");
const winnerModalText = document.getElementById("winnerModalText");
const closeWinnerModalButton = document.getElementById("closeWinnerModalButton");
const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");

const BASE_COLORS = [
  "#ffffff",
  "#d8e3ff",
  "#a8c0ff",
  "#6f94ff",
  "#4169e1",
  "#1f3d9f",
  "#0b1f63",
  "#050f33",
  "#0f0f14",
  "#000000"
];

let items = [];
let rotation = 0;
let spinning = false;
let selectedItem = "";
let animationId = 0;
let confettiAnimationId = 0;

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function showWinnerModal(winner) {
  winnerModalText.textContent = winner;
  winnerModal.classList.remove("hidden");
  winnerModal.classList.remove("show");
  // Force reflow so the pop animation restarts each spin.
  void winnerModal.offsetWidth;
  winnerModal.classList.add("show");
}

function hideWinnerModal() {
  winnerModal.classList.remove("show");
  winnerModal.classList.add("hidden");
}

function launchConfetti() {
  resizeConfettiCanvas();
  confettiCanvas.classList.remove("hidden");

  const pieces = [];
  const count = 220;
  const colors = ["#ffffff", "#dbe5ff", "#a8bfff", "#6c8fff", "#4169e1", "#132a78"];

  for (let index = 0; index < count; index += 1) {
    pieces.push({
      x: Math.random() * confettiCanvas.width,
      y: -30 - Math.random() * confettiCanvas.height * 0.6,
      w: 6 + Math.random() * 8,
      h: 10 + Math.random() * 14,
      vy: 180 + Math.random() * 220,
      vx: -80 + Math.random() * 160,
      gravity: 420 + Math.random() * 180,
      tilt: Math.random() * Math.PI,
      spin: -8 + Math.random() * 16,
      color: colors[index % colors.length]
    });
  }

  const start = performance.now();
  let last = start;
  const durationMs = 3200;

  function frame(now) {
    const elapsed = now - start;
    const dt = Math.min((now - last) / 1000, 0.04);
    last = now;

    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (const piece of pieces) {
      piece.vy += piece.gravity * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.tilt += piece.spin * dt;

      confettiCtx.save();
      confettiCtx.translate(piece.x, piece.y);
      confettiCtx.rotate(piece.tilt);
      confettiCtx.fillStyle = piece.color;
      confettiCtx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      confettiCtx.restore();
    }

    if (elapsed < durationMs) {
      confettiAnimationId = requestAnimationFrame(frame);
      return;
    }

    cancelAnimationFrame(confettiAnimationId);
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiCanvas.classList.add("hidden");
  }

  cancelAnimationFrame(confettiAnimationId);
  confettiAnimationId = requestAnimationFrame(frame);
}

function parseInput(text) {
  return text
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function setError(message) {
  errorText.textContent = message;
}

function setResultText(message) {
  if (resultText) {
    resultText.textContent = message;
  }
}

function showMode(mode) {
  setupMode.classList.add("hidden");
  playMode.classList.add("hidden");
  resetMode.classList.add("hidden");
  mode.classList.remove("hidden");
}

function drawWheel() {
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 8;

  ctx.clearRect(0, 0, size, size);

  if (!items.length) {
    ctx.save();
    ctx.translate(center, center);
    ctx.fillStyle = "#dbe0f7";
    ctx.font = "600 30px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("Add items to begin", 0, 10);
    ctx.restore();
    return;
  }

  const sliceAngle = (Math.PI * 2) / items.length;

  for (let index = 0; index < items.length; index += 1) {
    const start = rotation + index * sliceAngle - Math.PI / 2;
    const end = start + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = BASE_COLORS[index % BASE_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(start + sliceAngle / 2);
    ctx.textAlign = "right";
    const shadeIndex = index % BASE_COLORS.length;
    ctx.fillStyle = shadeIndex < 5 ? "#071238" : "#ffffff";
    ctx.font = "700 20px Segoe UI";
    const label = items[index];
    const clipped = label.length > 16 ? `${label.slice(0, 16)}...` : label;
    ctx.fillText(clipped, radius - 12, 7);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(center, center, 26, 0, Math.PI * 2);
  ctx.fillStyle = "#dbe0f7";
  ctx.fill();
}

function getWinnerIndex() {
  const fullCircle = Math.PI * 2;
  const normalized = ((rotation % fullCircle) + fullCircle) % fullCircle;
  const pointerAngle = (Math.PI * 1.5 - normalized + fullCircle) % fullCircle;
  const sliceAngle = fullCircle / items.length;
  return Math.floor(pointerAngle / sliceAngle);
}

function removeOneItem(list, target) {
  let removed = false;
  return list.filter((entry) => {
    if (!removed && entry === target) {
      removed = true;
      return false;
    }
    return true;
  });
}

function animateSpin(initialVelocity) {
  const start = performance.now();
  const spinDurationSec = 10;
  const deceleration = initialVelocity / spinDurationSec;
  let lastElapsed = 0;

  function frame(now) {
    const elapsed = Math.min((now - start) / 1000, spinDurationSec);
    const traveled = initialVelocity * elapsed - 0.5 * deceleration * elapsed * elapsed;
    const previousTravel = initialVelocity * lastElapsed - 0.5 * deceleration * lastElapsed * lastElapsed;
    rotation += traveled - previousTravel;
    lastElapsed = elapsed;
    drawWheel();

    if (elapsed < spinDurationSec) {
      animationId = requestAnimationFrame(frame);
      return;
    }

    spinning = false;
    cancelAnimationFrame(animationId);

    const winnerIndex = getWinnerIndex();
    selectedItem = items[winnerIndex];
    setResultText(`${selectedItem}`);
    showWinnerModal(selectedItem);
    launchConfetti();

    if (items.length > 1) {
      remainingText.textContent = `${items.length - 1} remain.`;
      nextSpinButton.disabled = false;
    } else {
      remainingText.textContent = "No items left after this spin. Start over.";
      nextSpinButton.disabled = true;
    }

    showMode(resetMode);
  }

  animationId = requestAnimationFrame(frame);
}

function startSpin() {
  if (spinning || !items.length) {
    return;
  }

  spinning = true;
  setError("");
  setResultText("");
  remainingText.textContent = "";
  hideWinnerModal();
  spinButton.disabled = true;

  // Angular velocity in rad/s, then uniformly decelerated to zero in ~10 seconds.
  const initialVelocity = 8 + Math.random() * 4;
  animateSpin(initialVelocity);
}

function buildWheel() {
  const parsedItems = parseInput(itemInput.value);

  if (parsedItems.length < 2) {
    setError("Please provide at least 2 items.");
    return;
  }

  items = parsedItems;
  rotation = 0;
  selectedItem = "";
  setError("");
  drawWheel();
  spinButton.disabled = false;
  showMode(playMode);
}

function nextSpin() {
  if (!selectedItem) {
    return;
  }

  items = removeOneItem(items, selectedItem);
  itemInput.value = items.join("\n");
  selectedItem = "";

  if (!items.length) {
    hideWinnerModal();
    drawWheel();
    setError("Wheel is empty. Enter new items to continue.");
    showMode(setupMode);
    return;
  }

  drawWheel();
  hideWinnerModal();
  spinButton.disabled = false;
  showMode(playMode);
}

function restart() {
  cancelAnimationFrame(animationId);
  cancelAnimationFrame(confettiAnimationId);
  spinning = false;
  selectedItem = "";
  items = [];
  rotation = 0;
  setResultText("");
  remainingText.textContent = "";
  setError("");
  hideWinnerModal();
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiCanvas.classList.add("hidden");
  drawWheel();
  showMode(setupMode);
}

startButton.addEventListener("click", buildWheel);
spinButton.addEventListener("click", startSpin);
nextSpinButton.addEventListener("click", nextSpin);
restartButton.addEventListener("click", restart);
closeWinnerModalButton.addEventListener("click", hideWinnerModal);
window.addEventListener("resize", resizeConfettiCanvas);

drawWheel();
resizeConfettiCanvas();
