let investors = [];
let supervisors = [];
let projects = [];
let transactions = [];
let activeProjectId = "";
let deletionRequests = [];
let deletionTargetId = "";
let deletionCountdownTimer = null;
let approvalCounts = new Map();
let projectOutcomeTimer = null;
const selectedNewProjectInvestors = new Set();
const selectedNewProjectSupervisors = new Set();
const API_BASE_URL = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "";

function showProjectOutcome(message, isError = false) {
  const toast = document.getElementById("projectOutcomeToast");
  if (!toast) return;
  toast.classList.toggle("is-error", isError);
  toast.querySelector("span:first-child").textContent = isError ? "✕" : "✓";
  document.getElementById("projectOutcomeToastText").textContent = message;
  toast.hidden = false;
  clearTimeout(projectOutcomeTimer);
  projectOutcomeTimer = window.setTimeout(() => { toast.hidden = true; }, 3500);
}

function getRequestedProjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
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

  syncActiveProject();
}

function syncActiveProject() {
  const requestedId = getRequestedProjectId();

  if (requestedId && projects.some(project => String(project.id) === String(requestedId))) {
    activeProjectId = String(requestedId);
    return;
  }

  if (!projects.length) {
    activeProjectId = "";
    return;
  }

  if (!projects.some(project => String(project.id) === String(activeProjectId))) {
    activeProjectId = String(projects[0].id);
  }
}

function saveProjects() {
  writeCollection(STORAGE_KEYS.projects, projects);
}

function saveInvestors() {
  writeCollection(STORAGE_KEYS.investors, investors);
}

function saveSupervisors() {
  writeCollection(STORAGE_KEYS.supervisors, supervisors);
}

function saveTransactions() {
  writeCollection(STORAGE_KEYS.transactions, transactions);
}

async function loadRemoteProjects() {
  try {
    const response = await fetch(API_BASE_URL + "/api/projects", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load saved projects.");
    const remoteProjects = await response.json();
    if (!Array.isArray(remoteProjects)) return;
    projects = remoteProjects;
    const members = remoteProjects.flatMap(project => project.members || []);
    investors = members.filter(member => member.role === "Investor")
      .filter((member, index, list) => list.findIndex(item => item.mobile === member.mobile) === index)
      .map(member => ({ id: member.mobile, name: member.name, mobile: member.mobile }));
    supervisors = members.filter(member => member.role === "Supervisor")
      .filter((member, index, list) => list.findIndex(item => item.mobile === member.mobile) === index)
      .map(member => ({ id: member.mobile, name: member.name, mobile: member.mobile }));
    saveProjects(); saveInvestors(); saveSupervisors();
    syncActiveProject(); renderAll();
  } catch (error) { console.warn("Remote project load skipped.", error); }
}

async function saveRemoteProject(project, members) {
  const response = await fetch(API_BASE_URL + "/api/projects", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, members })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Project could not be saved to the database.");
}

async function loadDeletionRequests() {
  const response = await fetch(API_BASE_URL + "/api/project-deletion-requests", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load deletion requests.");
  deletionRequests = await response.json();
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

function getActiveProject() {
  return projects.find(project => String(project.id) === String(activeProjectId));
}

function updateCreateProjectButtonState() {
  const name = document.getElementById("projectName")?.value.trim();
  const hasSelectedMember = selectedNewProjectInvestors.size > 0 || selectedNewProjectSupervisors.size > 0;
  document.getElementById("addProjectButton").disabled = !(name && hasSelectedMember);
}

function renderCreateProjectMembers() {
  const investorOptions = document.getElementById("newProjectInvestorOptions");
  const supervisorOptions = document.getElementById("newProjectSupervisorOptions");
  const selectedMembers = document.getElementById("selectedProjectMembers");
  const helper = document.getElementById("addProjectHelper");

  investorOptions.innerHTML = investors.length
    ? investors.map(investor => `
        <label class="choice-pill">
          <input
            type="checkbox"
            data-new-project-investor
            value="${escapeHtml(investor.name)}"
            ${selectedNewProjectInvestors.has(investor.name) ? "checked" : ""}
          />
          <span>${escapeHtml(investor.name)}</span>
        </label>
      `).join("")
    : `
      <div class="empty-table-state">
        ${escapeHtml(t("projectsPage.noExistingInvestors"))}
      </div>
    `;

  supervisorOptions.innerHTML = supervisors.length
    ? supervisors.map(supervisor => `
        <label class="choice-pill">
          <input
            type="checkbox"
            data-new-project-supervisor
            value="${escapeHtml(supervisor.name)}"
            ${selectedNewProjectSupervisors.has(supervisor.name) ? "checked" : ""}
          />
          <span>${escapeHtml(supervisor.name)}</span>
        </label>
      `).join("")
    : `
      <div class="empty-table-state">
        ${escapeHtml(t("projectsPage.noExistingSupervisors"))}
      </div>
    `;

  supervisorOptions.querySelectorAll("[data-new-project-supervisor]").forEach(input => {
    input.addEventListener("change", () => {
      input.checked ? selectedNewProjectSupervisors.add(input.value) : selectedNewProjectSupervisors.delete(input.value);
      updateCreateProjectButtonState();
    });
  });

  investorOptions.querySelectorAll("[data-new-project-investor]").forEach(input => {
    input.addEventListener("change", () => {
      input.checked ? selectedNewProjectInvestors.add(input.value) : selectedNewProjectInvestors.delete(input.value);
      updateCreateProjectButtonState();
    });
  });

  const selected = [
    ...investors.filter(member => selectedNewProjectInvestors.has(member.name)).map(member => ({ ...member, role: "Investor" })),
    ...supervisors.filter(member => selectedNewProjectSupervisors.has(member.name)).map(member => ({ ...member, role: "Supervisor" }))
  ];
  selectedMembers.innerHTML = selected.map(member => `
    <span class="selected-project-member" data-member-role="${member.role}" data-member-name="${escapeHtml(member.name)}">
      <span>${escapeHtml(member.name)} <small>${escapeHtml(member.role)}</small></span>
      <button type="button" aria-label="Remove ${escapeHtml(member.name)}" title="Remove ${escapeHtml(member.name)}">×</button>
    </span>
  `).join("");
  selectedMembers.querySelectorAll("[data-member-role]").forEach(chip => {
    chip.querySelector("button").addEventListener("click", () => {
      const selectedSet = chip.dataset.memberRole === "Investor" ? selectedNewProjectInvestors : selectedNewProjectSupervisors;
      selectedSet.delete(chip.dataset.memberName);
      renderCreateProjectMembers();
    });
  });

  helper.textContent = "Add registered investors or supervisors by their registered mobile number.";
  updateCreateProjectButtonState();
}

function renderProjects() {
  const projectList = document.getElementById("projectList");
  const stats = buildProjectStats(projects, transactions);

  if (!projects.length) {
    projectList.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(t("projectsPage.noProjectsList"))}
      </div>
    `;
    return;
  }

  projectList.innerHTML = stats.map(item => {
    const pendingCount = approvalCounts.get(String(item.project.id)) || 0;
    const projectUrl = `project.html?id=${encodeURIComponent(item.project.id)}&section=approvals`;
    const totalInvested = Number(item.project.totalInvested || 0);
    const investmentBalance = totalInvested - item.total;
    return `
    <article class="project-list-row">
      <a class="project-list-item" href="project.html?id=${encodeURIComponent(item.project.id)}" aria-label="Open ${escapeHtml(item.project.name)}">
        <strong>${escapeHtml(item.project.name)}</strong>
        <div class="project-list-summary">
          <span>${escapeHtml(t("projectsPage.projectListEntries", { count: item.entryCount }))}</span>
          <span>${item.assignedInvestorCount} investor${item.assignedInvestorCount === 1 ? "" : "s"}</span>
          <span>${item.assignedSupervisorCount} supervisor${item.assignedSupervisorCount === 1 ? "" : "s"}</span>
          <span>Project spend: ${formatCurrency(item.total)}</span>
          <span>Total invested: ${formatCurrency(totalInvested)}</span>
          <span>Investment balance: ${formatCurrency(investmentBalance)}</span>
        </div>
      </a>
      <a class="notification-icon project-approval-notification" href="${projectUrl}" aria-label="${pendingCount} pending approval${pendingCount === 1 ? "" : "s"} for ${escapeHtml(item.project.name)}" title="${pendingCount ? `${pendingCount} approval${pendingCount === 1 ? "" : "s"} pending for you` : "No approvals pending for you"}"><span aria-hidden="true">🔔</span><span class="notification-count" ${pendingCount ? "" : "hidden"}>${pendingCount}</span></a>
    </article>`;
  }).join("");

  return;

  if (!activeProject || !activeStats) {
    projectDetail.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(t("projectsPage.selectProjectDetails"))}
      </div>
    `;
  } else {
    const relatedTransactions = getProjectTransactions(transactions, activeProject.name);
    const totalInvested = Number(activeProject.totalInvested || 0);
    const investmentBalance = totalInvested - activeStats.total;
    const deletionRequest = deletionRequests.find(request => String(request.projectId) === String(activeProject.id));
    const currentUser = getCurrentUser();
    const canApproveDeletion = deletionRequest
      && currentUser
      && deletionRequest.requestedByMobile !== currentUser.mobile
      && !deletionRequest.approvedBy.includes(currentUser.mobile);
    const deletionRequestMarkup = deletionRequest ? `
      <div class="approval-card request-deletion-card">
        <div>
          <span class="eyebrow request-type-deletion">Project deletion request</span>
          <h3>Project deletion approval pending</h3>
          <p>${escapeHtml(deletionRequest.requestedByName)} requested deletion. ${deletionRequest.approvedBy.length} of ${deletionRequest.requiredApprovals} member approvals received.</p>
        </div>
        ${canApproveDeletion ? `<div class="approval-actions"><button type="button" class="button-danger" data-approve-project-deletion-id="${escapeHtml(activeProject.id)}">Approve deletion</button><button type="button" class="button-secondary" data-deny-project-deletion-id="${escapeHtml(activeProject.id)}">Deny deletion</button></div>` : ""}
      </div>
    ` : "";
    const transactionMarkup = relatedTransactions.length
      ? `
        <div class="table-wrap">
          <table class="transaction-table">
            <thead>
              <tr>
                <th>${escapeHtml(t("common.project"))}</th>
                <th>${escapeHtml(t("common.role"))}</th>
                <th>${escapeHtml(t("common.name"))}</th>
                <th>${escapeHtml(t("common.paidTo"))}</th>
                <th>${escapeHtml(t("common.amount"))}</th>
                <th>${escapeHtml(t("common.date"))}</th>
              </tr>
            </thead>
            <tbody>
              ${relatedTransactions.map(tx => `
                <tr>
                  <td>${escapeHtml(tx.project)}</td>
                  <td>${escapeHtml(getMemberTypeLabel(getTransactionActorType(tx)))}</td>
                  <td>${escapeHtml(getTransactionActorName(tx))}</td>
                  <td>${escapeHtml(tx.receiver)}</td>
                  <td>${formatCurrency(tx.amount)}</td>
                  <td>${escapeHtml(formatTransactionDate(tx))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `
      : `
        <div class="empty-table-state">
          ${escapeHtml(t("projectsPage.noProjectExpenses", { projectName: activeProject.name }))}
        </div>
      `;

    projectDetail.innerHTML = `
      <article class="project-detail-card">
        <div class="project-detail-head">
          <div>
            <span class="eyebrow eyebrow-soft">${escapeHtml(t("common.selectedProject"))}</span>
            <h3>${escapeHtml(activeProject.name)}</h3>
            <p class="helper-text">${escapeHtml(t("projectsPage.projectAdded", {
              date: formatProjectDate(activeProject.createdAt)
            }))}</p>
          </div>

          <div class="action-cluster">
            <a class="button-link" href="project.html?id=${encodeURIComponent(activeProject.id)}">
              ${escapeHtml(t("common.openProjectPage"))}
            </a>
            <button
              type="button"
              class="button-danger"
              data-delete-project-id="${escapeHtml(activeProject.id)}"
            >
              ${escapeHtml(t("common.deleteProject"))}
            </button>
          </div>
        </div>

        <div class="chip-row">
          <span class="chip">${escapeHtml(t("projectsPage.projectChipEntries", {
            count: activeStats.entryCount
          }))}</span>
          <span class="chip">${escapeHtml(t("projectsPage.projectChipInvestors", {
            count: activeStats.assignedInvestorCount
          }))}</span>
          <span class="chip">${escapeHtml(t("projectsPage.projectChipSupervisors", {
            count: activeStats.assignedSupervisorCount
          }))}</span>
          <span class="chip">${escapeHtml(t("projectsPage.projectChipSpend", {
            amount: formatCurrency(activeStats.total)
          }))}</span>
          <span class="chip">Total invested: ${formatCurrency(totalInvested)}</span>
          <span class="chip">Investment balance: ${formatCurrency(investmentBalance)}</span>
        </div>

        ${deletionRequestMarkup}

        <div class="card-meta">
          <div class="meta-row">
            <span>${escapeHtml(t("common.status"))}</span>
            <strong>${escapeHtml(activeStats.entryCount ? t("common.active") : t("common.ready"))}</strong>
          </div>
          <div class="meta-row">
            <span>${escapeHtml(t("common.visibleOnDashboard"))}</span>
            <strong>${escapeHtml(t("common.asOwnProjectPage"))}</strong>
          </div>
        </div>

        <div class="project-info-block">
          <div class="panel-head panel-head-tight">
            <div>
              <span class="eyebrow eyebrow-soft">${escapeHtml(t("common.projectActivity"))}</span>
              <h3>${escapeHtml(t("projectsPage.entriesForProject", {
                projectName: activeProject.name
              }))}</h3>
            </div>
          </div>

          ${transactionMarkup}
        </div>
      </article>
    `;
  }

  document.querySelectorAll("[data-select-project-id]").forEach(button => {
    button.addEventListener("click", () => {
      activeProjectId = button.dataset.selectProjectId;
      window.history.replaceState({}, "", `projects.html?id=${encodeURIComponent(activeProjectId)}`);
      renderProjects();
    });
  });

  document.querySelectorAll("[data-delete-project-id]").forEach(button => {
    button.addEventListener("click", () => deleteProject(button.dataset.deleteProjectId));
  });
  document.querySelectorAll("[data-approve-project-deletion-id]").forEach(button => {
    button.addEventListener("click", () => approveProjectDeletion(button.dataset.approveProjectDeletionId));
  });
  document.querySelectorAll("[data-deny-project-deletion-id]").forEach(button => {
    button.addEventListener("click", () => denyProjectDeletion(button.dataset.denyProjectDeletionId));
  });
}

function getCurrentUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser") || "null");
    return user?.name && ["Investor", "Supervisor"].includes(user.role) ? user : null;
  } catch (error) {
    return null;
  }
}

async function addProject() {
  const input = document.getElementById("projectName");
  const name = input.value.trim();
  const currentUser = getCurrentUser();
  const selectedSupervisorNames = Array.from(
    document.querySelectorAll("[data-new-project-supervisor]:checked")
  ).map(inputElement => inputElement.value);
  const assignedInvestorNames = uniqueStrings([
    ...selectedNewProjectInvestors,
    ...(currentUser?.role === "Investor" ? [currentUser.name] : [])
  ]);
  const assignedSupervisorNames = uniqueStrings([
    ...selectedSupervisorNames,
    ...(currentUser?.role === "Supervisor" ? [currentUser.name] : [])
  ]);
  const hasExplicitlyAddedMember = selectedNewProjectInvestors.size > 0
    || selectedNewProjectSupervisors.size > 0;

  if (!name) {
    showProjectOutcome(t("projectsPage.alertEnterProjectName"), true);
    return;
  }

  if (projects.some(project => normalizeName(project.name) === normalizeName(name))) {
    showProjectOutcome(t("projectsPage.alertProjectExists"), true);
    return;
  }

  if (!hasExplicitlyAddedMember) {
    showProjectOutcome("Add at least one investor or supervisor before creating this project.", true);
    return;
  }

  // The person who creates a project is always part of that project.
  if (currentUser?.role === "Investor" && !investors.some(member => normalizeName(member.name) === normalizeName(currentUser.name))) {
    investors = [...investors, { id: currentUser.id || uid(), name: currentUser.name, mobile: currentUser.mobile }]
      .sort((left, right) => left.name.localeCompare(right.name));
    saveInvestors();
  }
  if (currentUser?.role === "Supervisor" && !supervisors.some(member => normalizeName(member.name) === normalizeName(currentUser.name))) {
    supervisors = [...supervisors, { id: currentUser.id || uid(), name: currentUser.name, mobile: currentUser.mobile }]
      .sort((left, right) => left.name.localeCompare(right.name));
    saveSupervisors();
  }

  const newProject = {
    id: uid(),
    name,
    createdAt: new Date().toISOString(),
    totalInvested: 0,
    investorNames: assignedInvestorNames,
    supervisorNames: assignedSupervisorNames
  };
  const memberIndex = new Map([
    ...investors,
    ...supervisors
  ].map(member => [normalizeName(member.name), member]));
  const projectMembers = [
    ...assignedInvestorNames.map(memberName => ({ name: memberName, mobile: memberIndex.get(normalizeName(memberName))?.mobile, role: "Investor" })),
    ...assignedSupervisorNames.map(memberName => ({ name: memberName, mobile: memberIndex.get(normalizeName(memberName))?.mobile, role: "Supervisor" }))
  ];
  if (projectMembers.some(member => !member.mobile)) {
    showProjectOutcome("Every project member needs a mobile number. Add the member again with their mobile number.", true);
    return;
  }
  try {
    await saveRemoteProject(newProject, projectMembers);
  } catch (error) {
    showProjectOutcome(error.message || "Project could not be created.", true);
    alert(error.message || "Project could not be created.");
    return;
  }
  projects.push(newProject);

  saveProjects();
  selectedNewProjectInvestors.clear();
  selectedNewProjectSupervisors.clear();
  input.value = "";
  refreshState();
  activeProjectId = String(projects.find(project => project.name === name)?.id || activeProjectId);
  window.history.replaceState({}, "", `projects.html?id=${encodeURIComponent(activeProjectId)}`);
  renderAll();
  showProjectOutcome("Project created successfully.");
}

function deleteProject(projectId) {
  const project = projects.find(item => String(item.id) === String(projectId));
  if (!project) return;
  const existing = deletionRequests.find(request => String(request.projectId) === String(projectId));
  if (existing) { alert(`Deletion approval is already pending: ${existing.approvedBy.length} of ${existing.requiredApprovals} member approvals received.`); return; }
  deletionTargetId = String(projectId);
  const memberCount = (project.investorNames || []).length + (project.supervisorNames || []).length;
  document.getElementById("deleteProjectModalMessage").textContent = `Request deletion of "${project.name}"? This needs approval from ${Math.max(memberCount - 1, 0)} other project member(s).`;
  document.getElementById("deleteProjectModal").hidden = false;
  const confirmButton = document.getElementById("confirmProjectDeletion");
  const countdown = document.getElementById("deleteProjectCountdown");
  let seconds = 10;
  confirmButton.disabled = true;
  countdown.textContent = `Confirm available in ${seconds} seconds.`;
  clearInterval(deletionCountdownTimer);
  deletionCountdownTimer = setInterval(() => {
    seconds -= 1;
    countdown.textContent = seconds ? `Confirm available in ${seconds} seconds.` : "You can now request member approval.";
    if (!seconds) { clearInterval(deletionCountdownTimer); confirmButton.disabled = false; }
  }, 1000);
}

function closeDeleteProjectModal() { clearInterval(deletionCountdownTimer); deletionTargetId = ""; document.getElementById("deleteProjectModal").hidden = true; }
async function requestProjectDeletion() {
  const projectId = deletionTargetId;
  if (!projectId) return;
  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/deletion-request`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { alert(result.error || "Deletion request could not be sent."); return; }
  closeDeleteProjectModal();
  if (result.deleted) await hydrateWorkspaceFromDatabase(API_BASE_URL);
  await loadDeletionRequests();
  renderAll();
  alert(result.deleted ? "Project deleted because no other project members need to approve." : "Deletion request sent to all other project members for approval.");
}
async function approveProjectDeletion(projectId) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/deletion-request/approve`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { alert(result.error || "Approval could not be recorded."); return; }
  await hydrateWorkspaceFromDatabase(API_BASE_URL);
  await loadDeletionRequests();
  refreshState(); renderAll();
  alert(result.deleted ? "Project deleted after the required investor approvals." : "Your deletion approval was recorded.");
}
async function denyProjectDeletion(projectId) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/deletion-request/deny`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { alert(result.error || "Deletion request could not be denied."); return; }
  await loadDeletionRequests();
  renderAll();
  alert("Project deletion request denied and removed.");
}

function renderAll() {
  const heading = document.getElementById("projectsHeroTitle");
  const currentUser = getCurrentUser();
  if (heading && currentUser) heading.textContent = `Welcome, ${currentUser.name}`;
  renderCreateProjectMembers();
  renderProjects();
}

async function addRegisteredProjectMember() {
  const input = document.getElementById("registeredMemberIdentifier");
  const helper = document.getElementById("registeredMemberHelper");
  const identifier = input.value.trim();
  if (!identifier) { helper.textContent = "Enter an email address or mobile number."; return; }
  helper.textContent = "Looking up registered user...";
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/lookup?identifier=${encodeURIComponent(identifier)}`);
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("The application server is unavailable. Start it on port 4173, then try again.");
    }
    const user = await response.json();
    if (!response.ok) throw new Error(user.error || "User lookup failed.");
    if (!["Investor", "Supervisor"].includes(user.role)) {
      throw new Error("This mobile number is not registered as a project member.");
    }
    const collection = user.role === "Supervisor" ? supervisors : investors;
    if (!collection.some(member => normalizeName(member.name) === normalizeName(user.name))) {
      const member = { id: user.id, name: user.name, mobile: user.mobile };
      if (user.role === "Supervisor") {
        supervisors = [...supervisors, member].sort((a, b) => a.name.localeCompare(b.name));
        saveSupervisors();
      } else {
        investors = [...investors, member].sort((a, b) => a.name.localeCompare(b.name));
        saveInvestors();
      }
    }
    const selectedMembers = user.role === "Supervisor"
      ? selectedNewProjectSupervisors
      : selectedNewProjectInvestors;
    selectedMembers.add(user.name);
    input.value = "";
    helper.textContent = `${user.name} was added as a ${user.role.toLowerCase()}.`;
    renderCreateProjectMembers();
  } catch (error) {
    helper.textContent = error.message;
  }
}

function showProjectSection(section) {
  const isCreate = section === "create";
  document.getElementById("createProjectSection").hidden = !isCreate;
  document.getElementById("projectListSection").hidden = isCreate;
  document.querySelectorAll("[data-project-section]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.projectSection === section);
  });
  if (!isCreate) renderProjects();
}

const projectInput = document.getElementById("projectName");
const addProjectButton = document.getElementById("addProjectButton");

projectInput.addEventListener("input", updateCreateProjectButtonState);

// Click event
addProjectButton.addEventListener("click", addProject);

// Enter key support
projectInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    addProject();
  }
});

document.getElementById("addRegisteredMemberButton").addEventListener("click", addRegisteredProjectMember);
document.getElementById("cancelProjectDeletion").addEventListener("click", closeDeleteProjectModal);
document.getElementById("confirmProjectDeletion").addEventListener("click", requestProjectDeletion);
document.getElementById("deleteProjectModal").addEventListener("click", event => {
  if (event.target.id === "deleteProjectModal") closeDeleteProjectModal();
});
document.getElementById("registeredMemberIdentifier").addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); addRegisteredProjectMember(); }
});
document.getElementById("registeredMemberIdentifier").addEventListener("input", event => {
  event.target.value = event.target.value.replace(/\D/g, "");
});
document.querySelectorAll("[data-project-section]").forEach(button => {
  button.addEventListener("click", () => showProjectSection(button.dataset.projectSection));
});
window.addEventListener("app-languagechange", renderAll);

refreshState();
renderAll();
const initialProjectSection = new URLSearchParams(window.location.search).get("section") === "create" ? "create" : "list";
showProjectSection(initialProjectSection);
hydrateWorkspaceFromDatabase(API_BASE_URL)
  .then(async () => {
    await Promise.all([loadDeletionRequests(), loadApprovalNotifications()]);
    refreshState();
    renderAll();
    showProjectSection(initialProjectSection);
  })
  .catch(error => {
    console.warn("Saved workspace restore skipped.", error);
  });
