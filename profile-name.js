const API_BASE_URL = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "";
const nameInput = document.getElementById("profileName");
const status = document.getElementById("profileNameStatus");
let toastTimer = null;

function showProfileToast(message, isError = false) {
  const toast = document.getElementById("profileNameToast");
  toast.classList.toggle("is-error", isError);
  toast.querySelector("span:first-child").textContent = isError ? "✕" : "✓";
  document.getElementById("profileNameToastText").textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3500);
}

try { nameInput.value = JSON.parse(sessionStorage.getItem("currentUser") || "null")?.name || ""; } catch { /* Leave the field empty. */ }

document.getElementById("profileNameForm").addEventListener("submit", async event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) { status.textContent = "Enter your name."; return; }
  const button = document.getElementById("saveProfileButton");
  button.disabled = true; status.textContent = "Saving…";
  try {
    const response = await fetch(`${API_BASE_URL}/api/profile`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Your name could not be updated.");
    sessionStorage.setItem("currentUser", JSON.stringify(result.user));
    sessionStorage.setItem("authToken", result.token);
    // Refresh cached project history before the user returns to a project page.
    try { await hydrateWorkspaceFromDatabase(API_BASE_URL); } catch (error) { console.warn("Workspace refresh skipped.", error); }
    status.textContent = "Your name has been updated.";
    showProfileToast("Your name has been updated.");
    window.setTimeout(() => { window.location.href = "index.html"; }, 1400);
  } catch (error) { status.textContent = error.message; showProfileToast(error.message, true); }
  finally { button.disabled = false; }
});
