let investors = [];
let supervisors = [];
let projects = [];
let transactions = [];
let project = null;
let pendingTransactions = [];
let investments = [];
let pendingInvestments = [];
let pendingDeletionRequests = { projectDeletion: null, transactionDeletions: [] };
let selectedInvestorForHistory = "";
let investmentRequestInvestor = null;
let requestSuccessTimer = null;
let activeProjectSection = new URLSearchParams(window.location.search).get("section") === "approvals" ? "approvals" : "";

function showProjectSection(section) {
  activeProjectSection = section;
  const navigatorIntro = document.getElementById("projectNavigatorIntro");
  if (navigatorIntro) navigatorIntro.hidden = Boolean(section);
  document.querySelectorAll("[data-project-section]").forEach(element => {
    element.hidden = element.dataset.projectSection !== section;
  });
  document.querySelectorAll("[data-project-section-target]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.projectSectionTarget === section);
  });
  // The transaction/member panels share a layout container; collapse it when
  // neither of its children belongs to the active destination.
  document.querySelectorAll(".content-grid-tight").forEach(grid => {
    const routedChildren = grid.querySelectorAll(":scope > [data-project-section]");
    if (routedChildren.length) grid.hidden = !Array.from(routedChildren).some(child => !child.hidden);
  });
}

function showRequestSubmitted(message = "Your request has been submitted.", isError = false) {
  const toast = document.getElementById("requestSuccessToast");
  if (!toast) return;
  toast.classList.toggle("is-error", isError);
  toast.querySelector("span:first-child").textContent = isError ? "✕" : "✓";
  document.getElementById("requestSuccessToastText").textContent = message;
  toast.hidden = false;
  clearTimeout(requestSuccessTimer);
  requestSuccessTimer = window.setTimeout(() => { toast.hidden = true; }, 3500);
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

  resolveProject();
}

function getRequestedProjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function resolveProject() {
  const requestedId = getRequestedProjectId();
  project = projects.find(item => String(item.id) === String(requestedId)) || null;

  if (!project && projects.length) {
    project = projects[0];
    const nextUrl = `project.html?id=${encodeURIComponent(project.id)}`;
    window.history.replaceState({}, "", nextUrl);
  }
}

function getPageTransactions() {
  return project ? getProjectTransactions(transactions, project.name) : [];
}

function getAssignedMemberNames(memberType) {
  return project ? getProjectMemberNames(project, memberType) : [];
}

function getProjectMemberNamesForPage(memberType) {
  if (!project) {
    return [];
  }

  return uniqueStrings([
    ...getAssignedMemberNames(memberType),
    ...collectHistoricalMemberNames(transactions, project.name, memberType)
  ]);
}

function getCollectionForMemberType(memberType) {
  return memberType === "Supervisor" ? supervisors : investors;
}

function getMemberRoleClass(memberType) {
  return memberType === "Supervisor" ? "supervisor" : "investor";
}

function getAvailableEntryRoles() {
  return ["Investor", "Supervisor"].filter(
    memberType => getAssignedMemberNames(memberType).length
  );
}

function getVisibleFilterRoles() {
  return ["Investor", "Supervisor"].filter(
    memberType => getProjectMemberNamesForPage(memberType).length
  );
}

function getUnassignedGlobalNames(memberType) {
  const assignedNames = new Set(getAssignedMemberNames(memberType));
  return getCollectionForMemberType(memberType)
    .map(member => member.name)
    .filter(name => !assignedNames.has(name))
    .sort((a, b) => a.localeCompare(b));
}

function renderMissingProject() {
  document.title = t("projectPage.title");
  document.getElementById("projectHeroTitle").textContent = t("projectPage.projectNotFound");
  document.getElementById("projectHeroSubtitle").textContent =
    t("projectPage.projectNotFoundSubtitle");
  document.getElementById("projectNavLink").textContent = t("common.projectPage");
  document.getElementById("projectNavLink").href = "project.html";
  document.getElementById("projectPageContent").innerHTML = `
    <section class="panel">
      <div class="empty-state">
        ${t("projectPage.projectNotFoundBody")}
      </div>
    </section>
  `;
}

function renderHeader() {
  document.title = `${project.name} | ${t("common.appName")}`;
  document.getElementById("projectHeroTitle").textContent = project.name;
  document.getElementById("projectHeroSubtitle").textContent =
    t("projectPage.heroSubtitleForProject", { projectName: project.name });
  document.getElementById("projectNavLink").textContent = project.name;
  document.getElementById("projectNavLink").href = `project.html?id=${encodeURIComponent(project.id)}`;
  document.getElementById("manageProjectLink").href = `projects.html?id=${encodeURIComponent(project.id)}`;
  document.getElementById("transactionHeading").textContent =
    t("projectPage.transactionsTitle", { projectName: project.name });
}

function renderOverview() {
  const pageTransactions = getPageTransactions();
  const totalInvested = investments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalSpent = sumTransactions(pageTransactions);

  document.getElementById("statProjectInvestorCount").textContent =
    getProjectMemberNamesForPage("Investor").length;
  document.getElementById("statProjectSupervisorCount").textContent =
    getProjectMemberNamesForPage("Supervisor").length;
  document.getElementById("statProjectEntryCount").textContent = pageTransactions.length;
  document.getElementById("statProjectSpend").textContent = formatCurrency(
    totalSpent
  );
  document.getElementById("statProjectInvestment").textContent = formatCurrency(totalInvested);
  document.getElementById("statProjectInvestmentBalance").textContent = formatCurrency(totalInvested - totalSpent);
}

function renderMemberStandings(listId, memberType) {
  const list = document.getElementById(listId);
  const pageTransactions = getPageTransactions();
  const totals = buildParticipantTotals(pageTransactions, memberType);
  const entryCounts = buildParticipantEntryCounts(pageTransactions, memberType);
  const memberNames = getProjectMemberNamesForPage(memberType);
  const assignedNames = new Set(getAssignedMemberNames(memberType));
  const roleClass = getMemberRoleClass(memberType);
  const roleLabel = getMemberTypeLabel(memberType);

  if (!memberNames.length) {
    list.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(t("projectPage.noAssignedMembers", { memberType: roleLabel }))}
      </div>
    `;
    return;
  }

  list.innerHTML = memberNames.map(memberName => `
    <article class="investor-card member-card member-card-${roleClass} ${memberType === "Investor" ? "investor-history-trigger" : ""}" ${memberType === "Investor" ? `data-investor-history="${escapeHtml(memberName)}"` : ""}>
      <div class="approval-heading">
        <h3>${escapeHtml(memberName)}</h3>
        ${memberType === "Investor" ? `<button type="button" class="button-secondary add-investment-button" data-add-investment-for="${escapeHtml(memberName)}">Add investment</button>` : ""}
      </div>
      <div class="chip-row">
        <span class="chip ${assignedNames.has(memberName) ? "" : "muted-chip"}">
          ${escapeHtml(assignedNames.has(memberName) ? t("common.assigned") : t("common.historical"))}
        </span>
      </div>
      <div class="card-meta">
        ${memberType === "Investor" ? `<div class="meta-row"><span>Total invested</span><strong class="amount">${formatCurrency(investments.filter(item => item.investorName === memberName).reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong></div>` : ""}
        <div class="meta-row">
          <span>${escapeHtml(t("common.totalSpent"))}</span>
          <strong class="amount">${formatCurrency(totals[memberName] || 0)}</strong>
        </div>
        <div class="meta-row">
          <span>${escapeHtml(t("common.entries"))}</span>
          <strong>${entryCounts[memberName] || 0}</strong>
        </div>
      </div>
    </article>
  `).join("");
}

async function loadInvestments() {
  if (!project) return;
  try {
    const [confirmed, pending] = await Promise.all([
      fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(project.id)}/investments`, { cache: "no-store" }),
      fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(project.id)}/pending-investments`, { cache: "no-store" })
    ]);
    if (!confirmed.ok || !pending.ok) throw new Error("Unable to load investment records.");
    investments = await confirmed.json(); pendingInvestments = await pending.json();
    // Investment polling should not rebuild every form, filter, and ledger.
    // Refresh only the views whose values can change here.
    renderOverview();
    renderInvestorHistory();
    renderPendingApprovals();
  } catch (error) { console.warn("Investment records unavailable.", error); }
}

function renderInvestorHistory() {
  const title = document.getElementById("investorHistoryTitle"), list = document.getElementById("investorHistoryList");
  title.textContent = "Investment Ledger";
  if (!investments.length) { list.innerHTML = '<div class="empty-state">No approved investments yet.</div>'; return; }
  list.innerHTML = `<table class="transaction-table"><thead><tr><th>Investor</th><th>Amount</th><th>Investment date</th><th>Approved by</th></tr></thead><tbody>${investments.map(item => `<tr><td>${escapeHtml(item.investorName)}</td><td>${formatCurrency(item.amount)}</td><td>${escapeHtml(formatTransactionDate({ createdAt: item.createdAt }))}</td><td>${renderApprovalHistory(item.approvalHistory)}</td></tr>`).join("")}</tbody></table>`;
}

function renderTransactionForm() {
  const roleSelect = document.getElementById("transactionMemberType");
  const memberSelect = document.getElementById("transactionMember");
  const button = document.getElementById("addTransactionButton");
  const helper = document.getElementById("transactionHelper");
  const selectedRole = roleSelect.value;
  const selectedMember = memberSelect.value;
  const availableRoles = getAvailableEntryRoles();
  const resolvedRole = availableRoles.includes(selectedRole)
    ? selectedRole
    : (availableRoles[0] || "");
  const memberOptions = resolvedRole ? getAssignedMemberNames(resolvedRole) : [];

  roleSelect.innerHTML = `<option value="">${escapeHtml(t("common.chooseRole"))}</option>`;
  availableRoles.forEach(memberType => {
    roleSelect.innerHTML += `
      <option value="${escapeHtml(memberType)}">${escapeHtml(getMemberTypeLabel(memberType))}</option>
    `;
  });
  roleSelect.value = resolvedRole;
  roleSelect.disabled = availableRoles.length <= 1;

  memberSelect.innerHTML = `
    <option value="">${escapeHtml(
      resolvedRole
        ? t(`common.${resolvedRole === "Supervisor" ? "chooseExistingSupervisor" : "chooseExistingInvestor"}`)
        : t("common.chooseMember")
    )}</option>
  `;
  memberOptions.forEach(memberName => {
    memberSelect.innerHTML += `
      <option value="${escapeHtml(memberName)}">${escapeHtml(memberName)}</option>
    `;
  });
  memberSelect.value = memberOptions.includes(selectedMember) ? selectedMember : "";
  memberSelect.disabled = !memberOptions.length;

  if (!availableRoles.length) {
    helper.textContent = t("projectPage.helperAddMemberFirst", { projectName: project.name });
    button.disabled = true;
    return;
  }

  if (!memberOptions.length) {
    helper.textContent = t("projectPage.helperNoAssignedRole", {
      memberType: getMemberTypeLabel(resolvedRole)
    });
    button.disabled = true;
    return;
  }

  helper.textContent = t("projectPage.helperOnlyAssigned", {
    memberType: getMemberTypeLabel(resolvedRole),
    projectName: project.name
  });
  button.disabled = false;
}

function renderProjectMemberManager() {
  const roleSelect = document.getElementById("projectMemberRole");
  const existingSelect = document.getElementById("projectMemberExisting");
  const helper = document.getElementById("projectMemberHelper");
  const selectedRole = roleSelect.value;
  const resolvedRole = ["Investor", "Supervisor"].includes(selectedRole)
    ? selectedRole
    : "Investor";
  // Investors already assigned to this project remain selectable because they
  // can submit an additional contribution; supervisors cannot be duplicated.
  const unassignedNames = resolvedRole === "Investor"
    ? getCollectionForMemberType("Investor").map(member => member.name).sort((a, b) => a.localeCompare(b))
    : getUnassignedGlobalNames(resolvedRole);
  const memberTypeLabel = getMemberTypeLabel(resolvedRole);

  roleSelect.value = resolvedRole;
  existingSelect.innerHTML = `
    <option value="">${escapeHtml(
      resolvedRole === "Supervisor"
        ? t("common.chooseExistingSupervisor")
        : t("common.chooseExistingInvestor")
    )}</option>
  `;

  unassignedNames.forEach(memberName => {
    existingSelect.innerHTML += `
      <option value="${escapeHtml(memberName)}">${escapeHtml(memberName)}</option>
    `;
  });

  helper.textContent = unassignedNames.length
    ? t("projectPage.memberManagerHelperChoose", { memberType: memberTypeLabel })
    : t("projectPage.memberManagerHelperNone", { memberType: memberTypeLabel });
}

function renderFilters() {
  const roleFilter = document.getElementById("filterRole");
  const memberFilter = document.getElementById("filterMember");
  const paidToFilter = document.getElementById("filterPaidTo");
  const selectedRole = roleFilter.value;
  const selectedMember = memberFilter.value;
  const selectedPaidTo = paidToFilter.value;
  const pageTransactions = getPageTransactions();
  const roleOptions = getVisibleFilterRoles();
  const resolvedRole = roleOptions.includes(selectedRole) ? selectedRole : "";
  const memberOptions = resolvedRole
    ? getProjectMemberNamesForPage(resolvedRole)
    : uniqueStrings([
        ...getProjectMemberNamesForPage("Investor"),
        ...getProjectMemberNamesForPage("Supervisor")
      ]);
  const paidToOptions = uniqueStrings(pageTransactions.map(tx => tx.receiver));

  roleFilter.innerHTML = `<option value="">${escapeHtml(t("common.allRoles"))}</option>`;
  roleOptions.forEach(memberType => {
    roleFilter.innerHTML += `
      <option value="${escapeHtml(memberType)}">${escapeHtml(getMemberTypeLabel(memberType))}</option>
    `;
  });
  roleFilter.value = resolvedRole;

  memberFilter.innerHTML = `<option value="">${escapeHtml(t("common.allNames"))}</option>`;
  memberOptions.forEach(memberName => {
    memberFilter.innerHTML += `
      <option value="${escapeHtml(memberName)}">${escapeHtml(memberName)}</option>
    `;
  });
  memberFilter.value = memberOptions.includes(selectedMember) ? selectedMember : "";

  paidToFilter.innerHTML = `<option value="">${escapeHtml(t("common.allPaidTo"))}</option>`;
  paidToOptions.forEach(name => {
    paidToFilter.innerHTML += `
      <option value="${escapeHtml(name)}">${escapeHtml(name)}</option>
    `;
  });
  paidToFilter.value = paidToOptions.includes(selectedPaidTo) ? selectedPaidTo : "";
}

function getSelectedBillFile() {
  const input = document.getElementById("transactionBill");
  return input?.files?.[0] || null;
}

function readBillImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({
          name: file.name,
          type: file.type || "image/jpeg",
          dataUrl: canvas.toDataURL("image/jpeg", 0.82)
        });
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const API_BASE_URL = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "";

function getTransactionById(id) {
  return transactions.find(tx => String(tx.id) === String(id));
}

function renderBillLink(tx) {
  if (!tx.billImage?.dataUrl) {
    return `<div class="ledger-bill-actions"><button type="button" class="delete-ledger-transaction button-secondary" data-delete-ledger-id="${escapeHtml(tx.id)}">Delete</button></div>`;
  }
  return `<div class="ledger-bill-actions"><button type="button" class="bill-link" data-bill-id="${escapeHtml(tx.id)}">View</button><button type="button" class="delete-ledger-transaction button-secondary" data-delete-ledger-id="${escapeHtml(tx.id)}">Delete</button></div>`;
}

async function requestLedgerDeletion(id) {
  if (!confirm("Send this transaction deletion for investor approval?")) return;
  const response = await fetch(`${API_BASE_URL}/api/transactions/${encodeURIComponent(id)}/deletion-request`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { showRequestSubmitted(result.error || "Deletion request could not be sent.", true); return; }
  if (result.deleted) { await loadRemoteTransactions(); refreshState(); renderAll(); }
  if (result.request) {
    pendingDeletionRequests.transactionDeletions = [
      ...pendingDeletionRequests.transactionDeletions.filter(item => String(item.transactionId) !== String(result.request.transactionId)),
      result.request
    ];
    renderPendingApprovals();
  }
  // Keep the card in sync with approvals from other users, but do not make
  // the submitted confirmation depend on this follow-up request succeeding.
  loadPendingDeletionRequests().catch(error => console.warn(error.message));
  showRequestSubmitted(result.deleted ? "Transaction deleted." : "Deletion request sent to this project's pending approvals.");
}

async function approveLedgerDeletion(id) {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${encodeURIComponent(id)}/deletion-request/approve`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { showRequestSubmitted(result.error || "Deletion approval could not be recorded.", true); return; }
  await Promise.all([loadPendingDeletionRequests(), loadRemoteTransactions()]);
  refreshState(); renderAll();
  showRequestSubmitted(result.deleted ? "Entry deleted after approval." : "Your deletion approval was recorded.");
}

async function denyLedgerDeletion(id) {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${encodeURIComponent(id)}/deletion-request/deny`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { showRequestSubmitted(result.error || "Ledger deletion request could not be denied.", true); return; }
  await loadPendingDeletionRequests();
  showRequestSubmitted("Ledger deletion request denied and removed.");
}

async function approveProjectDeletion(id) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(id)}/deletion-request/approve`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { showRequestSubmitted(result.error || "Project deletion approval could not be recorded.", true); return; }
  if (result.deleted) { showRequestSubmitted("Project deleted after approval."); window.setTimeout(() => { window.location.href = "index.html"; }, 900); return; }
  await loadPendingDeletionRequests();
  showRequestSubmitted("Your project deletion approval was recorded.");
}

async function denyProjectDeletion(id) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(id)}/deletion-request/deny`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { showRequestSubmitted(result.error || "Project deletion request could not be denied.", true); return; }
  await loadPendingDeletionRequests();
  showRequestSubmitted("Project deletion request denied and removed.");
}

function openBillPreview(transactionId) {
  const tx = getTransactionById(transactionId);
  openBillPreviewForRecord(tx);
}

function openBillPreviewForRecord(tx) {
  if (!tx?.billImage?.dataUrl) return;
  const modal = document.getElementById("billPreviewModal");
  const image = document.getElementById("billPreviewImage");
  const title = document.getElementById("billPreviewTitle");
  image.src = tx.billImage.dataUrl;
  image.alt = tx.billImage.name || "Transaction bill";
  title.textContent = tx.billImage.name || "Bill Image";
  modal.hidden = false;
}

function closeBillPreview() {
  const modal = document.getElementById("billPreviewModal");
  const image = document.getElementById("billPreviewImage");
  modal.hidden = true;
  image.removeAttribute("src");
}

function updateBillFileName() {
  const helper = document.getElementById("transactionBillName");
  const file = getSelectedBillFile();

  if (helper) {
    helper.textContent = file
      ? file.name
      : "Optional — choose an image from your gallery or take a photo";
  }
}

function setDatabaseStatus(message, isError = false) {
  const status = document.getElementById("databaseStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("db-status-error", isError);
}

async function checkDatabaseStatus() {
  const healthUrl = API_BASE_URL + "/api/health";

  try {
    const response = await fetch(healthUrl, { cache: "no-store" });

    if (response.ok) {
      setDatabaseStatus("Online database connected");
      return;
    }

    let message = `Online database not connected (${response.status})`;
    try {
      const body = await response.json();
      if (body.error) {
        message += `: ${body.error}`;
      }
    } catch (error) {
      // Keep the status-only message when the response is not JSON.
    }

    setDatabaseStatus(message, true);
  } catch (error) {
    setDatabaseStatus(`Online database not connected: ${error.message}. Use http://127.0.0.1:4173/project.html`, true);
  }
}

async function loadRemoteTransactions() {
  try {
    const response = await fetch(API_BASE_URL + "/api/transactions", { cache: "no-store" });
    if (!response.ok) return;
    const remoteTransactions = await response.json();
    if (!Array.isArray(remoteTransactions)) return;
    const merged = new Map(transactions.map(tx => [String(tx.id), tx]));
    remoteTransactions.forEach(tx => merged.set(String(tx.id), tx));
    transactions = [...merged.values()];
    writeCollection(STORAGE_KEYS.transactions, transactions);
  } catch (error) {
    console.warn("Online transaction load skipped.", error);
  }
}

async function saveRemoteTransaction(transaction) {
  const response = await fetch(API_BASE_URL + "/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction)
  });
  if (!response.ok) {
    let message = "Transaction could not be saved online.";
    try {
      const body = await response.json();
      message = body.error || message;
    } catch (error) {
      // Keep the fallback message when the server returns non-JSON output.
    }
    throw new Error(message);
  }
}

async function assignProjectMember(projectId, member) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/members`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(member)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Member could not be assigned to this project.");
}

function getCurrentUserName() {
  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser") || "null");
    return user?.name?.trim() || "";
  } catch (error) {
    return "";
  }
}

// Deletion approvals are keyed by a member's mobile number, whereas expense
// approvals use their name. Keep the full signed-in member available for the
// former without changing the existing name-based transaction flow.
function getCurrentUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser") || "null");
    return user?.name && user?.mobile && ["Investor", "Supervisor"].includes(user.role)
      ? user
      : null;
  } catch (error) {
    return null;
  }
}

async function loadPendingTransactions() {
  if (!project) return;
  try {
    const response = await fetch(`${API_BASE_URL}/api/pending-transactions?project=${encodeURIComponent(project.name)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load approval notifications.");
    pendingTransactions = await response.json();
    renderPendingApprovals();
  } catch (error) {
    const status = document.getElementById("approvalStatus");
    if (status) status.textContent = error.message;
  }
}

async function loadPendingDeletionRequests() {
  if (!project) return;
  // Project deletion requests existed before the combined deletion endpoint.
  // Read the established feed too, so already-pending requests are never
  // hidden from the project approval screen.
  const [projectResponse, transactionResponse, combinedResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/api/project-deletion-requests`, { cache: "no-store" }),
    fetch(`${API_BASE_URL}/api/pending-transaction-deletions?project=${encodeURIComponent(project.name)}`, { cache: "no-store" }),
    fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(project.id)}/pending-deletion-requests`, { cache: "no-store" })
  ]);
  if (!projectResponse.ok) throw new Error("Unable to load project deletion approvals.");
  const projectRequests = await projectResponse.json();
  const matchingProjectRequest = projectRequests.find(request => String(request.projectId) === String(project.id)) || null;
  const combined = combinedResponse.ok ? await combinedResponse.json() : { transactionDeletions: [] };
  const transactionDeletions = transactionResponse.ok ? await transactionResponse.json() : combined.transactionDeletions;
  pendingDeletionRequests = {
    projectDeletion: matchingProjectRequest || combined.projectDeletion || null,
    transactionDeletions: Array.isArray(transactionDeletions) ? transactionDeletions : []
  };
  renderPendingApprovals();
}

function renderPendingApprovals() {
  const list = document.getElementById("pendingApprovalList");
  const status = document.getElementById("approvalStatus");
  if (!list || !status) return;
  const currentUser = getCurrentUserName();
  const approvable = pendingTransactions.filter(tx =>
    tx.eligibleApprovers.some(name => name.toLocaleLowerCase() === currentUser.toLocaleLowerCase()) &&
    !tx.approvedBy.some(name => name.toLocaleLowerCase() === currentUser.toLocaleLowerCase())
  );
  const deletionMarkup = renderDeletionRequests(currentUser);
  const deletionCount = (pendingDeletionRequests.projectDeletion ? 1 : 0) + pendingDeletionRequests.transactionDeletions.length;
  status.innerHTML = pendingTransactions.length || deletionCount
    ? `${pendingTransactions.length + deletionCount} pending <span class="notification-badge">${approvable.length} transaction approvals for you</span>`
    : "No pending transaction approvals.";
  if (!pendingTransactions.length && !deletionMarkup) {
    list.innerHTML = '<div class="empty-state">All submitted expenses have been approved.</div>';
  } else {
    list.innerHTML = deletionMarkup + pendingTransactions.map(tx => {
    const canApprove = approvable.some(item => item.id === tx.id);
    const remaining = Math.max(0, tx.requiredApprovals - tx.approvedBy.length);
    const billMarkup = tx.billImage?.dataUrl
      ? `<button type="button" class="approval-bill-preview" data-pending-bill-id="${escapeHtml(tx.id)}">
          <img src="${escapeHtml(tx.billImage.dataUrl)}" alt="Bill submitted for ${escapeHtml(tx.receiver)}" />
          <span>View bill photo</span>
        </button>`
      : '<span class="approval-no-bill">No bill photo attached</span>';
    return `<article class="approval-card">
      <div class="approval-details request-transaction-card">
        <div class="approval-heading">
          <div><span class="eyebrow request-type-transaction">Transaction request</span><h3>${escapeHtml(tx.receiver)}</h3></div>
          <strong class="approval-amount">${formatCurrency(tx.amount)}</strong>
        </div>
        <dl class="approval-meta">
          <div><dt>Submitted by</dt><dd>${escapeHtml(tx.proposerName || tx.memberName)}</dd></div>
          <div><dt>Expense entered by</dt><dd>${escapeHtml(tx.memberName)} (${escapeHtml(getMemberTypeLabel(tx.memberType))})</dd></div>
          <div><dt>Submitted on</dt><dd>${escapeHtml(formatTransactionDate(tx))}</dd></div>
          <div><dt>Approval progress</dt><dd>${escapeHtml(tx.approvedBy.length)} of ${escapeHtml(tx.requiredApprovals)} investors · ${remaining ? `${remaining} more needed` : "ready to save"}</dd></div>
        </dl>
        <div class="approval-bill-row">${billMarkup}</div>
      </div>
      <div class="approval-actions">
        ${canApprove ? `<div class="approval-decision-buttons"><button type="button" class="approve-transaction approval-icon-button approval-icon-approve" data-approval-id="${escapeHtml(tx.id)}" aria-label="Approve transaction" title="Approve">✓</button><button type="button" class="deny-transaction approval-icon-button approval-icon-deny" data-denial-id="${escapeHtml(tx.id)}" aria-label="Deny transaction" title="Deny">✕</button></div>` : '<span class="chip muted-chip">Pending</span>'}
        ${tx.proposerName === currentUser ? `<button type="button" class="edit-pending-transaction button-secondary" data-edit-pending-id="${escapeHtml(tx.id)}">Edit</button><button type="button" class="delete-pending-transaction button-secondary" data-delete-pending-id="${escapeHtml(tx.id)}">Delete request</button>` : ""}
      </div>
    </article>`;
    }).join("");
  }
  const investmentList = document.getElementById("pendingInvestmentList");
  if (investmentList) {
    investmentList.innerHTML = pendingInvestments.length ? pendingInvestments.map(item => {
      const canApprove = item.eligibleApprovers.some(name => name.toLowerCase() === currentUser.toLowerCase()) && !item.approvedBy.some(name => name.toLowerCase() === currentUser.toLowerCase());
      return `<article class="approval-card"><div class="approval-details request-investment-card"><div class="approval-heading"><div><span class="eyebrow request-type-investment">Investment request</span><h3>${escapeHtml(item.investorName)}${item.isNewInvestor ? " · New investor" : " · Additional investment"}</h3></div><strong class="approval-amount">${formatCurrency(item.amount)}</strong></div><p class="helper-text">Submitted by ${escapeHtml(item.proposerName)} · ${item.approvedBy.length} of ${item.requiredApprovals} approvals</p></div><div class="approval-actions">${canApprove ? `<div class="approval-decision-buttons"><button type="button" class="approve-investment approval-icon-button approval-icon-approve" data-investment-approval-id="${escapeHtml(item.id)}" aria-label="Approve investment" title="Approve">✓</button><button type="button" class="deny-investment approval-icon-button approval-icon-deny" data-investment-denial-id="${escapeHtml(item.id)}" aria-label="Deny investment" title="Deny">✕</button></div>` : '<span class="chip muted-chip">Pending</span>'}</div></article>`;
    }).join("") : "";
  }
}

function renderDeletionRequests(currentUserName) {
  const user = getCurrentUser();
  const projectDeletion = pendingDeletionRequests.projectDeletion;
  const projectMarkup = projectDeletion ? (() => {
    const canApprove = user && projectDeletion.requestedByMobile !== user.mobile && !projectDeletion.approvedBy.includes(user.mobile);
    return `<article class="approval-card request-deletion-card"><div class="approval-details"><span class="eyebrow request-type-deletion">Deletion request</span><h3>Delete this project</h3><p class="helper-text">Requested by ${escapeHtml(projectDeletion.requestedByName)} · ${projectDeletion.approvedBy.length} of ${projectDeletion.requiredApprovals} member approvals received.</p></div><div class="approval-actions">${canApprove ? `<div class="approval-decision-buttons"><button type="button" class="approve-project-deletion button-danger" data-approve-project-deletion-id="${escapeHtml(project.id)}">Approve deletion</button><button type="button" class="deny-project-deletion button-secondary" data-deny-project-deletion-id="${escapeHtml(project.id)}">Deny deletion</button></div>` : '<span class="chip muted-chip">Pending</span>'}</div></article>`;
  })() : "";
  const transactionMarkup = pendingDeletionRequests.transactionDeletions.map(request => {
    const canApprove = request.eligibleApprovers.some(name => name.toLowerCase() === currentUserName.toLowerCase()) && !request.approvedBy.some(name => name.toLowerCase() === currentUserName.toLowerCase());
    return `<article class="approval-card request-deletion-card"><div class="approval-details"><div class="approval-heading"><div><span class="eyebrow request-type-deletion">Deletion request</span><h3>${escapeHtml(request.receiver)}</h3></div><strong class="approval-amount">${formatCurrency(request.amount)}</strong></div><p class="helper-text">Ledger entry requested for deletion by ${escapeHtml(request.requestedByName)} · ${request.approvedBy.length} of ${request.requiredApprovals} investor approvals received.</p></div><div class="approval-actions">${canApprove ? `<div class="approval-decision-buttons"><button type="button" class="approve-ledger-deletion button-danger" data-approve-ledger-deletion-id="${escapeHtml(request.transactionId)}">Approve deletion</button><button type="button" class="deny-ledger-deletion button-secondary" data-deny-ledger-deletion-id="${escapeHtml(request.transactionId)}">Deny deletion</button></div>` : '<span class="chip muted-chip">Pending</span>'}</div></article>`;
  }).join("");
  return projectMarkup + transactionMarkup;
}

async function approvePendingInvestment(id) {
  const response = await fetch(`${API_BASE_URL}/api/pending-investments/${encodeURIComponent(id)}/approve`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { alert(result.error || "Investment request could not be approved."); return; }
  await loadInvestments();
  alert(result.request.status === "approved" ? "Investment approved and recorded." : "Your approval was recorded.");
}

function openAddInvestmentModal(investorName) {
  const investor = investors.find(item => item.name === investorName);
  if (!investor) { alert("Investor details could not be found."); return; }
  investmentRequestInvestor = investor;
  document.getElementById("addInvestmentInvestorName").textContent = `Adding an investment for ${investor.name}`;
  document.getElementById("addInvestmentAmount").value = "";
  document.getElementById("addInvestmentHelper").textContent = "";
  document.getElementById("addInvestmentModal").hidden = false;
  document.getElementById("addInvestmentAmount").focus();
}

function closeAddInvestmentModal() {
  investmentRequestInvestor = null;
  document.getElementById("addInvestmentModal").hidden = true;
}

async function submitInvestmentRequest() {
  const amount = Number(document.getElementById("addInvestmentAmount").value);
  const helper = document.getElementById("addInvestmentHelper");
  if (!investmentRequestInvestor || !Number.isFinite(amount) || amount <= 0) { helper.textContent = "Enter a positive investment amount."; showRequestSubmitted(helper.textContent, true); return; }
  helper.textContent = "Sending investment request...";
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(project.id)}/investment-requests`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: investmentRequestInvestor.name, mobile: investmentRequestInvestor.mobile, amount })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Investment request could not be submitted.");
    closeAddInvestmentModal();
    await loadInvestments();
    showRequestSubmitted(
      result.request.status === "approved"
        ? "Investment added successfully."
        : "Investment request submitted successfully for approval."
    );
  } catch (error) {
    helper.textContent = error.message;
    showRequestSubmitted(error.message || "Investment request could not be sent.", true);
  }
}

async function approvePendingTransaction(id) {
  const approverName = getCurrentUserName();
  if (!approverName) { alert("Please log in again before approving a transaction."); return; }
  const response = await fetch(`${API_BASE_URL}/api/pending-transactions/${encodeURIComponent(id)}/approve`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approverName })
  });
  const result = await response.json();
  if (!response.ok) { alert(result.error || "Transaction could not be approved."); return; }
  showRequestSubmitted("Your approval has been submitted.");
  await Promise.all([loadPendingTransactions(), loadRemoteTransactions()]);
  refreshState(); renderAll();
  if (result.transaction.status === "approved") alert("Approval recorded. The transaction is now in the project ledger.");
}

async function denyPendingTransaction(id) {
  const response = await fetch(`${API_BASE_URL}/api/pending-transactions/${encodeURIComponent(id)}/deny`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { alert(result.error || "Transaction could not be denied."); return; }
  await loadPendingTransactions();
  showRequestSubmitted("Transaction request denied and removed.");
}

async function denyPendingInvestment(id) {
  const response = await fetch(`${API_BASE_URL}/api/pending-investments/${encodeURIComponent(id)}/deny`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { alert(result.error || "Investment request could not be denied."); return; }
  await loadInvestments();
  showRequestSubmitted("Investment request denied and removed.");
}

async function deletePendingTransaction(id) {
  if (!confirm("Delete this pending transaction request?")) return;
  const response = await fetch(`${API_BASE_URL}/api/pending-transactions/${encodeURIComponent(id)}/delete`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) { alert(result.error || "Request could not be deleted."); return; }
  showRequestSubmitted("Your delete request has been submitted.");
  await loadPendingTransactions();
}

async function editPendingTransaction(id) {
  const tx = pendingTransactions.find(item => String(item.id) === String(id));
  if (!tx) return;
  const receiver = prompt("Paid to", tx.receiver); if (receiver === null) return;
  const amount = Number(prompt("Amount", tx.amount)); if (!receiver.trim() || !Number.isFinite(amount) || amount <= 0) { alert("Enter a recipient and positive amount."); return; }
  const response = await fetch(`${API_BASE_URL}/api/pending-transactions/${encodeURIComponent(id)}/edit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transaction: { receiver: receiver.trim(), amount } }) });
  const result = await response.json(); if (!response.ok) { alert(result.error || "Request could not be updated."); return; }
  showRequestSubmitted("Your updated request has been submitted.");
  await loadPendingTransactions();
}

async function syncRemoteTransactions() {
  if (!transactions.length) return;
  try {
    await fetch(API_BASE_URL + "/api/transactions/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transactions)
    });
  } catch (error) {
    console.warn("Online transaction sync skipped.", error);
  }
}

function renderTransactions() {
  const tbody = document.getElementById("projectTransactionBody");
  const filteredTotal = document.getElementById("projectFilteredTotal");
  const roleFilter = document.getElementById("filterRole").value;
  const memberFilter = document.getElementById("filterMember").value;
  const paidToFilter = document.getElementById("filterPaidTo").value;
  const filtered = getPageTransactions().filter(tx => {
    const actorType = getTransactionActorType(tx);
    const actorName = getTransactionActorName(tx);
    const matchesRole = roleFilter ? actorType === roleFilter : true;
    const matchesMember = memberFilter ? actorName === memberFilter : true;
    const matchesPaidTo = paidToFilter ? tx.receiver === paidToFilter : true;
    return matchesRole && matchesMember && matchesPaidTo;
  });

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr class="table-empty-row">
        <td colspan="7">
          <div class="empty-table-state">
            ${escapeHtml(t("projectPage.noExpensesMatch", { projectName: project.name }))}
          </div>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = filtered.map(tx => `
      <tr>
        <td>${escapeHtml(getMemberTypeLabel(getTransactionActorType(tx)))}</td>
        <td>${escapeHtml(getTransactionActorName(tx))}</td>
        <td>${escapeHtml(tx.receiver)}</td>
        <td>${escapeHtml(tx.details || "—")}</td>
        <td>${formatCurrency(tx.amount)}</td>
        <td>${escapeHtml(formatTransactionDate(tx))}</td>
        <td>${renderApprovalHistory(tx.approvalHistory)}</td>
        <td>${renderBillLink(tx)}</td>
      </tr>
    `).join("");
  }

  filteredTotal.textContent = formatCurrency(sumTransactions(filtered));
}

function renderApprovalHistory(history) {
  if (!Array.isArray(history) || !history.length) return '<span class="approval-no-bill">No recorded approvals</span>';
  return history.map(item => {
    const name = typeof item === "string" ? item : item?.name;
    const approvedAt = typeof item === "object" ? item?.approvedAt : null;
    return `<div class="approval-history-item"><strong>${escapeHtml(name || "Investor")}</strong><small>${escapeHtml(approvedAt ? formatTransactionDate({ createdAt: approvedAt }) : "Date not available")}</small></div>`;
  }).join("");
}

async function addTransaction() {
  const memberType = document.getElementById("transactionMemberType").value;
  const memberName = document.getElementById("transactionMember").value;
  const receiver = document.getElementById("transactionPaidTo").value.trim();
  const details = document.getElementById("transactionDetails").value.trim();
  const amount = Number(document.getElementById("transactionAmount").value);
  const assignedNames = getAssignedMemberNames(memberType);
  const billFile = getSelectedBillFile();

  if (!memberType || !memberName || !receiver || !Number.isFinite(amount) || amount <= 0) {
    showRequestSubmitted(t("projectPage.alertFillTransactionFields"), true);
    return;
  }

  if (!assignedNames.includes(memberName)) {
    showRequestSubmitted(t("projectPage.alertChooseAssignedMember", {
      memberType: getMemberTypeLabel(memberType)
    }), true);
    return;
  }

  let billImage = null;

  try {
    billImage = await readBillImage(billFile);
  } catch (error) {
    showRequestSubmitted("The selected bill image could not be loaded. Please choose another image.", true);
    return;
  }

  const transaction = {
    id: uid(),
    project: project.name,
    memberType,
    memberName,
    investor: memberType === "Investor" ? memberName : "",
    supervisor: memberType === "Supervisor" ? memberName : "",
    receiver,
    details,
    amount,
    billImage,
    createdAt: new Date().toISOString()
  };

  try {
    const response = await fetch(API_BASE_URL + "/api/pending-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction,
        proposerName: getCurrentUserName() || memberName,
        investorNames: getAssignedMemberNames("Investor")
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Transaction could not be submitted for approval.");
    showRequestSubmitted("Your transaction request has been sent for approval.");
    if (result.transaction.status === "approved") {
      await loadRemoteTransactions();
      alert("Transaction saved to the ledger.");
    } else {
      alert("Transaction submitted for investor approval. It will appear in the ledger after the required approvals.");
    }
  } catch (error) {
    alert(error.message);
    return;
  }
  document.getElementById("transactionPaidTo").value = "";
  document.getElementById("transactionDetails").value = "";
  document.getElementById("transactionAmount").value = "";
  document.getElementById("transactionBill").value = "";
  updateBillFileName();
  refreshState();
  renderAll();
  loadPendingTransactions();
  loadPendingDeletionRequests();
}

async function addProjectMember() {
  const role = document.getElementById("projectMemberRole").value;
  const existingName = document.getElementById("projectMemberExisting").value;
  const mobileInput = document.getElementById("projectMemberMobile");
  const mobile = mobileInput.value.trim();
  if (!existingName && !mobile) { alert("Choose an existing member or enter a registered mobile number."); return; }
  if (existingName && mobile) { alert("Use either an existing member or a registered mobile number, not both."); return; }

  let member;
  try {
    if (mobile) {
      const response = await fetch(`${API_BASE_URL}/api/users/lookup?identifier=${encodeURIComponent(mobile)}`);
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("The application server is unavailable. Start it on port 4173, then try again.");
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No registered user matches this mobile number.");
      member = result;
    } else {
      member = getCollectionForMemberType(role).find(item => item.name === existingName);
      if (!member) throw new Error("The selected member could not be found.");
      member = { ...member, role };
    }
    if (!['Investor', 'Supervisor'].includes(member.role)) throw new Error("This user is not registered as an investor or supervisor.");
    if (getAssignedMemberNames(member.role).some(name => normalizeName(name) === normalizeName(member.name))) {
      throw new Error(`${member.name} is already assigned to this project.`);
    }
    await assignProjectMember(project.id, { name: member.name, mobile: member.mobile, role: member.role });
  } catch (error) { alert(error.message); return; }

  const projectIndex = projects.findIndex(item => String(item.id) === String(project.id));

  if (projectIndex === -1) {
    return;
  }

  const updatedProject = {
    ...projects[projectIndex],
    investorNames: member.role === "Investor"
      ? uniqueStrings([...getProjectInvestorNames(projects[projectIndex]), member.name])
      : getProjectInvestorNames(projects[projectIndex]),
    supervisorNames: member.role === "Supervisor"
      ? uniqueStrings([...getProjectSupervisorNames(projects[projectIndex]), member.name])
      : getProjectSupervisorNames(projects[projectIndex])
  };

  projects[projectIndex] = updatedProject;
  writeCollection(STORAGE_KEYS.projects, projects);
  mobileInput.value = "";
  document.getElementById("projectMemberExisting").value = "";
  refreshState();
  renderAll();
}

function renderAll() {
  if (!project) {
    renderMissingProject();
    return;
  }

  renderHeader();
  renderOverview();
  renderMemberStandings("projectInvestorList", "Investor");
  renderMemberStandings("projectSupervisorList", "Supervisor");
  renderTransactionForm();
  renderProjectMemberManager();
  renderFilters();
  renderTransactions();
  renderInvestorHistory();
  showProjectSection(activeProjectSection);
}

document.getElementById("addTransactionButton").addEventListener("click", addTransaction);
document.querySelector(".project-section-nav").addEventListener("click", event => {
  const button = event.target.closest("[data-project-section-target]");
  if (button) showProjectSection(button.dataset.projectSectionTarget);
});
document.getElementById("addProjectMemberButton").addEventListener("click", addProjectMember);
document.getElementById("transactionMemberType").addEventListener("change", renderTransactionForm);
document.getElementById("projectMemberRole").addEventListener("change", renderProjectMemberManager);
document.getElementById("filterRole").addEventListener("change", () => {
  renderFilters();
  renderTransactions();
});
document.getElementById("filterMember").addEventListener("change", renderTransactions);
document.getElementById("filterPaidTo").addEventListener("change", renderTransactions);
document.getElementById("transactionBill").addEventListener("change", updateBillFileName);
document.getElementById("transactionAmount").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    addTransaction();
  }
});
document.getElementById("projectMemberMobile").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    addProjectMember();
  }
});
document.getElementById("projectMemberMobile").addEventListener("input", event => {
  event.target.value = event.target.value.replace(/\D/g, "");
});
document
  .getElementById("projectTransactionBody")
  .addEventListener("click", (event) => {
    const button = event.target.closest(".bill-link");
    if (button) { openBillPreview(button.dataset.billId); return; }
    const deleteButton = event.target.closest(".delete-ledger-transaction");
    if (deleteButton) requestLedgerDeletion(deleteButton.dataset.deleteLedgerId);
  });

document.getElementById("pendingApprovalList").addEventListener("click", event => {
  const projectDeletionButton = event.target.closest(".approve-project-deletion");
  if (projectDeletionButton) { approveProjectDeletion(projectDeletionButton.dataset.approveProjectDeletionId); return; }
  const denyProjectDeletionButton = event.target.closest(".deny-project-deletion");
  if (denyProjectDeletionButton) { denyProjectDeletion(denyProjectDeletionButton.dataset.denyProjectDeletionId); return; }
  const ledgerDeletionButton = event.target.closest(".approve-ledger-deletion");
  if (ledgerDeletionButton) { approveLedgerDeletion(ledgerDeletionButton.dataset.approveLedgerDeletionId); return; }
  const denyLedgerDeletionButton = event.target.closest(".deny-ledger-deletion");
  if (denyLedgerDeletionButton) { denyLedgerDeletion(denyLedgerDeletionButton.dataset.denyLedgerDeletionId); return; }
  const billButton = event.target.closest(".approval-bill-preview");
  if (billButton) {
    const transaction = pendingTransactions.find(tx => String(tx.id) === String(billButton.dataset.pendingBillId));
    openBillPreviewForRecord(transaction);
    return;
  }
  const button = event.target.closest(".approve-transaction");
  if (button) approvePendingTransaction(button.dataset.approvalId);
  const denyButton = event.target.closest(".deny-transaction");
  if (denyButton) denyPendingTransaction(denyButton.dataset.denialId);
  const deleteButton = event.target.closest(".delete-pending-transaction");
  if (deleteButton) deletePendingTransaction(deleteButton.dataset.deletePendingId);
  const editButton = event.target.closest(".edit-pending-transaction");
  if (editButton) editPendingTransaction(editButton.dataset.editPendingId);
});
document.getElementById("pendingInvestmentList").addEventListener("click", event => {
  const button = event.target.closest(".approve-investment");
  if (button) approvePendingInvestment(button.dataset.investmentApprovalId);
  const denyButton = event.target.closest(".deny-investment");
  if (denyButton) denyPendingInvestment(denyButton.dataset.investmentDenialId);
});
document.getElementById("projectInvestorList").addEventListener("click", event => {
  const addButton = event.target.closest("[data-add-investment-for]");
  if (addButton) {
    event.stopPropagation();
    openAddInvestmentModal(addButton.dataset.addInvestmentFor);
    return;
  }
  const card = event.target.closest("[data-investor-history]");
  if (!card) return;
  selectedInvestorForHistory = card.dataset.investorHistory;
  renderInvestorHistory();
});
document.getElementById("addInvestmentModalClose").addEventListener("click", closeAddInvestmentModal);
document.getElementById("submitInvestmentRequest").addEventListener("click", submitInvestmentRequest);
document.getElementById("addInvestmentAmount").addEventListener("keydown", event => { if (event.key === "Enter") submitInvestmentRequest(); });
document.getElementById("addInvestmentModal").addEventListener("click", event => { if (event.target.id === "addInvestmentModal") closeAddInvestmentModal(); });

document
  .getElementById("billPreviewClose")
  .addEventListener("click", closeBillPreview);

document
  .getElementById("billPreviewModal")
  .addEventListener("click", (event) => {
    if (event.target.id === "billPreviewModal") {
      closeBillPreview();
    }
  });
  
window.addEventListener("app-languagechange", renderAll);

refreshState();
checkDatabaseStatus();
hydrateWorkspaceFromDatabase(API_BASE_URL)
  .then(() => {
    refreshState();
    // Show the core project immediately, then fetch independent supporting
    // data together instead of waiting for each endpoint in sequence.
    renderAll();
    return Promise.all([
      loadPendingTransactions(),
      loadPendingDeletionRequests(),
      loadInvestments()
    ]);
  })
  .then(() => { refreshState(); renderAll(); })
  .catch(error => {
    console.warn("Saved workspace restore skipped.", error);
    renderAll();
  });

window.setInterval(loadPendingTransactions, 15000);
window.setInterval(loadInvestments, 15000);
