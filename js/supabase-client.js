// Initialize Supabase client


if (!window.supabase) {
    throw new Error("Supabase library is not loaded.");
}

if (!window.APP_CONFIG) {
    throw new Error("Supabase configuration is not loaded.");
}

window.supabaseClient = window.supabase.createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY
);
window.supabaseClient = supabaseClient;
console.log("Supabase client initialized:", !!window.supabaseClient);


async function getFeaturedPhotos() {

    const { data, error } = await supabaseClient
        .from("media")
        .select("*")
        .eq("media_type", "image")
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(error);
        return [];
    }

    return data;
}
async function uploadPhoto(file, title, categoryId) {

    const filePath =
        `${crypto.randomUUID()}-${file.name}`;

    const { data: uploadData, error: uploadError } =
        await supabaseClient.storage
            .from("photos")
            .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data: urlData } =
        supabaseClient.storage
            .from("photos")
            .getPublicUrl(uploadData.path);

    const { error: insertError } =
        await supabaseClient
            .from("media")
            .insert({
                title: title,
                media_type: "image",
                file_url: urlData.publicUrl,
                category_id: categoryId,
                is_published: false
            });

    if (insertError) {
        throw insertError;
    }
}