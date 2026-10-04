const API_BASE_URL = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "";
let projects = [];
const select = document.getElementById("projectToDelete");
const status = document.getElementById("deleteProjectStatus");
const submit = document.getElementById("deleteProjectButton");
let toastTimer = null;

function showDeleteProjectToast(message, isError = false) {
  const toast = document.getElementById("deleteProjectToast");
  toast.classList.toggle("is-error", isError);
  toast.querySelector("span:first-child").textContent = isError ? "✕" : "✓";
  document.getElementById("deleteProjectToastText").textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3500);
}

function renderProjects() {
  select.innerHTML = projects.length ? projects.map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`).join("") : '<option value="">No projects available</option>';
  select.disabled = !projects.length; submit.disabled = !projects.length;
}

async function loadProjects() {
  status.textContent = "Loading projects…";
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects`, { cache: "no-store" });
    if (!response.ok) throw new Error("Projects could not be loaded.");
    projects = await response.json(); renderProjects(); status.textContent = projects.length ? "" : "No projects are available to delete.";
  } catch (error) { status.textContent = error.message; renderProjects(); }
}

document.getElementById("deleteProjectForm").addEventListener("submit", async event => {
  event.preventDefault();
  const project = projects.find(item => String(item.id) === select.value);
  if (!project || !confirm(`Request deletion of "${project.name}"? Investor approval may be required.`)) return;
  submit.disabled = true; status.textContent = "Sending deletion request…";
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(project.id)}/deletion-request`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Deletion request could not be sent.");
    const message = result.deleted ? "Project deleted." : "Deletion request sent for approval.";
    status.textContent = message;
    showDeleteProjectToast(message);
    window.setTimeout(() => { window.location.href = "index.html"; }, 1400);
  } catch (error) { status.textContent = error.message; showDeleteProjectToast(error.message, true); submit.disabled = false; }
});

loadProjects();
