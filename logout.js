document.getElementById("logoutBtn").addEventListener("click", async () => {

    const confirmLogout = confirm("Are you sure you want to logout?");

    if (!confirmLogout) return;

    // Project and transaction data is cached locally for a faster next login.
    // It is also persisted in the database, so logging out must only end the
    // signed-in session and must not erase the application's data cache.
    const apiBaseUrl = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "";
    try { await fetch(apiBaseUrl + "/api/auth/logout", { method: "POST", credentials: "include" }); } catch { /* Local logout still succeeds offline. */ }
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authToken");

    window.location.href = "login.html";
});
