const state = { audits: [], auditTypes: {}, selectedId: null, poller: null };

const elements = {
  appName: document.querySelector("#app-name"),
  appDescription: document.querySelector("#app-description"),
  userEmail: document.querySelector("#user-email"),
  form: document.querySelector("#audit-form"),
  url: document.querySelector("#url"),
  type: document.querySelector("#type"),
  submit: document.querySelector("#submit-button"),
  formMessage: document.querySelector("#form-message"),
  refresh: document.querySelector("#refresh-button"),
  list: document.querySelector("#audit-list"),
  template: document.querySelector("#audit-row-template"),
  emptyReport: document.querySelector("#empty-report"),
  reportView: document.querySelector("#report-view"),
  reportType: document.querySelector("#report-type"),
  reportTitle: document.querySelector("#report-title"),
  reportUrl: document.querySelector("#report-url"),
  reportStatus: document.querySelector("#report-status"),
  reportContent: document.querySelector("#report-content"),
  download: document.querySelector("#download-link"),
};

async function api(url, options) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(body.error || "The request failed.");
  return body;
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "";
}

function normalizedUrl(value) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function renderList() {
  elements.list.replaceChildren();
  if (!state.audits.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = "No audits yet. Start with a website above and team history will appear here.";
    elements.list.append(empty);
    return;
  }

  for (const audit of state.audits) {
    const row = elements.template.content.firstElementChild.cloneNode(true);
    row.dataset.id = audit.id;
    row.classList.toggle("active", audit.id === state.selectedId);
    row.querySelector(".audit-host").textContent = new URL(audit.url).hostname;
    row.querySelector(".audit-meta").textContent = `${state.auditTypes[audit.type] || audit.type} | ${formatDate(audit.createdAt)}`;
    const status = row.querySelector(".audit-state");
    status.textContent = audit.status;
    status.classList.add(audit.status);
    row.addEventListener("click", () => selectAudit(audit.id));
    elements.list.append(row);
  }
}

async function selectAudit(id) {
  state.selectedId = id;
  renderList();
  const audit = state.audits.find((item) => item.id === id);
  if (!audit) return;

  elements.emptyReport.hidden = true;
  elements.reportView.hidden = false;
  elements.reportType.textContent = state.auditTypes[audit.type] || audit.type;
  elements.reportTitle.textContent = new URL(audit.url).hostname;
  elements.reportUrl.href = audit.url;
  elements.reportUrl.textContent = audit.url;
  elements.download.href = `/api/audits/${audit.id}/report?download=1`;
  elements.download.hidden = !audit.reportAvailable;
  elements.reportStatus.textContent = audit.error
    ? `Failed: ${audit.error}`
    : audit.status === "completed"
      ? `Completed ${formatDate(audit.completedAt)} by ${audit.requestedBy}`
      : audit.status === "running"
        ? "Audit in progress. This view refreshes automatically."
        : "Queued. It will begin when the current audit finishes.";
  elements.reportContent.textContent = audit.reportAvailable
    ? "Loading report..."
    : "The report will appear here when the audit completes.";

  if (audit.reportAvailable) {
    try {
      elements.reportContent.textContent = await api(`/api/audits/${audit.id}/report`);
    } catch (error) {
      elements.reportContent.textContent = error.message;
    }
  }
}

async function refreshAudits() {
  const data = await api("/api/audits");
  state.audits = data.audits;
  renderList();
  if (state.selectedId) await selectAudit(state.selectedId);
}

async function initialize() {
  try {
    const config = await api("/api/config");
    state.auditTypes = config.auditTypes;
    elements.appName.textContent = config.appName;
    elements.appDescription.textContent = config.appDescription;
    elements.userEmail.textContent = config.user;
    document.title = config.appName;
    for (const [value, label] of Object.entries(config.auditTypes)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      elements.type.append(option);
    }
    await refreshAudits();
    state.poller = setInterval(() => refreshAudits().catch(() => {}), 8_000);
  } catch (error) {
    elements.formMessage.textContent = error.message;
    elements.formMessage.classList.add("error");
  }
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.submit.disabled = true;
  elements.formMessage.textContent = "Adding audit to the queue...";
  elements.formMessage.classList.remove("error");
  try {
    const data = await api("/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: normalizedUrl(elements.url.value), type: elements.type.value }),
    });
    elements.url.value = "";
    elements.formMessage.textContent = "Audit queued successfully.";
    await refreshAudits();
    await selectAudit(data.audit.id);
  } catch (error) {
    elements.formMessage.textContent = error.message;
    elements.formMessage.classList.add("error");
  } finally {
    elements.submit.disabled = false;
  }
});

elements.refresh.addEventListener("click", () => refreshAudits().catch((error) => {
  elements.formMessage.textContent = error.message;
  elements.formMessage.classList.add("error");
}));
window.addEventListener("beforeunload", () => clearInterval(state.poller));

initialize();
