let investors = [];
let supervisors = [];
let projects = [];
let transactions = [];
let activeProjectId = "";
let deletionRequests = [];
let deletionTargetId = "";
let deletionCountdownTimer = null;
const selectedNewProjectInvestors = new Set();
const selectedNewProjectSupervisors = new Set();
const API_BASE_URL = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "";

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

function getActiveProject() {
  return projects.find(project => String(project.id) === String(activeProjectId));
}

function renderProjectOverview() {
  document.getElementById("projectCount").textContent = projects.length;
  document.getElementById("entryCount").textContent = transactions.length;
  document.getElementById("projectSpend").textContent = formatCurrency(
    sumTransactions(transactions)
  );
}

function createDynamicMemberField(containerId, role, value = "", mobile = "") {
  const container = document.getElementById(containerId);
  const field = document.createElement("div");
  const memberType = role === "supervisor" ? getMemberTypeLabel("Supervisor") : getMemberTypeLabel("Investor");
  field.className = "dynamic-input-row";

  field.innerHTML = `
    <input
      type="text"
      data-new-${role}-field
      placeholder="${escapeHtml(t("projectsPage.dynamicFieldPlaceholder", { memberType }))}"
      value="${escapeHtml(value)}"
      aria-label="${escapeHtml(t("projectsPage.dynamicFieldAria", { memberType }))}"
    />
    <input
      type="tel"
      data-new-${role}-mobile
      placeholder="Mobile number"
      value="${escapeHtml(mobile)}"
      aria-label="${escapeHtml(memberType)} mobile number"
    />
    <button type="button" class="button-secondary button-inline-remove" data-remove-row>
      ${escapeHtml(t("common.remove"))}
    </button>
  `;

  container.appendChild(field);
  field.querySelector("[data-remove-row]").addEventListener("click", () => {
    field.remove();
  });
}

function renderCreateProjectMembers() {
  const investorOptions = document.getElementById("newProjectInvestorOptions");
  const supervisorOptions = document.getElementById("newProjectSupervisorOptions");
  const investorInputs = document.getElementById("newProjectInvestorInputs");
  const supervisorInputs = document.getElementById("newProjectSupervisorInputs");
  const helper = document.getElementById("addProjectHelper");
  const addButton = document.getElementById("addProjectButton");

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

  investorInputs.innerHTML = "";
  supervisorInputs.innerHTML = "";
  createDynamicMemberField("newProjectInvestorInputs", "investor");
  createDynamicMemberField("newProjectSupervisorInputs", "supervisor");

  investorOptions.querySelectorAll("[data-new-project-investor]").forEach(input => {
    input.addEventListener("change", () => input.checked
      ? selectedNewProjectInvestors.add(input.value)
      : selectedNewProjectInvestors.delete(input.value));
  });
  supervisorOptions.querySelectorAll("[data-new-project-supervisor]").forEach(input => {
    input.addEventListener("change", () => input.checked
      ? selectedNewProjectSupervisors.add(input.value)
      : selectedNewProjectSupervisors.delete(input.value));
  });

  helper.textContent = t("projectsPage.createMixHelper");
  addButton.disabled = false;
}

function renderProjects() {
  const projectList = document.getElementById("projectList");
  const projectDetail = document.getElementById("projectDetail");
  const stats = buildProjectStats(projects, transactions);
  const activeProject = getActiveProject();
  const activeStats = stats.find(item => String(item.project.id) === String(activeProjectId));

  if (!projects.length) {
    projectList.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(t("projectsPage.noProjectsList"))}
      </div>
    `;
    projectDetail.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(t("projectsPage.noProjectsDetail"))}
      </div>
    `;
    return;
  }

  projectList.innerHTML = stats.map(item => `
    <button
      type="button"
      class="project-list-item ${String(item.project.id) === String(activeProjectId) ? "is-active" : ""}"
      data-select-project-id="${escapeHtml(item.project.id)}"
    >
      <strong>${escapeHtml(item.project.name)}</strong>
      <span>${escapeHtml(t("projectsPage.projectListEntries", { count: item.entryCount }))}</span>
      <span>${formatCurrency(item.total)}</span>
    </button>
  `).join("");

  if (!activeProject || !activeStats) {
    projectDetail.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(t("projectsPage.selectProjectDetails"))}
      </div>
    `;
  } else {
    const relatedTransactions = getProjectTransactions(transactions, activeProject.name);
    const deletionRequest = deletionRequests.find(request => String(request.projectId) === String(activeProject.id));
    const currentUser = getCurrentUser();
    const canApproveDeletion = currentUser?.role === "Investor" && deletionRequest && !deletionRequest.approvedBy.includes(currentUser.mobile);
    const deletionRequestMarkup = deletionRequest ? `
      <div class="approval-card">
        <div>
          <h3>Project deletion approval pending</h3>
          <p>${escapeHtml(deletionRequest.requestedByName)} requested deletion. ${deletionRequest.approvedBy.length} of ${deletionRequest.requiredApprovals} investor approvals received.</p>
        </div>
        ${canApproveDeletion ? `<button type="button" class="button-danger" data-approve-project-deletion-id="${escapeHtml(activeProject.id)}">Approve deletion</button>` : ""}
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
}

function readDynamicMembers(role) {
  return Array.from(document.querySelectorAll(`[data-new-${role}-field]`))
    .map(nameInput => ({
      name: nameInput.value.trim(),
      mobile: nameInput.parentElement.querySelector(`[data-new-${role}-mobile]`).value.trim()
    }))
    .filter(member => member.name || member.mobile);
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
  const selectedInvestorNames = Array.from(
    document.querySelectorAll("[data-new-project-investor]:checked")
  ).map(inputElement => inputElement.value);
  const selectedSupervisorNames = Array.from(
    document.querySelectorAll("[data-new-project-supervisor]:checked")
  ).map(inputElement => inputElement.value);
  const typedInvestors = readDynamicMembers("investor");
  const typedSupervisors = readDynamicMembers("supervisor");
  const typedInvestorNames = uniqueStrings(typedInvestors.map(member => member.name));
  const typedSupervisorNames = uniqueStrings(typedSupervisors.map(member => member.name));
  const existingInvestorNames = new Set(investors.map(investor => normalizeName(investor.name)));
  const existingSupervisorNames = new Set(
    supervisors.map(supervisor => normalizeName(supervisor.name))
  );
  const newInvestorsToCreate = typedInvestorNames.filter(
    investorName => !existingInvestorNames.has(normalizeName(investorName))
  );
  const newSupervisorsToCreate = typedSupervisorNames.filter(
    supervisorName => !existingSupervisorNames.has(normalizeName(supervisorName))
  );
  const assignedInvestorNames = uniqueStrings([
    ...selectedInvestorNames,
    ...typedInvestorNames,
    ...(currentUser?.role === "Investor" ? [currentUser.name] : [])
  ]);
  const assignedSupervisorNames = uniqueStrings([
    ...selectedSupervisorNames,
    ...typedSupervisorNames,
    ...(currentUser?.role === "Supervisor" ? [currentUser.name] : [])
  ]);

  if (!name) {
    alert(t("projectsPage.alertEnterProjectName"));
    return;
  }

  if (projects.some(project => normalizeName(project.name) === normalizeName(name))) {
    alert(t("projectsPage.alertProjectExists"));
    return;
  }

  if (!assignedInvestorNames.length && !assignedSupervisorNames.length) {
    alert(t("projectsPage.alertNeedOneMember"));
    return;
  }

  if (newInvestorsToCreate.length) {
    investors = [
      ...investors,
      ...newInvestorsToCreate.map(investorName => ({
        id: uid(),
        name: investorName,
        mobile: typedInvestors.find(member => member.name === investorName).mobile
      }))
    ].sort((left, right) => left.name.localeCompare(right.name));
    saveInvestors();
  }

  if (newSupervisorsToCreate.length) {
    supervisors = [
      ...supervisors,
      ...newSupervisorsToCreate.map(supervisorName => ({
        id: uid(),
        name: supervisorName,
        mobile: typedSupervisors.find(member => member.name === supervisorName).mobile
      }))
    ].sort((left, right) => left.name.localeCompare(right.name));
    saveSupervisors();
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
    investorNames: assignedInvestorNames,
    supervisorNames: assignedSupervisorNames
  };
  const memberIndex = new Map([...investors, ...supervisors].map(member => [normalizeName(member.name), member]));
  const projectMembers = [
    ...assignedInvestorNames.map(memberName => ({ name: memberName, mobile: memberIndex.get(normalizeName(memberName))?.mobile, role: "Investor" })),
    ...assignedSupervisorNames.map(memberName => ({ name: memberName, mobile: memberIndex.get(normalizeName(memberName))?.mobile, role: "Supervisor" }))
  ];
  if (projectMembers.some(member => !member.mobile)) {
    alert("Every project member needs a mobile number. Add the member again with their mobile number.");
    return;
  }
  try {
    await saveRemoteProject(newProject, projectMembers);
  } catch (error) {
    alert(error.message);
    return;
  }
  projects.push(newProject);

  saveProjects();
  selectedNewProjectInvestors.clear();
  selectedNewProjectSupervisors.clear();
  input.value = "";
  addProjectButton.style.display = "none";
  refreshState();
  activeProjectId = String(projects.find(project => project.name === name)?.id || activeProjectId);
  window.history.replaceState({}, "", `projects.html?id=${encodeURIComponent(activeProjectId)}`);
  renderAll();
}

function deleteProject(projectId) {
  const project = projects.find(item => String(item.id) === String(projectId));
  if (!project) return;
  const existing = deletionRequests.find(request => String(request.projectId) === String(projectId));
  if (existing) { alert(`Deletion approval is already pending: ${existing.approvedBy.length} of ${existing.requiredApprovals} investor approvals received.`); return; }
  deletionTargetId = String(projectId);
  document.getElementById("deleteProjectModalMessage").textContent = `Request deletion of "${project.name}"? This needs approval from ${Math.max((project.investorNames || []).length - 1, 0)} investor(s).`;
  document.getElementById("deleteProjectModal").hidden = false;
  const confirmButton = document.getElementById("confirmProjectDeletion");
  const countdown = document.getElementById("deleteProjectCountdown");
  let seconds = 10;
  confirmButton.disabled = true;
  countdown.textContent = `Confirm available in ${seconds} seconds.`;
  clearInterval(deletionCountdownTimer);
  deletionCountdownTimer = setInterval(() => {
    seconds -= 1;
    countdown.textContent = seconds ? `Confirm available in ${seconds} seconds.` : "You can now request investor approval.";
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
  alert(result.deleted ? "Project deleted: N - 1 investor approvals is zero for this project." : "Deletion request sent to the project investors for approval.");
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

function renderAll() {
  const heading = document.getElementById("projectsHeroTitle");
  const currentUser = getCurrentUser();
  if (heading && currentUser) heading.textContent = `Welcome, ${currentUser.name}`;
  renderProjectOverview();
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
    const user = await response.json();
    if (!response.ok) throw new Error(user.error || "User lookup failed.");
    const isSupervisor = user.role === "Supervisor";
    const collection = isSupervisor ? supervisors : investors;
    if (!collection.some(member => normalizeName(member.name) === normalizeName(user.name))) {
      const member = { id: user.id, name: user.name, mobile: user.mobile };
      if (isSupervisor) { supervisors = [...supervisors, member].sort((a, b) => a.name.localeCompare(b.name)); saveSupervisors(); }
      else { investors = [...investors, member].sort((a, b) => a.name.localeCompare(b.name)); saveInvestors(); }
    }
    (isSupervisor ? selectedNewProjectSupervisors : selectedNewProjectInvestors).add(user.name);
    input.value = "";
    helper.textContent = `${user.name} added as ${user.role}.`;
    renderCreateProjectMembers();
  } catch (error) {
    helper.textContent = error.message;
  }

  const newMembers = [
    ...typedInvestors.map(member => ({ ...member, role: "Investor" })),
    ...typedSupervisors.map(member => ({ ...member, role: "Supervisor" }))
  ];
  if (newMembers.some(member => !member.name || !member.mobile)) {
    alert("Enter both name and mobile number for every new investor or supervisor.");
    return;
  }
  try {
    for (const member of newMembers) {
      const response = await fetch(API_BASE_URL + "/api/project-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(member)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Member could not be saved to the database.");
    }
  } catch (error) {
    alert(error.message);
    return;
  }
}

const projectInput = document.getElementById("projectName");
const addProjectButton = document.getElementById("addProjectButton");

// Hide button initially
addProjectButton.style.display = "none";

// Show/Hide button while typing
projectInput.addEventListener("input", () => {
  addProjectButton.style.display =
    projectInput.value.trim() ? "block" : "none";
});

// Click event
addProjectButton.addEventListener("click", addProject);

// Enter key support
projectInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    addProject();
  }
});

document.getElementById("addInvestorFieldButton").addEventListener("click", () => {
  createDynamicMemberField("newProjectInvestorInputs", "investor");
});

document.getElementById("addSupervisorFieldButton").addEventListener("click", () => {
  createDynamicMemberField("newProjectSupervisorInputs", "supervisor");
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
window.addEventListener("app-languagechange", renderAll);

refreshState();
renderAll();
hydrateWorkspaceFromDatabase(API_BASE_URL)
  .then(async () => {
    await loadDeletionRequests();
    refreshState();
    renderAll();
  })
  .catch(error => {
    console.warn("Saved workspace restore skipped.", error);
  });
