let investors = [];
let supervisors = [];
let projects = [];
let transactions = [];

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
  document.getElementById("statExpenseTotal").textContent = formatCurrency(
    sumTransactions(transactions)
  );
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
          <span>${escapeHtml(t("common.projectPage"))}</span>
          <strong>${escapeHtml(t("dashboard.projectPageValue"))}</strong>
        </div>
      </div>

      <div class="action-cluster">
        <a class="button-link" href="project.html?id=${encodeURIComponent(item.project.id)}">
          ${escapeHtml(t("common.openProjectPage"))}
        </a>
        <a class="text-link" href="projects.html?id=${encodeURIComponent(item.project.id)}">
          ${escapeHtml(t("common.manageThisProject"))}
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

refreshState();
renderAll();

hydrateWorkspaceFromDatabase()
  .then(() => {
    refreshState();
    renderAll();
  })
  .catch(error => console.warn("Saved workspace restore skipped.", error));
