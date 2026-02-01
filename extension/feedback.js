const logTable = document.getElementById("logTable");
const logBody = document.getElementById("logBody");
const emptyMsg = document.getElementById("emptyMsg");
const refineBtn = document.getElementById("refineBtn");
const spinner = document.getElementById("spinner");
const refineArea = document.getElementById("refineArea");
const proposedPrompt = document.getElementById("proposedPrompt");
const applyBtn = document.getElementById("applyBtn");
const dismissBtn = document.getElementById("dismissBtn");
const statusDiv = document.getElementById("status");

let log = [];

function hasCorrections() {
  return log.some((e) => e.userVerdict !== null && e.userVerdict !== e.classification);
}

function renderTable() {
  logBody.innerHTML = "";
  if (log.length === 0) {
    logTable.style.display = "none";
    emptyMsg.style.display = "block";
    refineBtn.disabled = true;
    return;
  }
  logTable.style.display = "table";
  emptyMsg.style.display = "none";

  log.forEach((entry, idx) => {
    const tr = document.createElement("tr");
    if (entry.userVerdict !== null && entry.userVerdict !== entry.classification) {
      tr.classList.add("corrected");
    }

    const tdSubject = document.createElement("td");
    tdSubject.textContent = entry.subject || "(no subject)";
    tdSubject.title = entry.subject || "";
    tdSubject.style.maxWidth = "200px";
    tdSubject.style.overflow = "hidden";
    tdSubject.style.textOverflow = "ellipsis";
    tdSubject.style.whiteSpace = "nowrap";

    const tdFrom = document.createElement("td");
    tdFrom.textContent = entry.from || "";
    tdFrom.title = entry.from || "";
    tdFrom.style.maxWidth = "150px";
    tdFrom.style.overflow = "hidden";
    tdFrom.style.textOverflow = "ellipsis";
    tdFrom.style.whiteSpace = "nowrap";

    const tdDecision = document.createElement("td");
    tdDecision.textContent = entry.classification;

    const tdConf = document.createElement("td");
    tdConf.textContent = (entry.confidence ?? 0).toFixed(2);

    const tdVerdict = document.createElement("td");
    tdVerdict.classList.add("verdict-btns");
    const agreeBtn = document.createElement("button");
    agreeBtn.textContent = "\u2713";
    agreeBtn.title = "Agree with model";
    const disagreeBtn = document.createElement("button");
    disagreeBtn.textContent = "\u2717";
    disagreeBtn.title = "Disagree (flip to " + (entry.classification === "spam" ? "ham" : "spam") + ")";

    if (entry.userVerdict === entry.classification) {
      agreeBtn.classList.add("active-agree");
    } else if (entry.userVerdict !== null && entry.userVerdict !== entry.classification) {
      disagreeBtn.classList.add("active-disagree");
    }

    agreeBtn.addEventListener("click", async () => {
      await messenger.runtime.sendMessage({
        action: "setUserVerdict", index: idx, verdict: entry.classification
      });
      log[idx].userVerdict = entry.classification;
      renderTable();
    });

    disagreeBtn.addEventListener("click", async () => {
      const opposite = entry.classification === "spam" ? "ham" : "spam";
      await messenger.runtime.sendMessage({
        action: "setUserVerdict", index: idx, verdict: opposite
      });
      log[idx].userVerdict = opposite;
      renderTable();
    });

    tdVerdict.appendChild(agreeBtn);
    tdVerdict.appendChild(document.createTextNode(" "));
    tdVerdict.appendChild(disagreeBtn);

    tr.appendChild(tdSubject);
    tr.appendChild(tdFrom);
    tr.appendChild(tdDecision);
    tr.appendChild(tdConf);
    tr.appendChild(tdVerdict);
    logBody.appendChild(tr);
  });

  refineBtn.disabled = !hasCorrections();
}

async function loadLog() {
  log = await messenger.runtime.sendMessage({ action: "getClassificationLog" });
  renderTable();
}

refineBtn.addEventListener("click", async () => {
  refineBtn.disabled = true;
  spinner.style.display = "block";
  refineArea.style.display = "none";
  statusDiv.textContent = "";

  try {
    const result = await messenger.runtime.sendMessage({ action: "refinePrompt" });
    spinner.style.display = "none";
    if (result.error) {
      statusDiv.textContent = result.error;
      refineBtn.disabled = !hasCorrections();
      return;
    }
    proposedPrompt.value = result.proposedPrompt;
    refineArea.style.display = "block";
  } catch (err) {
    spinner.style.display = "none";
    statusDiv.textContent = "Error: " + err.message;
    refineBtn.disabled = !hasCorrections();
  }
});

applyBtn.addEventListener("click", async () => {
  await messenger.runtime.sendMessage({
    action: "applyPrompt", prompt: proposedPrompt.value
  });
  refineArea.style.display = "none";
  statusDiv.textContent = "Prompt updated. Changes will apply to future classifications.";
});

dismissBtn.addEventListener("click", () => {
  refineArea.style.display = "none";
  refineBtn.disabled = !hasCorrections();
});

loadLog();
