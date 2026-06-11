// ═══════════════════════════════════════════════
//  PLAY.JS — Revioza Client Mobile App
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// ⚙️  CONFIGURATION GOOGLE OAUTH
//  Remplacez cette valeur par votre Client ID Google Cloud :
//  👉 https://console.cloud.google.com/apis/credentials
//  Format : "XXXXXXXX.apps.googleusercontent.com"
// ─────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = "226741235045-2l3p7d8d5nvmc22dtjdvfs7nfoq90v0m.apps.googleusercontent.com";

const state = {
    step: 1,
    restaurantName: "Bella Napoli",
    restaurantSub: "Pizzeria",
    primaryColor: "#e50914",
    googleLink: "ChIJN1t_tDeuEmsRUsoyG83VY24",
    heroImage: null,
    prizes: [
        { id: 1, name: "CAFÉ OFFERT",      weight: 40, color: "#111115", textStyle: "#f5f5f7", icon: "☕" },
        { id: 2, name: "-15% SUR LA NOTE", weight: 20, color: "#e50914", textStyle: "#ffffff", icon: "🏷️" },
        { id: 3, name: "TIRAMISU OFFERT",  weight: 15, color: "#111115", textStyle: "#f5f5f7", icon: "🍰" },
        { id: 4, name: "BOISSON OFFERTE",  weight: 15, color: "#e50914", textStyle: "#ffffff", icon: "🥤" },
        { id: 5, name: "PERDU !",          weight: 10, color: "#22222a", textStyle: "#8e8e93", icon: "😢" }
    ],
    wonPrize: null,
    isSpinning: false,
    rating: 0,
    timerInterval: null,
    timerSeconds: 7200
};

let canvas, ctx;
let tokenClient = null; // Google OAuth2 token client

function getFullGoogleLink(placeId) {
    if (!placeId) return "";
    if (placeId.startsWith("http")) return placeId; // fallback for full links
    return `https://search.google.com/local/writereview?placeid=${placeId}`;
}

function loadConfigFromCookies() {
    if (typeof getCookie === "function") {
        const cookieName = getCookie("merchant_rest_name") || getCookie("admin_rest_name");
        const cookieSub = getCookie("merchant_rest_sub") || getCookie("admin_rest_sub");
        const cookieGoogle = getCookie("merchant_google_link") || getCookie("admin_google_link");
        const cookieColor = getCookie("merchant_theme_color") || getCookie("admin_theme_color");

        if (cookieName) state.restaurantName = cookieName;
        if (cookieSub) state.restaurantSub = cookieSub;
        if (cookieGoogle) state.googleLink = cookieGoogle;
        if (cookieColor) state.primaryColor = cookieColor;
    }
}

// ── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("roulette-canvas");
    if (canvas) ctx = canvas.getContext("2d");

    loadConfigFromCookies();
    parseURL();
    applyBranding();
    updateStatusClock();
    setInterval(updateStatusClock, 30000);
    initEvents();
    renderWheel();
});

// ── URL Parameters ────────────────────────────
function parseURL() {
    const p = new URLSearchParams(window.location.search);
    if (p.has("name"))   state.restaurantName = p.get("name");
    if (p.has("sub"))    state.restaurantSub  = p.get("sub");
    if (p.has("google_link")) state.googleLink = p.get("google_link");
    if (p.has("image"))  state.heroImage = p.get("image");
    if (p.has("color")) {
        const c = `#${p.get("color").replace("#","")}`;
        if (/^#[0-9A-Fa-f]{6}$/.test(c)) state.primaryColor = c;
    }
    if (p.has("prizes")) {
        const names = p.get("prizes").split(",").map(s => s.trim()).filter(Boolean);
        const weights = p.has("weights") ? p.get("weights").split(",").map(s => parseInt(s.trim()) || 0) : [];
        if (names.length >= 2) {
            const altColors = ["#111115", state.primaryColor, "#1b1b22", state.primaryColor];
            const weightPer = Math.floor(90 / names.length);
            state.prizes = names.map((n, i) => {
                const isLost = /perdu|rien/i.test(n);
                const col = isLost ? "#22222a" : altColors[i % altColors.length];
                const txt = (col === "#111115" || col === "#22222a" || col === "#1b1b22") ? "#f5f5f7" : "#ffffff";
                const icon = guessIcon(n);
                
                // Use custom weight if defined, otherwise fallback to default calculation
                let w = (weights.length > i && !isNaN(weights[i]) && weights[i] > 0) ? weights[i] : (isLost ? 5 : weightPer);
                return { id: i+1, name: n.toUpperCase(), weight: w, color: col, textStyle: txt, icon };
            });
        }
    }
}

function guessIcon(name) {
    const n = name.toUpperCase();
    if (/CAF[ÉE]|EXPRESSO|CAPP/.test(n)) return "☕";
    if (/BOISSON|SODA|COLA|JUS|LIMONADE/.test(n)) return "🥤";
    if (/TIRAMISU|DESSERT|G[AÂ]TEAU|GLACE|TARTE/.test(n)) return "🍰";
    if (/PIZZA/.test(n)) return "🍕";
    if (/BURGER/.test(n)) return "🍔";
    if (/%|REDUC|SUR LA/.test(n)) return "🏷️";
    if (/PERDU|RIEN/.test(n)) return "😢";
    return "🎁";
}

// ── Branding ──────────────────────────────────
function applyBranding() {
    document.documentElement.style.setProperty("--primary", state.primaryColor);
    // Derive glow from primary
    const hex = state.primaryColor.replace("#","");
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    document.documentElement.style.setProperty("--primary-glow", `rgba(${r},${g},${b},0.35)`);

    document.querySelectorAll(".restaurant-name-bind").forEach(el => el.textContent = state.restaurantName);
    document.querySelectorAll(".restaurant-sub-bind").forEach(el => el.textContent = state.restaurantSub);
    
    // Update Accéder à Google Maps link
    const googleMapBtn = document.querySelector('a[href*="maps.google.com"]');
    if (googleMapBtn && state.googleLink) {
        googleMapBtn.href = getFullGoogleLink(state.googleLink);
    }

    // Update hero banner image — ordre de priorité :
    // 1. Paramètre URL ?image=...  (QR code dynamique)
    // 2. localStorage "revioza_custom_hero_image"  (sync merchant)
    // 3. imageUrl depuis la config merchant sauvegardée
    // 4. Image Unsplash par défaut
    const DEFAULT_HERO = "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80";
    const heroImg = document.querySelector(".hero-img");
    if (heroImg) {
        let finalSrc = DEFAULT_HERO;

        // Priorité 3 : config merchant
        try {
            const merchantConfig = JSON.parse(localStorage.getItem("revioza_merchant_config") || "{}");
            if (merchantConfig.imageUrl) finalSrc = merchantConfig.imageUrl;
        } catch(e) {}

        // Priorité 2 : clé hero dédiée
        const savedHero = localStorage.getItem("revioza_custom_hero_image");
        if (savedHero) finalSrc = savedHero;

        // Priorité 1 : paramètre URL (cas QR code) — écrase tout
        if (state.heroImage) finalSrc = state.heroImage;

        heroImg.src = finalSrc;
        // Fallback si l'URL personnalisée est invalide
        heroImg.onerror = function() {
            this.onerror = null;
            this.src = DEFAULT_HERO;
        };
    }
}

// ── Status bar clock ──────────────────────────
function updateStatusClock() {
    const el = document.getElementById("status-time");
    if (!el) return;
    const now = new Date();
    el.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;
}

// ── Events ────────────────────────────────────
function initEvents() {
    // Screen 1 — Google sign in (OAuth2 popup fiable)
    const btnGoogleSignin = document.getElementById("btn-google-signin");
    if (btnGoogleSignin) {
        btnGoogleSignin.addEventListener("click", () => {

            // Client ID non configuré
            if (GOOGLE_CLIENT_ID.startsWith("VOTRE_CLIENT_ID")) {
                showGoogleClientIdWarning();
                return;
            }

            // SDK pas encore chargé
            if (typeof google === "undefined" || !google.accounts?.oauth2) {
                handleGoogleAuthFallback();
                return;
            }

            // Créer le token client si pas encore fait
            if (!tokenClient) {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: "openid email profile",
                    callback: handleGoogleTokenResponse,
                    error_callback: (err) => {
                        console.error("Google OAuth error:", err);
                        onGoogleAuthError("network_error", err.message || JSON.stringify(err));
                    }
                });
            }

            // Afficher l'overlay et lancer le popup Google
            showGoogleAuthOverlay("loading");
            tokenClient.requestAccessToken({ prompt: "select_account" });
        });
    }

    // Screen 2 — Back
    document.getElementById("btn-back-2")?.addEventListener("click", () => goTo(1));

    // Screen 2 - Star rating
    document.querySelectorAll(".star").forEach(star => {
        star.addEventListener("click", () => {
            const val = parseInt(star.dataset.value);
            state.rating = val;
            document.querySelectorAll(".star").forEach(s => {
                const sv = parseInt(s.dataset.value);
                s.classList.toggle("active", sv <= val);
                s.textContent = sv <= val ? "★" : "☆";
            });

            const posFlow = document.getElementById("positive-flow");
            const privFlow = document.getElementById("private-flow");

            if (val >= 4) {
                if (posFlow) posFlow.style.display = "block";
                if (privFlow) privFlow.style.display = "none";
                openOverlay("overlay-redirect");
                const fullLink = getFullGoogleLink(state.googleLink);
                if (fullLink) {
                    window.open(fullLink, "_blank");
                }
            } else {
                if (posFlow) posFlow.style.display = "none";
                if (privFlow) privFlow.style.display = "block";
            }
        });
    });

    // Handle submit private feedback
    document.getElementById("btn-submit-private")?.addEventListener("click", () => {
        const txtarea = document.getElementById("private-text");
        const feedbackText = txtarea ? txtarea.value.trim() : "";
        
        if (feedbackText) {
            // Retrieve list from localStorage
            const savedReviews = localStorage.getItem("revioza_private_reviews");
            let list = [];
            if (savedReviews) {
                try {
                    list = JSON.parse(savedReviews);
                } catch(e) {}
            }
            
            const newId = list.length > 0 ? Math.max(...list.map(r => r.id)) + 1 : 1;
            
            // Format nice client name and date
            const dateStr = "Aujourd'hui, " + new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
            list.unshift({
                id: newId,
                name: "Client Anonyme",
                email: "client.anonyme@gmail.com",
                rating: state.rating || 3,
                date: dateStr,
                text: feedbackText
            });
            
            localStorage.setItem("revioza_private_reviews", JSON.stringify(list));
            addReviewToHistory(state.rating || 3);
        }

        if (txtarea) txtarea.value = "";
        goTo(3);
    });

    // Screen 2 — Google action button
    document.getElementById("btn-google-action")?.addEventListener("click", () => {
        openOverlay("overlay-redirect");
        const fullLink = getFullGoogleLink(state.googleLink);
        if (fullLink) {
            window.open(fullLink, "_blank");
        }
    });

    // Overlay redirect — confirm review
    document.getElementById("btn-confirm-review")?.addEventListener("click", () => {
        addReviewToHistory(state.rating || 5);
        closeOverlay("overlay-redirect");
        goTo(3);
    });

    // Screen 3 — Back
    document.getElementById("btn-back-3")?.addEventListener("click", () => goTo(2));

    // Screen 3 — Spin
    document.getElementById("btn-spin-wheel")?.addEventListener("click", spinWheel);

    // Screen 4 — Show coupon (transition step to step 5)
    document.getElementById("btn-show-coupon")?.addEventListener("click", () => {
        goTo(5);
    });

    // Bottom nav
    document.getElementById("nav-home")?.addEventListener("click", () => {
        if (state.step < 5) goTo(1);
    });
    document.getElementById("nav-rules")?.addEventListener("click", () => {
        openOverlay("overlay-rules");
    });
    document.getElementById("nav-profile")?.addEventListener("click", () => {
        openOverlay("overlay-profile");
    });

    // Profile overlay close buttons
    document.getElementById("btn-close-profile")?.addEventListener("click",   () => closeOverlay("overlay-profile"));
    document.getElementById("btn-close-profile-2")?.addEventListener("click", () => closeOverlay("overlay-profile"));

    // Rules overlay close buttons
    document.getElementById("btn-close-rules")?.addEventListener("click",   () => closeOverlay("overlay-rules"));
    document.getElementById("btn-close-rules-2")?.addEventListener("click", () => closeOverlay("overlay-rules"));

    // Google Auth Overlay — boutons
    document.getElementById("btn-google-auth-cancel")?.addEventListener("click", () => {
        hideGoogleAuthOverlay();
        // Annuler le prompt GSI en cours
        if (typeof google !== "undefined" && google.accounts?.id) {
            google.accounts.id.cancel();
        }
    });

    document.getElementById("btn-google-auth-continue")?.addEventListener("click", () => {
        hideGoogleAuthOverlay();
        goTo(2);
    });

    document.getElementById("btn-google-auth-bypass")?.addEventListener("click", () => {
        hideGoogleAuthOverlay();
        const profileEmailEl = document.getElementById("client-profile-email");
        if (profileEmailEl) {
            profileEmailEl.innerHTML = `Connecté avec<br><strong>demo.user@gmail.com (Mode Démo)</strong>`;
        }
        goTo(2);
    });
}

// ── Navigation ────────────────────────────────
function goTo(step) {
    if (step < 1 || step > 5) return;

    const prev = document.getElementById(`screen-${state.step}`);
    if (prev) {
        prev.classList.remove("active");
        prev.classList.add("slide-out");
        setTimeout(() => prev.classList.remove("slide-out"), 400);
    }

    state.step = step;
    const next = document.getElementById(`screen-${step}`);
    if (next) next.classList.add("active");

    updateNavHighlights();

    // Scroll new screen to top
    const scroll = next?.querySelector(".screen-scroll");
    if (scroll) scroll.scrollTop = 0;

    if (step === 5) startTimer();
    else stopTimer();
}

// ── Overlays ──────────────────────────────────
function openOverlay(id)  { 
    document.getElementById(id)?.classList.add("active"); 
    updateNavHighlights();
}
function closeOverlay(id) { 
    document.getElementById(id)?.classList.remove("active"); 
    updateNavHighlights();
}

function updateNavHighlights() {
    const isRulesOpen = document.getElementById("overlay-rules")?.classList.contains("active");
    const isProfileOpen = document.getElementById("overlay-profile")?.classList.contains("active");

    const navHome = document.getElementById("nav-home");
    const navRules = document.getElementById("nav-rules");
    const navProfile = document.getElementById("nav-profile");

    if (navHome) navHome.classList.toggle("active", !isRulesOpen && !isProfileOpen);
    if (navRules) navRules.classList.toggle("active", !!isRulesOpen);
    if (navProfile) navProfile.classList.toggle("active", !!isProfileOpen);
}

// ── Wheel Render ──────────────────────────────
function renderWheel() {
    if (!canvas) return;

    const SIZE = 260;
    const DPR  = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = SIZE * DPR;
    canvas.height = SIZE * DPR;
    canvas.style.width  = SIZE + "px";
    canvas.style.height = SIZE + "px";
    ctx.scale(DPR, DPR);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r  = cx - 6;
    const n  = state.prizes.length;
    const arc = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, SIZE, SIZE);

    state.prizes.forEach((prize, i) => {
        const start = i * arc - Math.PI / 2;
        const end   = start + arc;

        // Sector fill
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, end);
        ctx.closePath();
        ctx.fillStyle = prize.color;
        ctx.fill();

        // Divider
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + arc / 2);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = prize.textStyle || "#fff";
        ctx.font = `700 10px 'Outfit', sans-serif`;
        let label = prize.name.length > 15 ? prize.name.slice(0, 13) + "…" : prize.name;
        ctx.fillText(label, r - 16, 0);
        ctx.restore();
    });
}

// ── Spin Physics ──────────────────────────────
function spinWheel() {
    if (state.isSpinning) return;
    state.isSpinning = true;

    const btn = document.getElementById("btn-spin-wheel");
    if (btn) btn.disabled = true;

    // Weighted prize selection
    const total = state.prizes.reduce((s, p) => s + p.weight, 0);
    let rnd = Math.random() * total;
    let won = state.prizes[0];
    for (const p of state.prizes) {
        if (rnd < p.weight) { won = p; break; }
        rnd -= p.weight;
    }
    state.wonPrize = won;

    const n      = state.prizes.length;
    const idx    = state.prizes.findIndex(p => p.id === won.id);
    const deg    = 360 / n;
    const target = 360 - (idx * deg + deg / 2);

    // Accumulate rotation
    const prevRot = parseFloat(canvas.style.transform?.replace(/[^0-9.-]/g,"")) || 0;
    const nextRot = prevRot + 5 * 360 + target;

    const pointer = document.getElementById("wheel-pointer");
    if (pointer) pointer.classList.add("wiggle");

    canvas.style.transition = "transform 4.5s cubic-bezier(0.12, 0.95, 0.35, 1)";
    canvas.style.transform  = `rotate(${nextRot}deg)`;

    setTimeout(() => {
        state.isSpinning = false;
        if (pointer) pointer.classList.remove("wiggle");

        // Populate congrats screen
        const wonName = document.getElementById("won-prize-name");
        const wonIcon = document.getElementById("won-prize-icon");
        if (wonName) wonName.textContent = won.name;
        if (wonIcon) wonIcon.textContent = won.icon || "🎁";

        // Confetti if not lost
        if (!won.name.toLowerCase().includes("perdu")) {
            triggerConfetti();
        }

        // Update profile status
        const statusEl = document.getElementById("client-participation-status");
        if (statusEl) {
            statusEl.textContent = "Déjà effectuée";
            statusEl.style.color = "var(--primary)";
        }

        setTimeout(() => goTo(4), 1000);

    }, 4600);
}

// ── Confetti ──────────────────────────────────
function triggerConfetti() {
    if (typeof confetti !== "function") return;
    confetti({ particleCount: 130, spread: 80, origin: { y: 0.55 } });
    setTimeout(() => confetti({ particleCount: 70, spread: 60, origin: { y: 0.55 }, angle: 60  }), 300);
    setTimeout(() => confetti({ particleCount: 70, spread: 60, origin: { y: 0.55 }, angle: 120 }), 500);
}

// ── Coupon Timer ──────────────────────────────
function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerSeconds = 7200;
    updateTimerDisplay();
    state.timerInterval = setInterval(() => {
        state.timerSeconds--;
        if (state.timerSeconds <= 0) state.timerSeconds = 7200;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
}

function updateTimerDisplay() {
    const h = Math.floor(state.timerSeconds / 3600);
    const m = Math.floor((state.timerSeconds % 3600) / 60);
    const s = state.timerSeconds % 60;
    const fmt = `${pad(h)}:${pad(m)}:${pad(s)}`;
    const el = document.getElementById("timer-digits");
    if (el) el.textContent = fmt;
}

function pad(n) { return String(n).padStart(2, "0"); }

// ── Google Authentication Functions ───────────────────────────────

/**
 * Callback OAuth2 : appelé quand Google renvoie un access token.
 * On l'utilise pour appeler l'API Google userinfo et récupérer
 * le vrai nom, email et photo de l'utilisateur.
 */
async function handleGoogleTokenResponse(tokenResponse) {
    if (tokenResponse.error) {
        console.error("Google OAuth error token:", tokenResponse.error);
        onGoogleAuthError(tokenResponse.error, tokenResponse.error_description);
        return;
    }

    try {
        // Récupérer le profil utilisateur via l'API Google
        const resp = await fetch(
            `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenResponse.access_token}`
        );
        if (!resp.ok) {
            throw new Error(`Erreur HTTP : ${resp.status}`);
        }
        const user = await resp.json();

        // Stocker les infos dans le state
        state.googleUser = {
            name:    user.name    || "Utilisateur Google",
            email:   user.email   || "",
            picture: user.picture || "",
            sub:     user.id      || ""
        };

        onGoogleAuthSuccess(state.googleUser);
    } catch (err) {
        console.error("Erreur récupération profil Google:", err);
        onGoogleAuthError("network_error", err.message);
    }
}

/**
 * Affiche l'overlay de connexion Google.
 * mode: "loading" | "success" | "error"
 */
function showGoogleAuthOverlay(mode) {
    const overlay   = document.getElementById("overlay-google-auth");
    const loadingEl = document.getElementById("google-auth-loading");
    const userInfo  = document.getElementById("google-auth-user-info");
    const errorInfo = document.getElementById("google-auth-error-info");
    const titleEl   = document.getElementById("google-auth-title");
    const descEl    = document.getElementById("google-auth-desc");

    if (!overlay) return;
    overlay.classList.add("active");

    if (mode === "loading") {
        if (loadingEl) loadingEl.style.display = "flex";
        if (userInfo)  userInfo.style.display  = "none";
        if (errorInfo) errorInfo.style.display = "none";
        if (titleEl)   titleEl.textContent = "Connexion avec Google";
        if (descEl)    descEl.textContent  = "Authentification en cours…";
    } else if (mode === "success") {
        if (loadingEl) loadingEl.style.display = "none";
        if (userInfo)  userInfo.style.display  = "block";
        if (errorInfo) errorInfo.style.display = "none";
        if (titleEl)   titleEl.textContent = "Compte vérifié ✓";
        if (descEl)    descEl.textContent  = "Vous êtes connecté avec votre compte Google.";
    } else if (mode === "error") {
        if (loadingEl) loadingEl.style.display = "none";
        if (userInfo)  userInfo.style.display  = "none";
        if (errorInfo) errorInfo.style.display = "block";
    }
}

function hideGoogleAuthOverlay() {
    const overlay = document.getElementById("overlay-google-auth");
    if (overlay) overlay.classList.remove("active");
}

/**
 * Appelé après un sign-in Google réussi.
 * Affiche les infos de l'utilisateur et met à jour le profil.
 */
function onGoogleAuthSuccess(user) {
    // Mettre à jour l'avatar dans l'overlay
    const avatarEl    = document.getElementById("google-user-avatar");
    const nameEl      = document.getElementById("google-user-name");
    const emailEl     = document.getElementById("google-user-email");
    const profileEmailEl = document.getElementById("client-profile-email");

    if (avatarEl) {
        if (user.picture) {
            avatarEl.innerHTML = `<img src="${user.picture}" alt="${user.name}" style="width:56px;height:56px;border-radius:50%;border:3px solid var(--primary);object-fit:cover;">`;
        } else {
            // Avatar généré avec initiales
            const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            avatarEl.innerHTML = `<div style="width:56px;height:56px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;margin:0 auto;">${initials}</div>`;
        }
    }
    if (nameEl)  nameEl.textContent  = user.name;
    if (emailEl) emailEl.textContent = user.email;

    // Mettre à jour l'overlay profil
    if (profileEmailEl) {
        profileEmailEl.innerHTML = `Connecté avec<br><strong>${user.email}</strong>`;
    }

    showGoogleAuthOverlay("success");
}

function onGoogleAuthError(errorType, detailedMsg) {
    console.error("Google Auth error info:", errorType, detailedMsg);
    
    const titleEl = document.getElementById("google-auth-title");
    const descEl  = document.getElementById("google-auth-desc");
    const errorMsgEl = document.getElementById("google-auth-error-msg");
    const errorHelpEl = document.getElementById("google-auth-error-help");

    if (titleEl) titleEl.textContent = "⚠️ Échec de connexion";
    if (descEl) descEl.textContent = "Nous n'avons pas pu valider votre identité Google.";

    let friendlyError = "Une erreur d'authentification est survenue.";
    let helpText = "Veuillez réessayer ou continuer en mode démo.";

    if (errorType === "popup_closed_by_user") {
        friendlyError = "La fenêtre de connexion a été fermée.";
        helpText = "Vous devez terminer l'authentification dans la fenêtre pop-up de Google pour vous connecter, ou vous pouvez continuer en mode démo pour tester.";
    } else if (errorType === "access_denied") {
        friendlyError = "L'accès au compte a été refusé.";
        helpText = "Vous devez accorder les autorisations demandées pour vous connecter via Google.";
    } else if (errorType === "origin_mismatch" || errorType === "idpiframe_initialization_failed" || (detailedMsg && detailedMsg.toLowerCase().includes("origin"))) {
        friendlyError = "Origine JavaScript non autorisée (Localhost).";
        helpText = `Pour autoriser l'authentification Google sur <strong>${window.location.origin}</strong> :<br>
        1. Allez sur votre <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:var(--primary); text-decoration:underline;">Google Cloud Console</a>.<br>
        2. Sélectionnez votre Client ID OAuth 2.0.<br>
        3. Ajoutez l'origine exacte <strong>${window.location.origin}</strong> dans la section <strong>Origines JavaScript autorisées</strong>.<br>
        4. Sauvegardez et patientez 5 minutes, puis réactualisez.`;
    } else if (errorType === "network_error") {
        friendlyError = "Erreur de réseau ou blocage du SDK.";
        helpText = "Vérifiez votre connexion internet ou vos extensions de navigateur (les bloqueurs de publicités bloquent souvent l'authentification Google en local).";
    } else if (detailedMsg) {
        friendlyError = detailedMsg;
    }

    if (errorMsgEl) errorMsgEl.textContent = friendlyError;
    if (errorHelpEl) errorHelpEl.innerHTML = helpText;

    showGoogleAuthOverlay("error");
}

/**
 * Fallback si le SDK Google n'est pas disponible (ex: bloqué par AdBlock).
 * Simule une connexion anonyme pour que l'expérience reste fonctionnelle.
 */
function handleGoogleAuthFallback() {
    const btn = document.getElementById("btn-google-signin");
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connexion…`;
        btn.disabled = true;
    }
    setTimeout(() => {
        if (btn) {
            btn.innerHTML = `<img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" class="google-btn-logo"> JE TENTE MA CHANCE`;
            btn.disabled = false;
        }
        const profileEmailEl = document.getElementById("client-profile-email");
        if (profileEmailEl) {
            profileEmailEl.innerHTML = `Connecté avec<br><strong>client@gmail.com</strong>`;
        }
        goTo(2);
    }, 900);
}

/**
 * Affiche un avertissement en overlay si le Client ID n'est pas configuré.
 */
function showGoogleClientIdWarning() {
    const overlay = document.getElementById("overlay-google-auth");
    const titleEl = document.getElementById("google-auth-title");
    const descEl  = document.getElementById("google-auth-desc");
    const loadingEl = document.getElementById("google-auth-loading");
    const userInfo  = document.getElementById("google-auth-user-info");

    if (overlay) overlay.classList.add("active");
    if (loadingEl) loadingEl.style.display = "none";
    if (userInfo)  userInfo.style.display  = "none";
    if (titleEl) titleEl.textContent = "⚙️ Configuration requise";
    if (descEl) descEl.innerHTML = `
        <strong>Client ID Google non configuré.</strong><br><br>
        Éditez <code>play.js</code> et remplacez la valeur de
        <code>GOOGLE_CLIENT_ID</code> par votre ID provenant de
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:var(--primary)">Google Cloud Console</a>.
    `;
}

function addReviewToHistory(rating) {
    try {
        const history = JSON.parse(localStorage.getItem("revioza_reviews_history") || "[]");
        history.push({
            date: new Date().toISOString(),
            rating: rating
        });
        localStorage.setItem("revioza_reviews_history", JSON.stringify(history));
    } catch (e) {
        console.error("Error saving review to history", e);
    }
}
