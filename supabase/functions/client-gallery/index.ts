// ==========================================
// STEP 25 - PRIVATE CLIENT GALLERY EDGE FUNCTION
// File: supabase/functions/client-gallery/index.ts
// ==========================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

const secretKeys = JSON.parse(
    Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"
);

const SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    secretKeys.default ||
    "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
        "Required Supabase server environment variables are missing."
    );
}

const BUCKET = "client-galleries";
const SESSION_HOURS = 6;
const SIGNED_URL_SECONDS = 1800;

const supabaseAdmin = createClient(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
};


function jsonResponse(body: unknown, status = 200) {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: corsHeaders
        }
    );
}


function isValidString(value: unknown, maxLength = 200) {
    return typeof value === "string" &&
        value.trim().length > 0 &&
        value.trim().length <= maxLength;
}


function randomToken(): string {
    const bytes = new Uint8Array(32);

    crypto.getRandomValues(bytes);

    return Array.from(bytes)
        .map(value => value.toString(16).padStart(2, "0"))
        .join("");
}


async function sha256(value: string): Promise<string> {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(value)
    );

    return Array.from(new Uint8Array(digest))
        .map(value => value.toString(16).padStart(2, "0"))
        .join("");
}


function getRequestIp(req: Request): string {
    const cfIp = req.headers.get("cf-connecting-ip");

    if (cfIp) {
        return cfIp.trim();
    }

    const forwarded = req.headers.get("x-forwarded-for");

    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }

    return "unknown";
}


// ------------------------------------------
// VERIFY TEMPORARY SESSION TOKEN
// ------------------------------------------

async function verifySession(token: string) {
    if (!isValidString(token, 128)) {
        throw new Error("Gallery session is missing or invalid.");
    }

    const tokenHash = await sha256(token);

    const { data: session, error } = await supabaseAdmin
        .from("client_gallery_sessions")
        .select("id, gallery_id, expires_at")
        .eq("token_hash", tokenHash)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

    if (error || !session) {
        throw new Error("Your gallery session has expired. Please unlock it again.");
    }

    const { data: gallery, error: galleryError } = await supabaseAdmin
        .from("client_galleries")
        .select(`
            id,
            title,
            client_name,
            event_date,
            allow_downloads,
            allow_favorites,
            allow_selection,
            is_active,
            expires_at
        `)
        .eq("id", session.gallery_id)
        .eq("is_active", true)
        .maybeSingle();

    if (galleryError || !gallery) {
        throw new Error("This gallery is no longer available.");
    }

    if (
        gallery.expires_at &&
        new Date(gallery.expires_at).getTime() <= Date.now()
    ) {
        throw new Error("This gallery has expired.");
    }

    return {
        session,
        gallery
    };
}


// ------------------------------------------
// LOAD PHOTO DATA AND TEMPORARY URLS
// ------------------------------------------

async function getGalleryData(
    sessionId: string,
    gallery: Record<string, any>
) {
    const { data: photos, error: photoError } = await supabaseAdmin
        .from("client_gallery_photos")
        .select("id, object_path, file_name, caption, sort_order")
        .eq("gallery_id", gallery.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    if (photoError) {
        throw new Error("Could not load gallery photographs.");
    }

    const photoRows = photos || [];

    const photoPaths = photoRows.map(
        photo => photo.object_path
    );

    const signedUrlMap = new Map<string, string>();

    if (photoPaths.length > 0) {
        const { data: signedFiles, error: signedError } =
            await supabaseAdmin
                .storage
                .from(BUCKET)
                .createSignedUrls(
                    photoPaths,
                    SIGNED_URL_SECONDS
                );

        if (signedError) {
            throw new Error("Could not create private image access links.");
        }

        (signedFiles || []).forEach(item => {
            if (item.path && item.signedUrl) {
                signedUrlMap.set(
                    item.path,
                    item.signedUrl
                );
            }
        });
    }


    // Obtain favourites for this client's current session.
    const { data: favorites, error: favoriteError } =
        await supabaseAdmin
            .from("client_gallery_favorites")
            .select("gallery_photo_id")
            .eq("session_id", sessionId);

    if (favoriteError) {
        throw new Error("Could not load photo selections.");
    }

    const favoriteIds = new Set(
        (favorites || []).map(item => item.gallery_photo_id)
    );
const { data: existingSubmission, error: submissionError } =
    await supabaseAdmin
        .from("client_gallery_submissions")
        .select("id")
        .eq("session_id", sessionId)
        .maybeSingle();

if (submissionError) {
    throw new Error("Could not check submission status.");
}

    // Generate explicit download URLs only when enabled.
    const downloadMap = new Map<string, string>();

    if (gallery.allow_downloads) {
        const results = await Promise.all(
            photoRows.map(async photo => {
                const { data, error } = await supabaseAdmin
                    .storage
                    .from(BUCKET)
                    .createSignedUrl(
                        photo.object_path,
                        SIGNED_URL_SECONDS,
                        { download: photo.file_name }
                    );

                if (error || !data?.signedUrl) {
                    return null;
                }

                return {
                    id: photo.id,
                    url: data.signedUrl
                };
            })
        );

        results.filter(Boolean).forEach(item => {
            downloadMap.set(item.id, item.url);
        });
    }


    return {
        gallery: {
            title: gallery.title,
            client_name: gallery.client_name,
            event_date: gallery.event_date,
            allow_downloads: gallery.allow_downloads,
            allow_favorites: gallery.allow_favorites,
            allow_selection: gallery.allow_selection,
            expires_at: gallery.expires_at
        },

        photos: photoRows.map(photo => ({
            id: photo.id,
            file_name: photo.file_name,
            caption: photo.caption,
            sort_order: photo.sort_order,
            signed_url: signedUrlMap.get(photo.object_path) || null,
            download_url: downloadMap.get(photo.id) || null,
            is_favorite: favoriteIds.has(photo.id)
        })).filter(photo => photo.signed_url),
    has_submitted: Boolean(existingSubmission),
    };
}


// ------------------------------------------
// UNLOCK GALLERY
// ------------------------------------------

async function unlockGallery(
    slug: string,
    password: string,
    req: Request
) {
    if (
        !isValidString(slug, 160) ||
        !isValidString(password, 128)
    ) {
        return jsonResponse(
            { error: "Enter your gallery link and password." },
            400
        );
    }

    const ip = getRequestIp(req);
    const ipHash = await sha256(ip);

    const { data: allowed, error: rateError } =
        await supabaseAdmin.rpc(
            "check_client_gallery_unlock",
            {
                p_slug: slug,
                p_ip_hash: ipHash
            }
        );

    if (rateError) {
        console.error("Rate-limit check failed:", rateError);

        return jsonResponse(
            { error: "Gallery access is temporarily unavailable." },
            500
        );
    }

    if (allowed !== true) {
        return jsonResponse(
            {
                error: "Too many attempts. Please try again in 15 minutes."
            },
            429
        );
    }


    const { data: rows, error: verifyError } =
        await supabaseAdmin.rpc(
            "verify_client_gallery_password",
            {
                p_slug: slug,
                p_password: password
            }
        );

    if (verifyError) {
        console.error("Gallery password verification error:", verifyError);

        return jsonResponse(
            { error: "Gallery access is temporarily unavailable." },
            500
        );
    }

    const gallery = Array.isArray(rows) ? rows[0] : null;

    if (!gallery) {
        return jsonResponse(
            { error: "Incorrect password or gallery unavailable." },
            401
        );
    }


    await supabaseAdmin.rpc(
        "clear_client_gallery_unlock",
        {
            p_slug: slug,
            p_ip_hash: ipHash
        }
    );


    // Generate a random token.
    // Only its SHA-256 hash is saved in the database.
    const token = randomToken();
    const tokenHash = await sha256(token);

    const expiresAt = new Date(
        Date.now() + SESSION_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: session, error: sessionError } =
        await supabaseAdmin
            .from("client_gallery_sessions")
            .insert({
                gallery_id: gallery.gallery_id,
                token_hash: tokenHash,
                expires_at: expiresAt
            })
            .select("id")
            .single();

    if (sessionError) {
        console.error("Gallery session creation failed:", sessionError);

        return jsonResponse(
            { error: "Could not open your gallery." },
            500
        );
    }

    try {
        const galleryData = await getGalleryData(
            session.id,
            gallery
        );

        return jsonResponse({
            success: true,
            access_token: token,
            session_expires_at: expiresAt,
            ...galleryData
        });

    } catch (error) {
        await supabaseAdmin
            .from("client_gallery_sessions")
            .delete()
            .eq("id", session.id);

        throw error;
    }
}


// ------------------------------------------
// LOAD EXISTING SESSION
// ------------------------------------------

async function loadGallery(token: string) {
    const { session, gallery } = await verifySession(token);

    const galleryData = await getGalleryData(
        session.id,
        gallery
    );

    return jsonResponse({
        success: true,
        ...galleryData
    });
}


// ------------------------------------------
// ADD / REMOVE FAVOURITE
// ------------------------------------------

async function updateFavorite(
    token: string,
    photoId: string,
    selected: boolean
) {
    if (!isValidString(photoId, 80)) {
        return jsonResponse(
            { error: "Invalid photograph." },
            400
        );
    }

    const { session, gallery } = await verifySession(token);

    if (!gallery.allow_favorites) {
        return jsonResponse(
            { error: "Photo favourites are disabled for this gallery." },
            403
        );
    }
const { data: existingSubmission } = await supabaseAdmin
    .from("client_gallery_submissions")
    .select("id")
    .eq("session_id", session.id)
    .maybeSingle();

if (existingSubmission) {
    return jsonResponse(
        { error: "Your final selection has already been submitted." },
        409
    );
}
    const { data: photo, error: photoError } =
        await supabaseAdmin
            .from("client_gallery_photos")
            .select("id")
            .eq("id", photoId)
            .eq("gallery_id", gallery.id)
            .maybeSingle();

    if (photoError || !photo) {
        return jsonResponse(
            { error: "Photograph does not belong to this gallery." },
            404
        );
    }

    if (selected) {
        const { error } = await supabaseAdmin
            .from("client_gallery_favorites")
            .upsert(
                {
                    gallery_id: gallery.id,
                    session_id: session.id,
                    gallery_photo_id: photoId
                },
                {
                    onConflict: "session_id,gallery_photo_id"
                }
            );

        if (error) {
            throw new Error("Could not add photograph to favourites.");
        }

    } else {
        const { error } = await supabaseAdmin
            .from("client_gallery_favorites")
            .delete()
            .eq("session_id", session.id)
            .eq("gallery_photo_id", photoId);

        if (error) {
            throw new Error("Could not remove photograph from favourites.");
        }
    }

    return jsonResponse({
        success: true,
        selected
    });
}


// ------------------------------------------
// SUBMIT CLIENT SELECTION
// ------------------------------------------

async function submitSelection(
    token: string,
    note: string
) {
    const { session, gallery } = await verifySession(token);

    if (!gallery.allow_selection) {
        return jsonResponse(
            { error: "Final selections are currently disabled." },
            403
        );
    }

    const { data: submissionId, error } =
        await supabaseAdmin.rpc(
            "submit_client_gallery_selection",
            {
                p_session_id: session.id,
                p_client_note: note.slice(0, 1000)
            }
        );

    if (error) {
        console.error("Selection submission failed:", error);

        return jsonResponse(
            { error: error.message || "Could not submit your selection." },
            400
        );
    }

    return jsonResponse({
        success: true,
        submission_id: submissionId,
        message: "Your photo selection has been submitted."
    });
}


// ------------------------------------------
// HTTP HANDLER
// ------------------------------------------

Deno.serve(async (req: Request) => {

    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders
        });
    }

    if (req.method !== "POST") {
        return jsonResponse(
            { error: "Method not allowed." },
            405
        );
    }

    try {
        const body = await req.json();

        const action = body.action;

        if (action === "unlock") {
            return await unlockGallery(
                body.slug,
                body.password,
                req
            );
        }

        if (action === "list") {
            return await loadGallery(
                body.access_token
            );
        }

        if (action === "favorite") {
            return await updateFavorite(
                body.access_token,
                body.photo_id,
                body.selected === true
            );
        }

        if (action === "submit") {
            return await submitSelection(
                body.access_token,
                String(body.client_note || "")
            );
        }

        return jsonResponse(
            { error: "Unknown gallery action." },
            400
        );

    } catch (error) {
        console.error("Client gallery function error:", error);

        return jsonResponse(
            {
                error: error instanceof Error
                    ? error.message
                    : "Unexpected gallery error."
            },
            400
        );
    }

});