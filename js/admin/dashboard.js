const ADMIN_UID = "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";

async function checkAdminAccess() {

    const { data, error } =
        await window.supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.replace("login.html");
        return;
    }

    if (data.user.id !== ADMIN_UID) {
        await window.supabaseClient.auth.signOut();
        window.location.replace("login.html");
        return;
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    await checkAdminAccess();

    document.getElementById("logoutButton")
        .addEventListener("click", async () => {

            await window.supabaseClient.auth.signOut();

            window.location.replace("login.html");

        });

});