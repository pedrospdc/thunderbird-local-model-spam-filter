const scanBtn = document.getElementById("scanBtn");
const stopBtn = document.getElementById("stopBtn");
const progressDiv = document.getElementById("progress");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const statusDiv = document.getElementById("status");

let polling = null;

function updateProgressUI(progress, rate) {
  if (!progress || progress.total === 0) return;

  const pct = Math.round((progress.scanned / progress.total) * 100);
  progressBar.style.width = pct + "%";
  const rateStr = rate ? ` — ${rate} emails/s` : "";
  progressText.textContent = `${progress.scanned}/${progress.total} — ${progress.spamFound} spam found${rateStr}`;
}

function setScanningUI() {
  scanBtn.disabled = true;
  scanBtn.textContent = "Scanning...";
  stopBtn.style.display = "block";
  progressDiv.style.display = "block";
  statusDiv.textContent = "";
}

function showDone(result) {
  const prefix = result.cancelled ? "Stopped" : "Done";
  progressBar.style.width = result.cancelled
    ? Math.round((result.scanned / result.total) * 100) + "%"
    : "100%";
  statusDiv.textContent = `${prefix}. Scanned ${result.scanned} messages, found ${result.spamFound} spam. (${result.avgRate} emails/s)`;
  scanBtn.disabled = false;
  scanBtn.textContent = "Scan Current Folder";
  stopBtn.style.display = "none";
}

function startPolling() {
  if (polling) return;
  polling = setInterval(async () => {
    try {
      const state = await messenger.runtime.sendMessage({ action: "getProgress" });
      if (state && state.progress) {
        updateProgressUI(state.progress, state.rate);
      } else {
        clearInterval(polling);
        polling = null;
      }
    } catch (_) {}
  }, 500);
}

// On popup open, check if a scan is already running or just finished
async function restoreState() {
  try {
    const state = await messenger.runtime.sendMessage({ action: "getState" });
    if (state && state.progress) {
      setScanningUI();
      updateProgressUI(state.progress, state.rate);
      startPolling();
    } else if (state && state.lastResult) {
      progressDiv.style.display = "block";
      showDone(state.lastResult);
    }
  } catch (_) {}
}

scanBtn.addEventListener("click", async () => {
  setScanningUI();
  startPolling();

  try {
    const result = await messenger.runtime.sendMessage({ action: "scanFolder" });
    showDone(result);
  } catch (err) {
    statusDiv.textContent = `Error: ${err.message}`;
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Current Folder";
    stopBtn.style.display = "none";
  }

  clearInterval(polling);
  polling = null;
});

stopBtn.addEventListener("click", async () => {
  stopBtn.disabled = true;
  stopBtn.textContent = "Stopping...";
  await messenger.runtime.sendMessage({ action: "stopScan" });
});

restoreState();
