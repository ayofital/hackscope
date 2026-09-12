const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  result: null,
  currentInput: null,
  mode: "idle",
  sources: [],
  saved: JSON.parse(localStorage.getItem("hackscope:dossiers") || "[]"),
  progressTimer: null,
  engineReady: false,
  priorityWeights: null,
  dossiers: [],
  selectedDossierIndex: 0,
  metadata: {},
};

const signalColors = ["#c9f45a", "#8bcbe5", "#c4b8ed", "#f59c7b", "#9fc52e", "#79b7d2"];
const priorityFactorLabels = {
  deadlineUrgency: "Urgency",
  agentFeasibility: "Agent fit",
  strategicFit: "Strategic fit",
  winOpportunity: "Win odds",
  effortReturn: "Effort / return",
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value = "") {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function shortText(value, length = 64) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length - 1).trim()}…` : clean;
}

function currentInput() {
  return {
    seed: $("#seedInput").value.trim(),
    skills: $("#skillsInput").value.trim() || "Not provided",
    timeframe: Number($("#timeframeInput").value) || 48,
    goal: $("#goalInput").value,
  };
}

function confidenceLabel(value = "") {
  return String(value).replace(/\b\w/g, char => char.toUpperCase());
}

function renderDossierView(result, aggregate = result, mode = "research", sources = [], metadata = {}) {
  $("#resultsSection").hidden = false;
  $("#scoreValue").textContent = result.recommendation.fitScore;
  $("#scoreOrbit").style.setProperty("--score", result.recommendation.fitScore);
  $("#ideaName").textContent = result.recommendation.name;
  $("#ideaTagline").textContent = result.recommendation.tagline;
  $("#ideaThesis").textContent = result.recommendation.thesis;
  $("#targetUser").textContent = result.recommendation.targetUser;
  $("#demoMoment").textContent = result.recommendation.demoMoment;
  $("#agentFeasibility").textContent = `${result.recommendation.agentFeasibilityScore}/100 · ${result.recommendation.agentFeasibilityLabel} agent fit`;
  $("#recommendationConfidence").textContent = confidenceLabel(result.ideas[0]?.confidence || "unknown");
  $("#dossierTitle").textContent = shortText(result.hackathon.name, 38);

  $("#organizerName").textContent = result.hackathon.organizerName;
  $("#organizerProfile").textContent = result.hackathon.organizerProfile;
  $("#productMotionTitle").textContent = result.hackathon.productMotionTitle;
  $("#productMotion").textContent = result.hackathon.productMotion;
  $("#judgeSignals").innerHTML = result.hackathon.judgeSignals.map((signal, index) => `
    <article class="signal-card" style="--signal-color:${signalColors[index % signalColors.length]}"><i></i><strong>${escapeHtml(signal.title)}</strong><p>${escapeHtml(signal.detail)} · ${escapeHtml(confidenceLabel(signal.confidence))}</p></article>
  `).join("");
  $("#infrastructureList").innerHTML = result.hackathon.infrastructure.map((item, index) => `
    <article class="infra-item"><i>${String(index + 1).padStart(2,"0")}</i><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.use)}</small></span></article>
  `).join("");
  $("#unknownsList").innerHTML = result.hackathon.unknowns.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  $("#unknownsBox").hidden = !result.hackathon.unknowns.length;

  const queue = aggregate.portfolio?.hackathons || result.portfolio?.hackathons || [];
  $("#queueCount").textContent = String(queue.length).padStart(2, "0");
  $("#priorityList").innerHTML = queue.map((item, index) => {
    const label = item.agentFeasibility.label.toLowerCase();
    const badgeClass = label.includes("high") ? "" : label.includes("low") ? "low" : "mixed";
    const factors = Object.entries(item.factors || {}).map(([key, value]) => `<span>${escapeHtml(priorityFactorLabels[key] || key)} <b>${Number(value)}</b></span>`).join("");
    return `<article class="priority-card">
      <span class="priority-rank">${index + 1}</span>
      <div class="priority-event"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.deadline)} · ${escapeHtml(confidenceLabel(item.confidence || "unknown"))} confidence</span></div>
      <div class="priority-analysis"><p class="priority-rationale">${escapeHtml(item.rationale)}</p>${factors ? `<div class="priority-factors">${factors}</div>` : ""}</div>
      <div class="priority-metrics"><strong>${item.priorityScore}<small>/100</small></strong><span class="agent-badge ${badgeClass}">${escapeHtml(item.agentFeasibility.label)} agent fit</span></div>
    </article>`;
  }).join("");
  const lead = (result.portfolio?.hackathons?.[0] || queue[0])?.agentFeasibility || { autonomousTasks: [], assistedTasks: [], humanTasks: [] };
  $("#agentTasks").innerHTML = lead.autonomousTasks.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  $("#assistedTasks").innerHTML = (lead.assistedTasks || []).map(item => `<li>${escapeHtml(item)}</li>`).join("");
  $("#humanTasks").innerHTML = lead.humanTasks.map(item => `<li>${escapeHtml(item)}</li>`).join("");

  const barColors = ["#c9f45a", "#8bcbe5", "#c4b8ed", "#f59c7b", "#9fc52e"];
  $("#ideaCount").textContent = String(result.ideas.length).padStart(2, "0");
  $("#ideaBoard").innerHTML = result.ideas.map((idea, index) => `
    <article class="idea-card ${index === 0 ? "winner" : ""}">
      ${index === 0 ? '<span class="winner-tag">Best bet</span>' : ""}
      <span class="idea-rank">OPTION ${String(index + 1).padStart(2,"0")} · ${escapeHtml(confidenceLabel(idea.confidence || "unknown"))} confidence</span>
      <h4>${escapeHtml(idea.name)}</h4><p>${escapeHtml(idea.pitch)}</p>
      <div class="mini-bars" title="Alignment, judge appeal, feasibility, differentiation, demo power">
        ${Object.values(idea.scores).map((value, barIndex) => `<span class="mini-bar"><i style="width:${Number(value)}%;--bar-color:${barColors[barIndex]}"></i></span>`).join("")}
      </div>
      <span class="idea-score">${idea.score}<small>/100</small></span>
    </article>
  `).join("");

  $("#reasonCount").textContent = String(result.reasons.length).padStart(2, "0");
  $("#reasonList").innerHTML = result.reasons.map((reason, index) => `<article class="reason-card"><span>${String(index + 1).padStart(2,"0")}</span><h4>${escapeHtml(reason.title)}</h4><p>${escapeHtml(reason.evidence)}</p></article>`).join("");
  $("#riskRows").innerHTML = result.risks.map(item => `<div class="risk-row"><span>${escapeHtml(item.risk)}</span><span>${escapeHtml(item.mitigation)}</span></div>`).join("");

  $("#skillGrid").innerHTML = result.buildKit.skills.map(item => `<article class="skill-card"><span>${escapeHtml(item.area)} · ${escapeHtml(item.priority)}</span><strong>${escapeHtml(item.focus)}</strong><p>${escapeHtml(item.detail)}</p></article>`).join("");
  $("#buildTimeline").innerHTML = result.buildKit.phases.map((phase, index) => `<article class="phase-card"><span>${String(index + 1).padStart(2,"0")} · ${escapeHtml(phase.window)}</span><h4>${escapeHtml(phase.title)}</h4><p>${escapeHtml(phase.actions)}</p><small>${escapeHtml(phase.deliverable)}</small></article>`).join("");
  $("#cutList").innerHTML = result.buildKit.cuts.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  $("#kickoffPrompt").textContent = result.buildKit.kickoffPrompt;

  const live = mode === "research";
  $("#engineLabel").textContent = live ? "Live research engine" : "Saved legacy preview";
  $("#engineSubline").textContent = live ? `${sources.length} source${sources.length === 1 ? "" : "s"} consulted${metadata.cached ? " · served from cache" : ""}` : "Re-run this event for researched results";
  $("#modeChip").classList.toggle("live", live);
  $("#modeChip").innerHTML = `<i></i>${live ? "Live researched" : "Legacy preview"}`;
  $("#evidenceStrip").querySelector("strong").textContent = live ? "Web research complete" : "Legacy unresearched dossier";
  $("#evidenceStrip").querySelector("small").textContent = live ? `${sources.length} traceable source${sources.length === 1 ? "" : "s"} · facts and inferences separated${metadata.cached ? " · no new model call" : ""}` : "This saved result predates live-only research and should not be treated as factual";
  $("#sourcesButton").textContent = live ? `View ${sources.length} sources` : "No sources";
  renderSources();
  updateSaveButton();
}

function renderDossierSwitcher() {
  const dossiers = state.dossiers.length ? state.dossiers : state.result ? [state.result] : [];
  const switcher = $("#dossierSwitcher");
  if (!switcher) return;
  switcher.hidden = dossiers.length < 2;
  $("#dossierSwitcherNote").textContent = dossiers.length > 1
    ? `${dossiers.length} distinct hackathons resolved · select one to inspect its full strategy`
    : "";
  $("#dossierTabs").innerHTML = dossiers.map((dossier, index) => {
    const event = state.result?.portfolio?.hackathons?.find(item => item.name.toLowerCase() === String(dossier.hackathon?.name || "").toLowerCase());
    const active = index === state.selectedDossierIndex;
    return `<button class="dossier-tab${active ? " active" : ""}" type="button" role="tab" aria-selected="${active}" aria-controls="recommendationCard" data-dossier-index="${index}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(shortText(dossier.hackathon?.name || "Unnamed event", 42))}</strong><small>${event?.priorityScore ?? "n/a"}/100 priority</small></button>`;
  }).join("");
}

function renderResult(result, input, mode = "research", sources = [], metadata = {}) {
  state.result = result;
  state.currentInput = input;
  state.mode = mode;
  state.sources = sources;
  state.metadata = metadata;
  state.dossiers = Array.isArray(result?.dossiers) && result.dossiers.length ? result.dossiers : [result];
  state.selectedDossierIndex = 0;
  renderDossierSwitcher();
  renderDossierView(state.dossiers[0], result, mode, sources, metadata);
}

function selectDossier(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.dossiers.length) return;
  state.selectedDossierIndex = index;
  renderDossierSwitcher();
  renderDossierView(state.dossiers[index], state.result, state.mode, state.sources, state.metadata);
}

function activeDossier() {
  return state.dossiers[state.selectedDossierIndex] || state.result;
}

function renderSources() {
  if (!state.sources.length) {
    $("#sourceList").innerHTML = '<p class="priority-rationale">No sources are attached to this saved legacy dossier. Re-run it with live research enabled.</p>';
    return;
  }
  $("#sourceList").innerHTML = state.sources.map(source => {
    const url = safeUrl(source.url);
    const host = url === "#" ? "Source" : new URL(url).hostname.replace(/^www\./, "");
    return `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(source.title || host)}</span><small>${escapeHtml(host)} ↗</small></a>`;
  }).join("");
}

async function research(input) {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Research failed with status ${response.status}`);
  return { result: payload.result, mode: "research", sources: payload.sources || [], cached: Boolean(payload.cached), provider: payload.provider, model: payload.model };
}

function setEngineStatus({ ready, title, detail }) {
  state.engineReady = ready;
  $("#engineLabel").textContent = title;
  $("#engineSubline").textContent = detail;
  $("#modeChip").classList.toggle("live", ready);
  $("#modeChip").innerHTML = `<i></i>${ready ? "Live research ready" : "Research unavailable"}`;
  $("#engineNotice").hidden = ready;
  $("#engineNoticeTitle").textContent = title;
  $("#engineNoticeDetail").textContent = detail;
  $("#researchButton").disabled = !ready;
}

function renderPriorityFormula(weights) {
  if (!weights) return;
  state.priorityWeights = weights;
  $("#priorityFormula").innerHTML = Object.entries(weights).map(([key, weight]) => `<span><b>${Math.round(Number(weight) * 100)}%</b> ${escapeHtml(priorityFactorLabels[key] || key)}</span>`).join("");
}

async function checkEngineStatus() {
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) throw new Error("Status check failed");
    const status = await response.json();
    renderPriorityFormula(status.priorityWeights);
    const providerNames = Object.entries(status.providers || {})
      .filter(([, enabled]) => enabled)
      .map(([name]) => name === "gemini" ? "Gemini" : name === "ollama" ? "Ollama" : "OpenAI");
    const providerName = providerNames.length > 1 ? `${providerNames[0]} + ${providerNames.slice(1).join(" + ")}` : providerNames[0] || (status.provider === "gemini" ? "Gemini" : "OpenAI");
    setEngineStatus(status.liveResearch
      ? { ready: true, title: `${providerName} research engine`, detail: `${status.searchMode || "web research enabled"}${(status.fallbackProviders || []).length ? " · automatic fallback enabled" : ""}` }
      : { ready: false, title: "Live research not configured", detail: "Set GEMINI_API_KEY or OPENAI_API_KEY in .env, then restart HackScope." });
  } catch {
    setEngineStatus({ ready: false, title: "Research server unavailable", detail: "Start the HackScope server and refresh this page." });
  }
}

function startProgress() {
  const progress = $("#researchProgress");
  const steps = $$(".progress-steps span");
  let value = 8;
  let currentStep = 0;
  progress.hidden = false;
  $("#resultsSection").style.opacity = ".35";
  $("#progressPercent").textContent = `${value}%`;
  $("#progressBar").style.width = `${value}%`;
  steps.forEach((step, index) => step.classList.toggle("active", index === 0));
  clearInterval(state.progressTimer);
  state.progressTimer = setInterval(() => {
    value = Math.min(91, value + Math.ceil((94 - value) * .12));
    currentStep = Math.min(4, Math.floor(value / 20));
    $("#progressPercent").textContent = `${value}%`;
    $("#progressBar").style.width = `${value}%`;
    steps.forEach((step, index) => step.classList.toggle("active", index <= currentStep));
  }, 750);
}

function stopProgress() {
  clearInterval(state.progressTimer);
  $("#researchProgress").hidden = true;
  $("#resultsSection").style.opacity = "1";
}

async function finishProgress() {
  clearInterval(state.progressTimer);
  $("#progressPercent").textContent = "100%";
  $("#progressBar").style.width = "100%";
  $$(".progress-steps span").forEach(step => step.classList.add("active"));
  await new Promise(resolve => setTimeout(resolve, 420));
  $("#researchProgress").hidden = true;
  $("#resultsSection").style.opacity = "1";
}

function dossierMarkdown() {
  const r = activeDossier();
  const portfolio = state.result?.portfolio || r?.portfolio;
  const input = state.currentInput;
  if (!r || !input || !portfolio) return "";
  const sourceSection = state.sources.length ? state.sources.map((source, index) => `${index + 1}. [${source.title || source.url}](${source.url})`).join("\n") : "No sources are attached. Re-run this dossier with live research before relying on it.";
  return `# HackScope dossier: ${r.hackathon.name}

> Mode: ${state.mode === "research" ? "Live web research" : "Legacy unresearched dossier"}  
> Objective: ${input.goal}  
> Time box: ${input.timeframe} hours  
> Team strengths: ${input.skills}

## Priority queue

${portfolio.hackathons.map((item, index) => `${index + 1}. **${item.name}** — priority ${item.priorityScore}/100, agent feasibility ${item.agentFeasibility.score}/100, confidence ${item.confidence || "unknown"}\n   - Deadline: ${item.deadline}\n   - Factors: urgency ${item.factors?.deadlineUrgency ?? "n/a"}; agent fit ${item.factors?.agentFeasibility ?? "n/a"}; strategic fit ${item.factors?.strategicFit ?? "n/a"}; win opportunity ${item.factors?.winOpportunity ?? "n/a"}; effort/return ${item.factors?.effortReturn ?? "n/a"}\n   - ${item.rationale}`).join("\n")}

## Recommended idea: ${r.recommendation.name}

**Fit:** ${r.recommendation.fitScore}/100  
**Agent feasibility:** ${r.recommendation.agentFeasibilityScore}/100 — ${r.recommendation.agentFeasibilityLabel}

${r.recommendation.tagline}

${r.recommendation.thesis}

- Target user: ${r.recommendation.targetUser}
- Winning demo: ${r.recommendation.demoMoment}

## Hackathon intelligence

### Organizer and product

**${r.hackathon.organizerName}** — ${r.hackathon.organizerProfile}

### Strategic motion

**${r.hackathon.productMotionTitle}** — ${r.hackathon.productMotion}

### Judge signals

${r.hackathon.judgeSignals.map(item => `- **${item.title}:** ${item.detail} (${item.confidence})`).join("\n")}

### Infrastructure

${r.hackathon.infrastructure.map(item => `- **${item.name}:** ${item.use}`).join("\n")}

### Open questions

${r.hackathon.unknowns.map(item => `- ${item}`).join("\n") || "- None recorded"}

## Ranked idea board

${r.ideas.map((idea, index) => `${index + 1}. **${idea.name} — ${idea.score}/100** (${idea.confidence || "unknown"} confidence)\n   - ${idea.pitch}\n   - Alignment ${idea.scores.alignment}; judge appeal ${idea.scores.judgeAppeal}; feasibility ${idea.scores.feasibility}; differentiation ${idea.scores.differentiation}; demo ${idea.scores.demo}`).join("\n")}

## Why this idea wins

${r.reasons.map((reason, index) => `${index + 1}. **${reason.title}** — ${reason.evidence}`).join("\n")}

## Risks and mitigations

${r.risks.map(item => `- **${item.risk}:** ${item.mitigation}`).join("\n")}

## Agent work split

### Agents can execute

${(r.portfolio?.hackathons?.[0] || portfolio.hackathons[0]).agentFeasibility.autonomousTasks.map(item => `- ${item}`).join("\n")}

### Human action required

${(r.portfolio?.hackathons?.[0] || portfolio.hackathons[0]).agentFeasibility.humanTasks.map(item => `- ${item}`).join("\n")}

### Agents can assist

${((r.portfolio?.hackathons?.[0] || portfolio.hackathons[0]).agentFeasibility.assistedTasks || []).map(item => `- ${item}`).join("\n")}

## Skill map

${r.buildKit.skills.map(item => `- **${item.area} / ${item.focus} (${item.priority}):** ${item.detail}`).join("\n")}

## Build workflow

${r.buildKit.phases.map((phase, index) => `${index + 1}. **${phase.window} — ${phase.title}**\n   - ${phase.actions}\n   - Deliverable: ${phase.deliverable}`).join("\n")}

### Cut if behind

${r.buildKit.cuts.map(item => `- ${item}`).join("\n")}

## Project kickoff prompt

${r.buildKit.kickoffPrompt}

## Sources

${sourceSection}
`;
}

function downloadMarkdown() {
  const markdown = dossierMarkdown();
  if (!markdown) return;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `hackscope-${activeDossier().hackathon.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "dossier"}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
  showToast("Portable strategy kit exported");
}

function showToast(message) {
  $("#toast p").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => $("#toast").classList.remove("visible"), 2200);
}

async function copyText(value, success) {
  try { await navigator.clipboard.writeText(value); showToast(success); }
  catch { showToast("Clipboard access was blocked"); }
}

function seedKey(input) { return input.seed.toLowerCase().replace(/\s+/g, " ").trim(); }

function updateSaveButton() {
  const saved = state.currentInput && state.saved.some(item => seedKey(item.input) === seedKey(state.currentInput));
  const saveButton = $("#saveButton");
  saveButton.classList.toggle("active", Boolean(saved));
  saveButton.setAttribute("aria-label", saved ? "Remove saved dossier" : "Save dossier");
  saveButton.setAttribute("title", saved ? "Remove saved dossier" : "Save dossier");
  $("#savedCount").textContent = state.saved.length;
}

function saveCurrent() {
  if (!state.result || !state.currentInput) return;
  const index = state.saved.findIndex(item => seedKey(item.input) === seedKey(state.currentInput));
  if (index >= 0) { state.saved.splice(index, 1); showToast("Removed from dossiers"); }
  else { state.saved.unshift({ input: state.currentInput, result: state.result, sources: state.sources, mode: state.mode, savedAt: new Date().toISOString() }); showToast("Dossier saved locally"); }
  state.saved = state.saved.slice(0, 20);
  localStorage.setItem("hackscope:dossiers", JSON.stringify(state.saved));
  updateSaveButton();
}

function renderSaved() {
  if (!state.saved.length) {
    $("#savedGrid").innerHTML = '<div class="saved-empty">No saved dossiers yet. Research an event and save the result here.</div>';
    return;
  }
  $("#savedGrid").innerHTML = state.saved.map((item, index) => `<button class="saved-card" type="button" data-saved-index="${index}"><span class="saved-meta"><span>${new Date(item.savedAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><strong>${item.result.recommendation.fitScore}/100</strong></span><h3>${escapeHtml(item.result.hackathon.name)}</h3><p>${escapeHtml(item.result.recommendation.name)} · ${item.result.portfolio.hackathons.length} event${item.result.portfolio.hackathons.length === 1 ? "" : "s"} ranked</p></button>`).join("");
}

function showView(view) {
  const saved = view === "saved";
  $("#workspaceView").hidden = saved;
  $(".hero").hidden = saved;
  $("#savedView").hidden = !saved;
  $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.nav === view));
  if (saved) renderSaved();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function selectTab(name) {
  $$('[data-tab]').forEach(tab => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    const panel = $(`#${tab.dataset.tab}Panel`);
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
}

function resetDossier() {
  $("#seedInput").value = "";
  $("#resultsSection").hidden = true;
  $("#dossierTitle").textContent = "New dossier";
  state.result = null;
  state.currentInput = null;
  state.sources = [];
  state.dossiers = [];
  state.selectedDossierIndex = 0;
  state.metadata = {};
  $("#dossierSwitcher").hidden = true;
  updateSeedCount();
  updateSaveButton();
  showView("workspace");
  $("#seedInput").focus();
}

function updateSeedCount() { $("#seedCount").textContent = $("#seedInput").value.length; }

$("#researchForm").addEventListener("submit", async event => {
  event.preventDefault();
  const input = currentInput();
  if (input.seed.length < 3) { $("#seedInput").focus(); showToast("Add a hackathon name or link first"); return; }
  if (!state.engineReady) { showToast("Live research is not configured yet"); return; }
  const button = $("#researchButton");
  button.classList.add("loading");
  button.setAttribute("aria-busy", "true");
  startProgress();
  try {
    const started = Date.now();
    const payload = await research(input);
    const remaining = Math.max(0, 900 - (Date.now() - started));
    await new Promise(resolve => setTimeout(resolve, remaining));
    renderResult(payload.result, input, payload.mode, payload.sources, payload);
    await finishProgress();
    // The submitted signal is preserved in state for saving and exporting, so the
    // textarea can return to its empty placeholder state once research succeeds.
    $("#seedInput").value = "";
    updateSeedCount();
    $("#resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    stopProgress();
    $("#engineNotice").hidden = false;
    $("#engineNoticeTitle").textContent = "Research could not complete";
    $("#engineNoticeDetail").textContent = error.message;
    showToast("Research failed — details are shown above");
  } finally {
    button.classList.remove("loading");
    button.removeAttribute("aria-busy");
  }
});

$("#seedInput").addEventListener("input", updateSeedCount);
$$('[data-tab]').forEach(tab => tab.addEventListener("click", () => selectTab(tab.dataset.tab)));
$$('[data-nav]').forEach(button => button.addEventListener("click", () => showView(button.dataset.nav)));
$(".brand").addEventListener("click", event => { event.preventDefault(); resetDossier(); });
$("#savedMobileButton").addEventListener("click", () => showView("saved"));
$("#newDossierButton").addEventListener("click", resetDossier);
$("#backToWorkspace").addEventListener("click", () => showView("workspace"));
$("#saveButton").addEventListener("click", saveCurrent);
$("#exportButton").addEventListener("click", downloadMarkdown);
$("#downloadBuildKit").addEventListener("click", downloadMarkdown);
$("#copyKickoffButton").addEventListener("click", () => activeDossier()?.buildKit?.kickoffPrompt && copyText(activeDossier().buildKit.kickoffPrompt, "Kickoff prompt copied"));
$("#sourcesButton").addEventListener("click", () => { selectTab("intelligence"); $("#sourcesDrawer").hidden = false; $("#sourcesDrawer").scrollIntoView({ behavior: "smooth", block: "nearest" }); });
$("#closeSources").addEventListener("click", () => { $("#sourcesDrawer").hidden = true; });
$("#dossierTabs").addEventListener("click", event => {
  const tab = event.target.closest("[data-dossier-index]");
  if (tab) selectDossier(Number(tab.dataset.dossierIndex));
});
$("#savedGrid").addEventListener("click", event => {
  const card = event.target.closest("[data-saved-index]");
  if (!card) return;
  const item = state.saved[Number(card.dataset.savedIndex)];
  $("#seedInput").value = item.input.seed;
  $("#skillsInput").value = item.input.skills;
  $("#timeframeInput").value = item.input.timeframe;
  $("#goalInput").value = item.input.goal;
  updateSeedCount();
  renderResult(item.result, item.input, item.mode, item.sources || []);
  showView("workspace");
});
$("#themeButton").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("hackscope:theme", next);
});

const savedTheme = localStorage.getItem("hackscope:theme");
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
updateSeedCount();
updateSaveButton();
$("#resultsSection").hidden = true;
$("#dossierTitle").textContent = "New dossier";
checkEngineStatus();
