const API_BASE_URL = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "";

document.querySelectorAll("[data-password-toggle]").forEach(button => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        const isVisible = input.type === "text";
        input.type = isVisible ? "password" : "text";
        button.textContent = isVisible ? "Show" : "Hide";
        button.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
        button.setAttribute("aria-pressed", String(!isVisible));
    });
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const body = {
        mobile: document.getElementById("mobile").value,
        password: document.getElementById("password").value
    };

    try {

        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.headers.get("content-type")?.includes("application/json")) {
            throw new Error("The application server returned an invalid response.");
        }
        const result = await response.json();

        if (response.ok) {

            // Used by the approval queue to identify the signed-in project member.
            // Never show a previous account's cached workspace while this user
            // is being restored from the server.
            ["investors", "supervisors", "projects", "transactions"].forEach(key => localStorage.removeItem(key));
            sessionStorage.setItem("currentUser", JSON.stringify(result.user));
            sessionStorage.setItem("authToken", result.token);
            alert(result.message);

            window.location.href = "index.html";

        } else {

            alert(result.error);

        }

    } catch (err) {

        console.error(err);

        alert("Unable to connect to server.");

    }

});
