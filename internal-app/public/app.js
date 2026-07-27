const state = { audits: [], auditTypes: {}, tools: [], selectedId: null, selectedTool: null, poller: null };

const commandDefinitions = [
  ["/seo audit <url>", "Full website audit with specialist analysis"],
  ["/seo page <url>", "Deep single-page SEO analysis"],
  ["/seo technical <url>", "Technical SEO audit across nine categories"],
  ["/seo content <url>", "Content quality and E-E-A-T assessment"],
  ["/seo schema <url>", "Schema detection, validation, and generation"],
  ["/seo sitemap <url>", "Analyze or generate XML sitemaps"],
  ["/seo images <url>", "Image SEO and optimization analysis"],
  ["/seo geo <url>", "AI search and generative engine optimization"],
  ["/seo plan <type>", "Strategic SEO planning"],
  ["/seo cluster <keyword>", "SERP-based semantic topic clustering"],
  ["/seo sxo <url>", "Search experience optimization"],
  ["/seo drift baseline <url>", "Capture a monitoring baseline"],
  ["/seo ecommerce <url>", "Product schema and marketplace intelligence"],
  ["/seo programmatic <url>", "Programmatic SEO planning at scale"],
  ["/seo competitor-pages <url>", "Competitor comparison page strategy"],
  ["/seo local <url>", "Local SEO, citations, reviews, and GBP"],
  ["/seo maps <command>", "Map-pack and geo-grid intelligence"],
  ["/seo hreflang <url>", "International SEO and hreflang"],
  ["/seo google <command>", "GSC, PageSpeed, CrUX, Indexing, and GA4"],
  ["/seo backlinks <url>", "Backlink profile analysis"],
];

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
  tabs: [...document.querySelectorAll(".view-tab")],
  views: [...document.querySelectorAll(".app-view")],
  toolGrid: document.querySelector("#tool-grid"),
  toolTemplate: document.querySelector("#tool-card-template"),
  toolEmpty: document.querySelector("#tool-empty"),
  toolFormView: document.querySelector("#tool-form-view"),
  toolForm: document.querySelector("#tool-form"),
  toolTitle: document.querySelector("#tool-title"),
  toolDescription: document.querySelector("#tool-description"),
  toolInputLabel: document.querySelector("#tool-input-label"),
  toolInput: document.querySelector("#tool-input"),
  toolOptions: document.querySelector("#tool-options"),
  toolSubmit: document.querySelector("#tool-submit"),
  toolMessage: document.querySelector("#tool-message"),
  toolOutput: document.querySelector("#tool-output"),
  copyOutput: document.querySelector("#copy-output"),
  commandGrid: document.querySelector("#command-grid"),
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

function switchView(name) {
  for (const tab of elements.tabs) tab.classList.toggle("active", tab.dataset.view === name);
  for (const view of elements.views) view.hidden = view.id !== `${name}-view`;
}

function renderCommands() {
  for (const [command, description] of commandDefinitions) {
    const card = document.createElement("article");
    card.className = "command-card";
    const code = document.createElement("code");
    code.textContent = command;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(command);
      copy.textContent = "Copied";
      setTimeout(() => { copy.textContent = "Copy"; }, 1_200);
    });
    const paragraph = document.createElement("p");
    paragraph.textContent = description;
    const header = document.createElement("div");
    header.append(code, copy);
    card.append(header, paragraph);
    elements.commandGrid.append(card);
  }
}

function renderTools() {
  elements.toolGrid.replaceChildren();
  for (const tool of state.tools) {
    const card = elements.toolTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.id = tool.id;
    card.classList.toggle("active", state.selectedTool?.id === tool.id);
    card.querySelector(".tool-name").textContent = tool.name;
    card.querySelector(".tool-summary").textContent = tool.description;
    const badge = card.querySelector(".tool-badge");
    badge.textContent = tool.available ? (tool.requirement ? "API ready" : "Free") : "API key";
    badge.classList.toggle("requires-key", !tool.available);
    card.addEventListener("click", () => selectTool(tool.id));
    elements.toolGrid.append(card);
  }
}

function selectTool(id) {
  const tool = state.tools.find((item) => item.id === id);
  if (!tool) return;
  state.selectedTool = tool;
  renderTools();
  elements.toolEmpty.hidden = true;
  elements.toolFormView.hidden = false;
  elements.toolTitle.textContent = tool.name;
  elements.toolDescription.textContent = tool.description;
  elements.toolInputLabel.textContent = tool.input === "query" ? "Search query or ID" : tool.input === "domain" ? "Domain" : "Website URL";
  elements.toolInput.type = tool.input === "query" ? "text" : "url";
  elements.toolInput.placeholder = tool.input === "query" ? "technical SEO" : tool.input === "domain" ? "example.com" : "https://example.com/";
  elements.toolInput.value = "";
  elements.toolOptions.replaceChildren();
  for (const [name, values] of Object.entries(tool.options)) {
    const label = document.createElement("label");
    label.htmlFor = `tool-option-${name}`;
    label.textContent = name.replaceAll("-", " ");
    const select = document.createElement("select");
    select.id = `tool-option-${name}`;
    select.name = name;
    for (const value of values) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    }
    elements.toolOptions.append(label, select);
  }
  elements.toolSubmit.disabled = !tool.available;
  elements.toolMessage.classList.toggle("error", !tool.available);
  elements.toolMessage.textContent = tool.available ? "" : `Add ${tool.requirement} in Coolify to enable this tool.`;
  renderToolOutput("Output will appear here.");
}

function formatMetric(value, digits = 3) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return new Intl.NumberFormat().format(value);
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
  }
  return String(value);
}

function appendMetricCard(parent, label, value, detail = "") {
  const card = document.createElement("article");
  card.className = "backlink-metric";
  const name = document.createElement("span");
  name.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = formatMetric(value);
  card.append(name, strong);
  if (detail) {
    const small = document.createElement("small");
    small.textContent = detail;
    card.append(small);
  }
  parent.append(card);
}

function renderBacklinkOutput(result) {
  const data = result.data || {};
  const metadata = result.metadata || {};
  elements.toolOutput.replaceChildren();
  elements.toolOutput.className = "backlink-dashboard";

  const header = document.createElement("header");
  header.className = "backlink-header";
  const titleWrap = document.createElement("div");
  const eyebrow = document.createElement("span");
  eyebrow.className = "backlink-source";
  eyebrow.textContent = "Common Crawl Web Graph";
  const title = document.createElement("h3");
  title.textContent = `Backlink profile for ${data.domain || "domain"}`;
  const subtitle = document.createElement("p");
  subtitle.textContent = `Domain-level graph signals · ${metadata.release || "latest release"}${metadata.from_cache ? " · cached" : ""}`;
  titleWrap.append(eyebrow, title, subtitle);
  const crawlBadge = document.createElement("span");
  crawlBadge.className = `crawl-badge ${data.in_crawl ? "found" : ""}`;
  crawlBadge.textContent = data.in_crawl ? "Found in crawl" : "No crawl match";
  header.append(titleWrap, crawlBadge);

  const metrics = document.createElement("div");
  metrics.className = "backlink-metrics";
  appendMetricCard(metrics, "PageRank", data.pagerank, data.pagerank_rank ? `Global rank #${formatMetric(data.pagerank_rank, 0)}` : "Graph score unavailable");
  appendMetricCard(metrics, "Harmonic centrality", data.harmonic_centrality, data.harmonic_centrality_rank ? `Global rank #${formatMetric(data.harmonic_centrality_rank, 0)}` : "Graph score unavailable");
  appendMetricCard(metrics, "Hosts represented", data.n_hosts, "Common Crawl graph");
  appendMetricCard(metrics, "Referring domains", data.referring_domains_sample ?? 0, "Available in this sample");

  const notice = document.createElement("p");
  notice.className = "backlink-notice";
  notice.textContent = data.note || "Common Crawl coverage is a web-graph sample and should not be treated as a complete backlink count.";

  const section = document.createElement("section");
  section.className = "referrer-section";
  const sectionHeader = document.createElement("div");
  const sectionTitle = document.createElement("h4");
  sectionTitle.textContent = "Top referring domains";
  const count = document.createElement("span");
  const referrers = Array.isArray(data.top_referring_domains) ? data.top_referring_domains : [];
  count.textContent = `${referrers.length} found`;
  sectionHeader.append(sectionTitle, count);
  section.append(sectionHeader);

  if (referrers.length) {
    const table = document.createElement("table");
    const head = document.createElement("thead");
    head.innerHTML = "<tr><th>#</th><th>Referring domain</th><th>Signal</th></tr>";
    const body = document.createElement("tbody");
    referrers.forEach((item, index) => {
      const domain = typeof item === "string" ? item : item.domain || item.host || "Unknown";
      const signal = typeof item === "object" ? item.count ?? item.links ?? "Detected" : "Detected";
      const row = document.createElement("tr");
      for (const value of [index + 1, domain, signal]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      body.append(row);
    });
    table.append(head, body);
    section.append(table);
  } else {
    const empty = document.createElement("div");
    empty.className = "referrer-empty";
    const strong = document.createElement("strong");
    strong.textContent = "No referring domains in this graph sample";
    const paragraph = document.createElement("p");
    paragraph.textContent = "This does not mean the website has zero backlinks. Common Crawl’s domain graph does not expose an Ahrefs-style backlink index.";
    empty.append(strong, paragraph);
    section.append(empty);
  }

  elements.toolOutput.append(header, metrics, notice, section);
}

function renderToolOutput(output, toolId = state.selectedTool?.id) {
  elements.toolOutput.dataset.rawOutput = String(output);
  if (toolId === "backlinks") {
    try {
      const parsed = JSON.parse(output);
      if (parsed?.data) {
        renderBacklinkOutput(parsed);
        return;
      }
    } catch {}
  }
  elements.toolOutput.className = "";
  const pre = document.createElement("pre");
  pre.textContent = output;
  elements.toolOutput.replaceChildren(pre);
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
    state.tools = config.tools || [];
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
    if (config.auditAvailable === false) {
      elements.submit.disabled = true;
      elements.formMessage.textContent = "AI audits need CODEX_API_KEY. Tool Runner works without it.";
    }
    renderTools();
    renderCommands();
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

for (const tab of elements.tabs) {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
}

elements.toolForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const tool = state.selectedTool;
  if (!tool || !tool.available) return;
  elements.toolSubmit.disabled = true;
  elements.toolMessage.classList.remove("error");
  elements.toolMessage.textContent = "Running tool. Keep this page open...";
  renderToolOutput("Working...", tool.id);
  const options = Object.fromEntries(new FormData(elements.toolForm).entries());
  try {
    const input = elements.toolInput.value.trim();
    const data = await api(`/api/tools/${tool.id}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [tool.input]: tool.input === "url" ? normalizedUrl(input) : input, options }),
    });
    renderToolOutput(data.output, tool.id);
    elements.toolMessage.textContent = "Tool completed successfully.";
  } catch (error) {
    renderToolOutput(error.message, tool.id);
    elements.toolMessage.textContent = "Tool failed. Review the output below.";
    elements.toolMessage.classList.add("error");
  } finally {
    elements.toolSubmit.disabled = false;
  }
});

elements.copyOutput.addEventListener("click", async () => {
  await navigator.clipboard.writeText(elements.toolOutput.dataset.rawOutput || elements.toolOutput.textContent);
  elements.copyOutput.textContent = "Copied";
  setTimeout(() => { elements.copyOutput.textContent = "Copy"; }, 1_200);
});

elements.refresh.addEventListener("click", () => refreshAudits().catch((error) => {
  elements.formMessage.textContent = error.message;
  elements.formMessage.classList.add("error");
}));
window.addEventListener("beforeunload", () => clearInterval(state.poller));

initialize();
