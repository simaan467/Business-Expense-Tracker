(() => {
  const SESSION_KEYS = ["currentUser", "authToken"];

  const clearSessionAndGoToLogin = () => {
    SESSION_KEYS.forEach(key => localStorage.removeItem(key));
    sessionStorage.setItem("authNotice", "Your session has expired. Please sign in again.");
    window.location.replace("login.html");
  };

  const token = localStorage.getItem("authToken");
  const user = localStorage.getItem("currentUser");
  if (!token || !user) {
    clearSessionAndGoToLogin();
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    // An expired access token may still be renewed from the HttpOnly refresh
    // cookie. Keep this page hidden until common.js finishes that check.
    if (!payload.exp) clearSessionAndGoToLogin();
  } catch {
    clearSessionAndGoToLogin();
  }
})();
