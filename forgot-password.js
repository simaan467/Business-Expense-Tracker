// Use the deployed app as the API host. The fallback only supports opening
// these static files directly during local development.
const API_BASE_URL = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "";
const emailInput = document.getElementById("email");
const message = document.getElementById("resetMessage");

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "error" : "success";
}

document.getElementById("forgotForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = document.getElementById("sendOtpButton");
  button.disabled = true;
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput.value.trim() })
    });
    const result = await response.json();
    if (!response.ok) { showMessage(result.error || "Could not send OTP.", true); return; }
    showMessage(result.message);
    document.getElementById("resetForm").hidden = false;
    document.getElementById("otp").focus();
  } catch (error) {
    showMessage("Could not contact the server. Please try again.", true);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("resetForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput.value.trim(), otp: document.getElementById("otp").value.trim(), password: document.getElementById("newPassword").value })
    });
    const result = await response.json();
    if (!response.ok) { showMessage(result.error || "Could not reset password.", true); return; }
    showMessage(`${result.message} Redirecting to sign in…`);
    window.setTimeout(() => { window.location.href = "login.html"; }, 1200);
  } catch (error) {
    showMessage("Could not contact the server. Please try again.", true);
  }
});
