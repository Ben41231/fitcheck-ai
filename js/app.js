const STORAGE_KEY = "fitcheck_api_key";
const STORAGE_MODEL = "fitcheck_model";

const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");
const clearKeyBtn = document.getElementById("clear-key-btn");
const keyStatus = document.getElementById("key-status");
const modelSelect = document.getElementById("model-select");

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const previewGrid = document.getElementById("preview-grid");
const styleInput = document.getElementById("style-input");
const roastToggle = document.getElementById("roast-toggle");
const rateBtn = document.getElementById("rate-btn");
const errorMsg = document.getElementById("error-msg");

const resultsSection = document.getElementById("results-section");
const resultsDiv = document.getElementById("results");
const resetBtn = document.getElementById("reset-btn");

let selectedFiles = [];

function refreshKeyStatus() {
  const key = localStorage.getItem(STORAGE_KEY);
  if (key) {
    keyStatus.textContent = "connected";
    keyStatus.classList.add("connected");
    apiKeyInput.value = key;
  } else {
    keyStatus.textContent = "not connected";
    keyStatus.classList.remove("connected");
  }
}

function loadModelPreference() {
  const saved = localStorage.getItem(STORAGE_MODEL);
  if (saved) modelSelect.value = saved;
}

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  localStorage.setItem(STORAGE_KEY, key);
  refreshKeyStatus();
});

clearKeyBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  apiKeyInput.value = "";
  refreshKeyStatus();
});

modelSelect.addEventListener("change", () => {
  localStorage.setItem(STORAGE_MODEL, modelSelect.value);
});

dropzone.addEventListener("click", () => fileInput.click());

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  addFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});

function addFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
  selectedFiles = selectedFiles.concat(files).slice(0, 6);
  renderPreviews();
}

function renderPreviews() {
  previewGrid.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    const thumb = document.createElement("div");
    thumb.className = "preview-thumb";
    thumb.innerHTML = `<img src="${url}" alt="upload ${index + 1}"><button class="remove" data-index="${index}">&times;</button>`;
    previewGrid.appendChild(thumb);
  });
  previewGrid.querySelectorAll(".remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.target.dataset.index);
      selectedFiles.splice(idx, 1);
      renderPreviews();
    });
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

function hideError() {
  errorMsg.hidden = true;
}

function buildPrompt(mode, style, roast) {
  const styleLine = style
    ? `The user says their style is: "${style}". Take this into account and note whether the outfit actually matches it.`
    : `The user did not specify a style — estimate their style from the photo(s) yourself.`;

  const roastLine = roast
    ? `Also include a "roast" field: a witty, savage, funny roast of the outfit (playful, not cruel or discriminatory about body/appearance — roast the clothing choices, not the person).`
    : `Do not include a "roast" field.`;

  if (mode === "closet") {
    return `You are a professional fashion stylist AI. You are looking at photos of someone's closet/wardrobe items.
${styleLine}
Identify distinct clothing items you can see, and suggest 2-4 complete outfit combinations that could be built from these items, each rated 1-10, referencing current general fashion trends and color theory.
${roastLine}
Respond with ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "mode": "closet",
  "detected_style": string,
  "items": [{"name": string, "category": string}],
  "outfit_suggestions": [{"items": [string], "score": number, "reason": string}],
  "trend_notes": string,
  "roast": string or omit this key entirely if roast mode is off
}`;
  }

  return `You are a professional fashion stylist AI. You are looking at a photo of a single outfit someone is wearing or has laid out.
${styleLine}
Rate the outfit 1-10 considering fit, color coordination, and alignment with current general fashion trends.
${roastLine}
Respond with ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "mode": "outfit",
  "detected_style": string,
  "score": number,
  "colors": [string as hex codes],
  "trend_notes": string,
  "feedback": string,
  "improvement_tips": [string],
  "roast": string or omit this key entirely if roast mode is off
}`;
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in response");
  return JSON.parse(text.slice(start, end + 1));
}

async function callClaude(apiKey, model, imageBlocks, promptText) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      messages: [
        {
          role: "user",
          content: [...imageBlocks, { type: "text", text: promptText }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${body}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((b) => b.type === "text");
  return extractJson(textBlock.text);
}

function scoreClass(score) {
  if (score >= 7) return "good";
  if (score >= 4) return "mid";
  return "bad";
}

function renderResults(result) {
  resultsDiv.innerHTML = "";

  if (result.mode === "outfit") {
    const cls = scoreClass(result.score);
    const colorSwatches = (result.colors || [])
      .map((c) => `<span class="swatch" style="background:${c}"></span>`)
      .join("");
    const tips = (result.improvement_tips || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");

    resultsDiv.innerHTML = `
      <div class="score-display ${cls}">${result.score}<span class="score-out-of">/10</span></div>
      <div class="detected-style">Style: <strong>${escapeHtml(result.detected_style || "unknown")}</strong></div>
      <div class="color-swatches">${colorSwatches}</div>
      ${result.roast ? `<div class="result-block roast-block"><h3>Roast 🔥</h3><p>${escapeHtml(result.roast)}</p></div>` : ""}
      <div class="result-block"><h3>Feedback</h3><p>${escapeHtml(result.feedback || "")}</p></div>
      <div class="result-block"><h3>Trend notes</h3><p>${escapeHtml(result.trend_notes || "")}</p></div>
      ${tips ? `<div class="result-block"><h3>How to improve</h3><ul>${tips}</ul></div>` : ""}
    `;
  } else {
    const items = (result.items || [])
      .map((i) => `<li>${escapeHtml(i.name)} <span class="muted">(${escapeHtml(i.category)})</span></li>`)
      .join("");
    const suggestions = (result.outfit_suggestions || [])
      .map(
        (s) => `
        <div class="suggestion-card">
          <span class="suggestion-score">${s.score}/10</span>
          <strong>${escapeHtml((s.items || []).join(" + "))}</strong>
          <p class="muted">${escapeHtml(s.reason || "")}</p>
        </div>`
      )
      .join("");

    resultsDiv.innerHTML = `
      <div class="detected-style">Closet style: <strong>${escapeHtml(result.detected_style || "unknown")}</strong></div>
      ${result.roast ? `<div class="result-block roast-block"><h3>Roast 🔥</h3><p>${escapeHtml(result.roast)}</p></div>` : ""}
      <div class="result-block"><h3>Items spotted</h3><ul>${items}</ul></div>
      <div class="result-block"><h3>Trend notes</h3><p>${escapeHtml(result.trend_notes || "")}</p></div>
      <h3 style="text-align:left;color:var(--muted);text-transform:uppercase;font-size:0.95rem;margin-top:20px;">Suggested outfits</h3>
      ${suggestions}
    `;
  }

  resultsSection.hidden = false;
  resultsSection.scrollIntoView({ behavior: "smooth" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

rateBtn.addEventListener("click", async () => {
  hideError();
  const apiKey = localStorage.getItem(STORAGE_KEY);
  if (!apiKey) {
    showError("Add your Claude API key above first.");
    return;
  }
  if (selectedFiles.length === 0) {
    showError("Upload at least one photo.");
    return;
  }

  rateBtn.disabled = true;
  rateBtn.innerHTML = `<span class="spinner"></span> Analyzing...`;
  resultsSection.hidden = true;

  try {
    const mode = selectedFiles.length > 1 ? "closet" : "outfit";
    const imageBlocks = await Promise.all(
      selectedFiles.map(async (file) => ({
        type: "image",
        source: {
          type: "base64",
          media_type: file.type,
          data: await fileToBase64(file),
        },
      }))
    );
    const prompt = buildPrompt(mode, styleInput.value.trim(), roastToggle.checked);
    const model = modelSelect.value;
    const result = await callClaude(apiKey, model, imageBlocks, prompt);
    renderResults(result);
  } catch (err) {
    showError(err.message || "Something went wrong.");
  } finally {
    rateBtn.disabled = false;
    rateBtn.textContent = "Rate My Fit";
  }
});

resetBtn.addEventListener("click", () => {
  selectedFiles = [];
  renderPreviews();
  styleInput.value = "";
  roastToggle.checked = false;
  resultsSection.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

refreshKeyStatus();
loadModelPreference();
