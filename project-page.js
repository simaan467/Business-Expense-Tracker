let investors = [];
let supervisors = [];
let projects = [];
let transactions = [];
let project = null;
let pendingTransactions = [];

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

  document.getElementById("statProjectInvestorCount").textContent =
    getProjectMemberNamesForPage("Investor").length;
  document.getElementById("statProjectSupervisorCount").textContent =
    getProjectMemberNamesForPage("Supervisor").length;
  document.getElementById("statProjectEntryCount").textContent = pageTransactions.length;
  document.getElementById("statProjectSpend").textContent = formatCurrency(
    sumTransactions(pageTransactions)
  );
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
    <article class="investor-card member-card member-card-${roleClass}">
      <h3>${escapeHtml(memberName)}</h3>
      <div class="chip-row">
        <span class="chip ${assignedNames.has(memberName) ? "" : "muted-chip"}">
          ${escapeHtml(assignedNames.has(memberName) ? t("common.assigned") : t("common.historical"))}
        </span>
      </div>
      <div class="card-meta">
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
  const unassignedNames = getUnassignedGlobalNames(resolvedRole);
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
    return '<span class="muted-cell">-</span>';
  }

  return `<button type="button" class="bill-link" data-bill-id="${escapeHtml(tx.id)}">View</button>`;
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
    helper.textContent = file ? file.name : "Take a photo or choose an image";
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

async function saveProjectMember(name, mobile, role) {
  const response = await fetch(API_BASE_URL + "/api/project-members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mobile, role })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Member could not be saved to the database.");
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

function renderPendingApprovals() {
  const list = document.getElementById("pendingApprovalList");
  const status = document.getElementById("approvalStatus");
  if (!list || !status) return;
  const currentUser = getCurrentUserName();
  const approvable = pendingTransactions.filter(tx =>
    tx.eligibleApprovers.some(name => name.toLocaleLowerCase() === currentUser.toLocaleLowerCase()) &&
    !tx.approvedBy.some(name => name.toLocaleLowerCase() === currentUser.toLocaleLowerCase())
  );
  status.innerHTML = pendingTransactions.length
    ? `${pendingTransactions.length} pending <span class="notification-badge">${approvable.length} for you</span>`
    : "No pending transaction approvals.";
  if (!pendingTransactions.length) {
    list.innerHTML = '<div class="empty-state">All submitted expenses have been approved.</div>';
    return;
  }
  list.innerHTML = pendingTransactions.map(tx => {
    const canApprove = approvable.some(item => item.id === tx.id);
    const remaining = Math.max(0, tx.requiredApprovals - tx.approvedBy.length);
    const billMarkup = tx.billImage?.dataUrl
      ? `<button type="button" class="approval-bill-preview" data-pending-bill-id="${escapeHtml(tx.id)}">
          <img src="${escapeHtml(tx.billImage.dataUrl)}" alt="Bill submitted for ${escapeHtml(tx.receiver)}" />
          <span>View bill photo</span>
        </button>`
      : '<span class="approval-no-bill">No bill photo attached</span>';
    return `<article class="approval-card">
      <div class="approval-details">
        <div class="approval-heading">
          <div><span class="eyebrow eyebrow-soft">Expense awaiting approval</span><h3>${escapeHtml(tx.receiver)}</h3></div>
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
        ${canApprove ? `<button type="button" class="approve-transaction" data-approval-id="${escapeHtml(tx.id)}">Review & approve</button>` : '<span class="chip muted-chip">Pending</span>'}
      </div>
    </article>`;
  }).join("");
}

async function approvePendingTransaction(id) {
  const approverName = getCurrentUserName();
  if (!approverName) { alert("Please log in again before approving a transaction."); return; }
  const response = await fetch(`${API_BASE_URL}/api/pending-transactions/${encodeURIComponent(id)}/approve`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approverName })
  });
  const result = await response.json();
  if (!response.ok) { alert(result.error || "Transaction could not be approved."); return; }
  await Promise.all([loadPendingTransactions(), loadRemoteTransactions()]);
  refreshState(); renderAll();
  if (result.transaction.status === "approved") alert("Approval recorded. The transaction is now in the project ledger.");
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
        <td colspan="6">
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
        <td>${formatCurrency(tx.amount)}</td>
        <td>${escapeHtml(formatTransactionDate(tx))}</td>
        <td>${renderBillLink(tx)}</td>
      </tr>
    `).join("");
  }

  filteredTotal.textContent = formatCurrency(sumTransactions(filtered));
}

async function addTransaction() {
  const memberType = document.getElementById("transactionMemberType").value;
  const memberName = document.getElementById("transactionMember").value;
  const receiver = document.getElementById("transactionPaidTo").value.trim();
  const amount = Number(document.getElementById("transactionAmount").value);
  const assignedNames = getAssignedMemberNames(memberType);
  const billFile = getSelectedBillFile();

  if (!memberType || !memberName || !receiver || !Number.isFinite(amount) || amount <= 0 || !billFile) {
    alert(t("projectPage.alertFillTransactionFields"));
    return;
  }

  if (!assignedNames.includes(memberName)) {
    alert(t("projectPage.alertChooseAssignedMember", {
      memberType: getMemberTypeLabel(memberType)
    }));
    return;
  }

  let billImage = null;

  try {
    billImage = await readBillImage(billFile);
  } catch (error) {
    alert("The selected bill image could not be loaded. Please choose another image.");
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
  document.getElementById("transactionAmount").value = "";
  document.getElementById("transactionBill").value = "";
  updateBillFileName();
  refreshState();
  renderAll();
  loadPendingTransactions();
}

async function addProjectMember() {
  const role = document.getElementById("projectMemberRole").value;
  const existingName = document.getElementById("projectMemberExisting").value;
  const newNameInput = document.getElementById("projectMemberNew");
  const typedName = newNameInput.value.trim();
  const mobileInput = document.getElementById("projectMemberMobile");
  const mobile = mobileInput.value.trim();
  const label = getMemberTypeLabel(role);

  if (!role) {
    alert(t("projectPage.alertChooseRoleFirst"));
    return;
  }

  if (existingName && typedName) {
    alert(t("projectPage.alertChooseExistingOrNewNotBoth", { memberType: label }));
    return;
  }

  if (!existingName && !typedName) {
    alert(t("projectPage.alertChooseExistingOrNew", { memberType: label }));
    return;
  }

  if (typedName && !mobile) {
    alert("Enter a mobile number for the new member.");
    return;
  }

  if (existingName && mobile) {
    alert("Mobile number is only needed when adding a new member.");
    return;
  }

  let memberName = existingName;
  const collection = getCollectionForMemberType(role);
  const matchingExisting = typedName
    ? collection.find(member => normalizeName(member.name) === normalizeName(typedName))
    : null;

  if (typedName) {
    memberName = matchingExisting ? matchingExisting.name : typedName;
  }

  if (getAssignedMemberNames(role).some(name => normalizeName(name) === normalizeName(memberName))) {
    alert(t("projectPage.alertAlreadyAssigned", { memberType: label }));
    return;
  }

  if (typedName && !matchingExisting) {
    try {
      await saveProjectMember(memberName, mobile, role);
    } catch (error) {
      alert(error.message);
      return;
    }
    const nextCollection = [
      ...collection,
      {
        id: uid(),
        name: memberName,
        mobile
      }
    ].sort((a, b) => a.name.localeCompare(b.name));

    if (role === "Supervisor") {
      supervisors = nextCollection;
      writeCollection(STORAGE_KEYS.supervisors, supervisors);
    } else {
      investors = nextCollection;
      writeCollection(STORAGE_KEYS.investors, investors);
    }
  }

  const projectIndex = projects.findIndex(item => String(item.id) === String(project.id));

  if (projectIndex === -1) {
    return;
  }

  const memberMobile = matchingExisting?.mobile || mobile || collection.find(member => normalizeName(member.name) === normalizeName(memberName))?.mobile;
  try {
    await assignProjectMember(project.id, { name: memberName, mobile: memberMobile, role });
  } catch (error) {
    alert(error.message);
    return;
  }

  const updatedProject = {
    ...projects[projectIndex],
    investorNames: role === "Investor"
      ? uniqueStrings([...getProjectInvestorNames(projects[projectIndex]), memberName])
      : getProjectInvestorNames(projects[projectIndex]),
    supervisorNames: role === "Supervisor"
      ? uniqueStrings([...getProjectSupervisorNames(projects[projectIndex]), memberName])
      : getProjectSupervisorNames(projects[projectIndex])
  };

  projects[projectIndex] = updatedProject;
  writeCollection(STORAGE_KEYS.projects, projects);
  newNameInput.value = "";
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
}

document.getElementById("addTransactionButton").addEventListener("click", addTransaction);
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
document.getElementById("projectMemberNew").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    addProjectMember();
  }
});
document
  .getElementById("projectTransactionBody")
  .addEventListener("click", (event) => {
    const button = event.target.closest(".bill-link");
    if (!button) return;

    openBillPreview(button.dataset.billId);
  });

document.getElementById("pendingApprovalList").addEventListener("click", event => {
  const billButton = event.target.closest(".approval-bill-preview");
  if (billButton) {
    const transaction = pendingTransactions.find(tx => String(tx.id) === String(billButton.dataset.pendingBillId));
    openBillPreviewForRecord(transaction);
    return;
  }
  const button = event.target.closest(".approve-transaction");
  if (button) approvePendingTransaction(button.dataset.approvalId);
});

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
    return loadRemoteTransactions();
  })
  .then(loadPendingTransactions)
  .then(renderAll)
  .catch(error => {
    console.warn("Saved workspace restore skipped.", error);
    renderAll();
  });

window.setInterval(loadPendingTransactions, 15000);
