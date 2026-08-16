document.getElementById("logoutBtn").addEventListener("click", () => {

    const confirmLogout = confirm("Are you sure you want to logout?");

    if (!confirmLogout) return;

    // Project and transaction data is cached locally for a faster next login.
    // It is also persisted in the database, so logging out must only end the
    // signed-in session and must not erase the application's data cache.
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("authToken");

    window.location.href = "login.html";
});
