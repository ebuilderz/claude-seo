const state = { audits: [], auditTypes: {}, selected: null };
const $ = (selector) => document.querySelector(selector);

async function api(url, options) {
  const response = await fetch(url, options);
  const type = response.headers.get("content-type") || "";
  const body = type.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(body?.error || body || `Request failed (${response.status})`);
  return body;
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";
}

function renderList() {
  const container = $("#audit-list");
  container.replaceChildren();
  if (!state.audits.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No audits yet.";
    container.append(empty);
    return;
  }
  for (const audit of state.audits) {
    const row = $("#audit-row").content.firstElementChild.cloneNode(true);
    row.querySelector("strong").textContent = new URL(audit.url).hostname;
    row.querySelector(".meta").textContent = `${state.auditTypes[audit.type] || audit.type} · ${formatDate(audit.createdAt)}`;
    row.querySelector(".badge").textContent = audit.status;
    if (state.selected === audit.id) row.classList.add("selected");
    row.addEventListener("click", () => selectAudit(audit.id));
    container.append(row);
  }
}

function completionText(audit) {
  if (audit.error) return audit.error;
  if (audit.status !== "completed") return audit.status === "running" ? "Audit running. Refresh for progress." : "Audit queued.";
  const c = audit.completion || {};
  const u = audit.usage || {};
  const details = [
    c.reportWords && `${c.reportWords.toLocaleString()} report words`,
    c.categories && `${c.categories} scored categories`,
    c.findingFiles && `${c.findingFiles} specialist findings`,
    c.screenshots && `${c.screenshots} screenshots`,
    c.artifacts && `${c.artifacts} artifacts`,
    u.outputTokens && `${u.outputTokens.toLocaleString()} model output tokens`,
  ].filter(Boolean);
  return `Completed ${formatDate(audit.completedAt)}${details.length ? ` · ${details.join(" · ")}` : ""}`;
}

async function selectAudit(id) {
  state.selected = id;
  renderList();
  const audit = state.audits.find((item) => item.id === id);
  if (!audit) return;
  $("#empty").hidden = true;
  $("#report").hidden = false;
  $("#report-type").textContent = state.auditTypes[audit.type] || audit.type;
  $("#report-title").textContent = new URL(audit.url).hostname;
  $("#report-url").href = audit.url;
  $("#report-url").textContent = audit.url;
  $("#report-status").textContent = completionText(audit);
  $("#download").href = `/api/audits/${id}/report?download=1`;
  $("#download").hidden = !audit.reportAvailable;
  $("#report-content").textContent = audit.reportAvailable ? "Loading report…" : "The complete report will appear after all quality gates pass.";
  $("#artifact-list").replaceChildren();
  if (!audit.reportAvailable) return;
  try {
    $("#report-content").innerHTML = await api(`/api/audits/${id}/report?format=html`);
    const { artifacts } = await api(`/api/audits/${id}/artifacts`);
    for (const artifact of artifacts) {
      const link = document.createElement("a");
      link.href = `/api/audits/${id}/artifacts/${artifact.path.split("/").map(encodeURIComponent).join("/")}`;
      link.textContent = `${artifact.path} (${Math.max(1, Math.round(artifact.size / 1024))} KB)`;
      $("#artifact-list").append(link);
    }
  } catch (error) {
    $("#report-content").textContent = error.message;
  }
}

async function refresh() {
  const { audits } = await api("/api/audits");
  state.audits = audits;
  renderList();
  if (state.selected) await selectAudit(state.selected);
}

async function initialize() {
  const config = await api("/api/config");
  state.auditTypes = config.auditTypes;
  $("#app-name").textContent = config.appName;
  $("#version").textContent = config.upstreamVersion;
  $("#description").textContent = config.appDescription;
  $("#user").textContent = config.user;
  for (const [value, label] of Object.entries(config.auditTypes)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    $("#type").append(option);
  }
  const guards = config.costGuards;
  $("#cost-guards").textContent = `${guards.model} · ${guards.reasoningEffort} reasoning · up to ${guards.maxAuditsPer24Hours} audits/24h · one audit at a time`;
  await refresh();
}

$("#audit-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  $("#form-message").textContent = "Queueing audit…";
  try {
    const form = new FormData(event.currentTarget);
    const result = await api("/api/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: form.get("url"), type: form.get("type") }),
    });
    $("#form-message").textContent = "Audit queued. Full audits can take 10–30 minutes.";
    await refresh();
    await selectAudit(result.audit.id);
  } catch (error) {
    $("#form-message").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
$("#refresh").addEventListener("click", () => refresh().catch((error) => { $("#form-message").textContent = error.message; }));
initialize().catch((error) => { $("#form-message").textContent = error.message; });
