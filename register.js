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

document.getElementById("registerForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const body = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        mobile: document.getElementById("mobile").value,
        role: document.getElementById("role").value,
        password: document.getElementById("password").value
    };

    try {

        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);

            window.location.href = "login.html";
        } else {
            alert(result.error);
        }

        alert(result.message || result.error);

    } catch (err) {
        console.error(err);
        alert("Unable to connect to server.");
    }

});
