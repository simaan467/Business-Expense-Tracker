let investors = [];
let supervisors = [];
let projects = [];
let transactions = [];
let approvalCounts = new Map();
const API_BASE_URL = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "";
let requestToastTimer = null;

function showDashboardRequestToast(message, isError = false) {
  const toast = document.getElementById("dashboardRequestToast");
  if (!toast) return;
  toast.classList.toggle("is-error", isError);
  toast.querySelector("span:first-child").textContent = isError ? "✕" : "✓";
  document.getElementById("dashboardRequestToastText").textContent = message;
  toast.hidden = false;
  clearTimeout(requestToastTimer);
  requestToastTimer = window.setTimeout(() => { toast.hidden = true; }, 3500);
}

function getDashboardCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem("currentUser") || "null"); }
  catch { return null; }
}

function openProfileModal() {
  const user = getDashboardCurrentUser();
  if (!user) return;
  document.getElementById("profileModal").hidden = false;
}

function closeProfileModal() {
  document.getElementById("profileModal").hidden = true;
}

async function loadApprovalNotifications() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/approval-notifications`, { cache: "no-store" });
    if (!response.ok) throw new Error("Approval notifications are unavailable.");
    approvalCounts = new Map((await response.json()).map(item => [String(item.projectId), Number(item.count) || 0]));
  } catch (error) {
    console.warn(error.message);
    approvalCounts = new Map();
  }
}

function refreshState() {
  investors = readCollection(STORAGE_KEYS.investors)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  supervisors = readCollection(STORAGE_KEYS.supervisors)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  transactions = readCollection(STORAGE_KEYS.transactions);

  const preparedProjects = prepareProjects(
    readCollection(STORAGE_KEYS.projects)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
    investors,
    transactions,
    supervisors
  );

  projects = preparedProjects.projects;

  if (preparedProjects.changed) {
    writeCollection(STORAGE_KEYS.projects, projects);
  }
}

function renderOverview() {
  document.getElementById("statInvestorCount").textContent = investors.length;
  document.getElementById("statProjectCount").textContent = projects.length;
  const total = Array.from(approvalCounts.values()).reduce((sum, count) => sum + count, 0);
  const badge = document.getElementById("dashboardApprovalCount");
  badge.textContent = total;
  badge.hidden = total === 0;
}

function renderProjectDirectory() {
  const container = document.getElementById("projectDirectory");
  const projectStats = buildProjectStats(projects, transactions);

  if (!projects.length) {
    container.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(t("dashboard.emptyProjects"))}
      </div>
    `;
    return;
  }

  container.innerHTML = projectStats.map(item => `
    <article class="project-card project-directory-card">
      <div>
        <h3>${escapeHtml(item.project.name)}</h3>
        <p class="helper-text">${escapeHtml(t("dashboard.projectAdded", {
          date: formatProjectDate(item.project.createdAt)
        }))}</p>
      </div>

      <div class="chip-row">
        <span class="chip">${escapeHtml(t("dashboard.projectEntriesChip", {
          count: item.entryCount
        }))}</span>
        <span class="chip">${escapeHtml(t("dashboard.projectAssignedInvestorsChip", {
          count: item.assignedInvestorCount
        }))}</span>
        <span class="chip">${escapeHtml(t("dashboard.projectAssignedSupervisorsChip", {
          count: item.assignedSupervisorCount
        }))}</span>
      </div>

      <div class="card-meta">
        <div class="meta-row">
          <span>${escapeHtml(t("common.projectSpend"))}</span>
          <strong class="amount">${formatCurrency(item.total)}</strong>
        </div>
        <div class="meta-row">
          <span>Total invested</span>
          <strong class="amount">${formatCurrency(Number(item.project.totalInvested || 0))}</strong>
        </div>
        <div class="meta-row">
          <span>Investment balance</span>
          <strong class="amount">${formatCurrency(Number(item.project.totalInvested || 0) - item.total)}</strong>
        </div>
      </div>

      <div class="action-cluster">
        <a class="button-link" href="project.html?id=${encodeURIComponent(item.project.id)}">
          ${escapeHtml(t("common.openProjectPage"))}
        </a>
      </div>
    </article>
  `).join("");
}

function renderAll() {
  renderOverview();
  renderProjectDirectory();
}
window.addEventListener("app-languagechange", renderAll);
document.getElementById("openProfileButton").addEventListener("click", openProfileModal);
document.getElementById("closeProfileButton").addEventListener("click", closeProfileModal);
document.getElementById("profileModal").addEventListener("click", event => {
  if (event.target === event.currentTarget) closeProfileModal();
});

refreshState();
renderAll();

hydrateWorkspaceFromDatabase()
  .then(async () => {
    await loadApprovalNotifications();
    refreshState();
    renderAll();
  })
  .catch(error => console.warn("Saved workspace restore skipped.", error));
