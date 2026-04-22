const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");

const setupMode = document.getElementById("setupMode");
const playMode = document.getElementById("playMode");

const csvInput = document.getElementById("csvInput");
const startButton = document.getElementById("startButton");
const spinButton = document.getElementById("spinButton");
const restartLink = document.getElementById("restartLink");
const previousPrizeText = document.getElementById("previousPrizeText");
const remainingText = document.getElementById("remainingText");
const errorText = document.getElementById("errorText");
const winnerModal = document.getElementById("winnerModal");
const winnerModalText = document.getElementById("winnerModalText");
const winnerModalDescription = document.getElementById("winnerModalDescription");
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

const SPIN_MUSIC_URL = "./assets/phatplamet.mp3";
const REVEAL_SOUND_URL = "https://commons.wikimedia.org/wiki/Special:FilePath/CullamBruce-Lockhart--Dawning_Fanfare.oga";

let entries = [];
let rotation = 0;
let spinning = false;
let selectedEntry = null;
let animationId = 0;
let confettiAnimationId = 0;
let revealStopTimer = 0;
const spinMusic = new Audio(SPIN_MUSIC_URL);
const revealSound = new Audio(REVEAL_SOUND_URL);

spinMusic.loop = true;
spinMusic.preload = "auto";
spinMusic.volume = 0.34;
revealSound.preload = "auto";
revealSound.volume = 0.6;

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function showWinnerModal(entry) {
  winnerModalText.textContent = entry.name;
  winnerModalDescription.textContent = entry.description || "";
  winnerModal.classList.remove("hidden");
  winnerModal.classList.remove("show");
  // Force reflow so the pop animation restarts each spin.
  void winnerModal.offsetWidth;
  winnerModal.classList.add("show");
}

function hideWinnerModal() {
  winnerModal.classList.remove("show");
  winnerModal.classList.add("hidden");
  winnerModalDescription.textContent = "";
}

function playSpinMusic() {
  spinMusic.currentTime = 0;
  spinMusic.play().catch(() => {});
}

function stopSpinMusic() {
  spinMusic.pause();
  spinMusic.currentTime = 0;
}

function playRevealSound() {
  window.clearTimeout(revealStopTimer);
  revealSound.currentTime = 0;
  revealSound.play().catch(() => {});
  // Keep reveal as a short "ta-da" effect instead of long music.
  revealStopTimer = window.setTimeout(() => {
    revealSound.pause();
    revealSound.currentTime = 0;
  }, 2400);
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

function parseCsvText(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let idx = 0; idx < csvText.length; idx += 1) {
    const char = csvText[idx];
    const nextChar = csvText[idx + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        cell += "\"";
        idx += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        idx += 1;
      }
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  if (!rows.length) {
    throw new Error("CSV is empty.");
  }

  const header = rows[0];
  if (header.length !== 2 || header[0] !== "Name" || header[1] !== "Description") {
    throw new Error("CSV must have exactly these headers in order: Name,Description.");
  }

  const parsedEntries = [];
  for (let index = 1; index < rows.length; index += 1) {
    const current = rows[index];
    if (current.length === 1 && current[0] === "") {
      continue;
    }
    if (current.length !== 2) {
      throw new Error(`Row ${index + 1} is invalid. Each row must have Name and Description.`);
    }
    const name = current[0].trim();
    const description = current[1].trim();
    if (!name) {
      throw new Error(`Row ${index + 1} is invalid. Name cannot be empty.`);
    }
    parsedEntries.push({ name, description });
  }

  return parsedEntries;
}

function readCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the CSV file."));
    reader.readAsText(file);
  });
}

function setError(message) {
  errorText.textContent = message;
}

function setResultText(message) {
  if (previousPrizeText) {
    previousPrizeText.textContent = message ? `Previous prize: ${message}` : "";
    previousPrizeText.classList.toggle("hidden", !message);
  }
}

function showMode(mode) {
  setupMode.classList.add("hidden");
  playMode.classList.add("hidden");
  mode.classList.remove("hidden");
}

function drawWheel() {
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 8;

  ctx.clearRect(0, 0, size, size);

  if (!entries.length) {
    ctx.save();
    ctx.translate(center, center);
    ctx.fillStyle = "#dbe0f7";
    ctx.font = "600 30px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("Add items to begin", 0, 10);
    ctx.restore();
    return;
  }

  const sliceAngle = (Math.PI * 2) / entries.length;

  for (let index = 0; index < entries.length; index += 1) {
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
    const label = entries[index].name;
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
  const normalizedRotation = ((rotation % fullCircle) + fullCircle) % fullCircle;
  const sliceAngle = fullCircle / entries.length;
  // Pointer is fixed at top (-90deg). In wheel-local space that is equivalent
  // to selecting the segment at angle -rotation (mod full circle).
  const pointerInWheelSpace = (fullCircle - normalizedRotation) % fullCircle;
  const epsilon = 1e-9;
  return Math.floor((pointerInWheelSpace + epsilon) / sliceAngle) % entries.length;
}

function removeOneEntry(list, target) {
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
    selectedEntry = entries[winnerIndex];
    setResultText(selectedEntry.name);
    stopSpinMusic();
    playRevealSound();
    showWinnerModal(selectedEntry);
    launchConfetti();

    entries = removeOneEntry(entries, selectedEntry);
    if (entries.length > 0) {
      remainingText.textContent = `${entries.length} remaining`;
      remainingText.classList.remove("hidden");
      spinButton.disabled = false;
      showMode(playMode);
      return;
    }

    remainingText.textContent = "No items left. Upload a new CSV or Start Over.";
    remainingText.classList.remove("hidden");
    spinButton.disabled = true;
    showMode(playMode);
  }

  animationId = requestAnimationFrame(frame);
}

function startSpin() {
  if (spinning || !entries.length) {
    return;
  }

  spinning = true;
  setError("");
  setResultText("");
  remainingText.textContent = "";
  remainingText.classList.add("hidden");
  hideWinnerModal();
  spinButton.disabled = true;
  stopSpinMusic();
  playSpinMusic();

  // Angular velocity in rad/s, then uniformly decelerated to zero in ~10 seconds.
  const initialVelocity = 8 + Math.random() * 4;
  animateSpin(initialVelocity);
}

async function buildWheel() {
  const file = csvInput.files && csvInput.files[0];
  if (!file) {
    setError("Please upload a CSV file.");
    return;
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    setError("Only .csv files are allowed.");
    return;
  }

  try {
    const csvText = await readCsvFile(file);
    const parsedEntries = parseCsvText(csvText);
    if (parsedEntries.length < 2) {
      setError("CSV must include at least 2 data rows.");
      return;
    }

    entries = parsedEntries;
  } catch (error) {
    const message = error instanceof Error ? error.message : "CSV parsing failed.";
    setError(message);
    return;
  }

  rotation = 0;
  selectedEntry = null;
  setError("");
  setResultText("");
  remainingText.textContent = `${entries.length} remaining`;
  remainingText.classList.remove("hidden");
  drawWheel();
  spinButton.disabled = false;
  showMode(playMode);
}

function restart() {
  cancelAnimationFrame(animationId);
  cancelAnimationFrame(confettiAnimationId);
  stopSpinMusic();
  window.clearTimeout(revealStopTimer);
  revealSound.pause();
  revealSound.currentTime = 0;
  spinning = false;
  selectedEntry = null;
  entries = [];
  rotation = 0;
  setResultText("");
  remainingText.textContent = "";
  remainingText.classList.add("hidden");
  setError("");
  hideWinnerModal();
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiCanvas.classList.add("hidden");
  drawWheel();
  showMode(setupMode);
}

startButton.addEventListener("click", buildWheel);
spinButton.addEventListener("click", startSpin);
restartLink.addEventListener("click", restart);
closeWinnerModalButton.addEventListener("click", hideWinnerModal);
window.addEventListener("resize", resizeConfettiCanvas);

drawWheel();
resizeConfettiCanvas();
