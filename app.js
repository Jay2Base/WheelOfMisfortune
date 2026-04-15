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

const BASE_COLORS = [
  "#f94144", "#f3722c", "#f8961e", "#f9844a", "#f9c74f",
  "#90be6d", "#43aa8b", "#577590", "#277da1", "#6a4c93"
];

let items = [];
let rotation = 0;
let spinning = false;
let selectedItem = "";
let animationId = 0;

function parseInput(text) {
  return text
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function setError(message) {
  errorText.textContent = message;
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

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(start + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
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
    resultText.textContent = `Selected: ${selectedItem}`;

    if (items.length > 1) {
      remainingText.textContent = `${items.length - 1} items remain.`;
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
  resultText.textContent = "";
  remainingText.textContent = "";
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
    drawWheel();
    setError("Wheel is empty. Enter new items to continue.");
    showMode(setupMode);
    return;
  }

  drawWheel();
  spinButton.disabled = false;
  showMode(playMode);
}

function restart() {
  cancelAnimationFrame(animationId);
  spinning = false;
  selectedItem = "";
  items = [];
  rotation = 0;
  resultText.textContent = "";
  remainingText.textContent = "";
  setError("");
  drawWheel();
  showMode(setupMode);
}

startButton.addEventListener("click", buildWheel);
spinButton.addEventListener("click", startSpin);
nextSpinButton.addEventListener("click", nextSpin);
restartButton.addEventListener("click", restart);

drawWheel();
