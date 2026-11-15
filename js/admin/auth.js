const ADMIN_UID = "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";

document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");

    if (!loginForm) return;

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const message = document.getElementById("loginMessage");
        const button = document.getElementById("loginButton");

        button.disabled = true;
        message.textContent = "Signing in...";

        try {

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            if (data.user.id !== ADMIN_UID) {
                await supabaseClient.auth.signOut();
                throw new Error("You are not authorized as an administrator.");
            }

            window.location.href = "dashboard.html";

        } catch (error) {

            message.textContent = error.message;

        } finally {

            button.disabled = false;

        }

    });

});