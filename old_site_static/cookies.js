// ═══════════════════════════════════════════════════════════════
//  COOKIES.JS — Revioza · Système de persistance des formulaires
//  Sauvegarde automatiquement toutes les saisies utilisateur
//  dans les cookies du navigateur (durée : 30 jours par défaut)
// ═══════════════════════════════════════════════════════════════

const REVIOZA_COOKIE_PREFIX = "revioza_form_";
const REVIOZA_COOKIE_DAYS   = 30;

// ── Utilitaires cookies ────────────────────────────────────────

/**
 * Écrit un cookie avec expiration.
 * @param {string} name  - Nom du cookie (sans préfixe)
 * @param {string} value - Valeur à stocker
 * @param {number} days  - Durée de vie en jours
 */
function setCookie(name, value, days = REVIOZA_COOKIE_DAYS) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${REVIOZA_COOKIE_PREFIX}${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Lit un cookie par son nom.
 * @param {string} name - Nom du cookie (sans préfixe)
 * @returns {string|null}
 */
function getCookie(name) {
    const key = REVIOZA_COOKIE_PREFIX + name + "=";
    const cookies = document.cookie.split(";");
    for (let c of cookies) {
        let cookie = c.trim();
        if (cookie.startsWith(key)) {
            return decodeURIComponent(cookie.substring(key.length));
        }
    }
    return null;
}

/**
 * Supprime un cookie.
 * @param {string} name
 */
function deleteCookie(name) {
    document.cookie = `${REVIOZA_COOKIE_PREFIX}${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;
}

/**
 * Retourne tous les cookies Revioza sous forme d'objet {nom: valeur}.
 * @returns {Object}
 */
function getAllReviozaCookies() {
    const result = {};
    document.cookie.split(";").forEach(c => {
        const cookie = c.trim();
        if (cookie.startsWith(REVIOZA_COOKIE_PREFIX)) {
            const eqIdx = cookie.indexOf("=");
            const name  = cookie.substring(REVIOZA_COOKIE_PREFIX.length, eqIdx);
            const value = decodeURIComponent(cookie.substring(eqIdx + 1));
            result[name] = value;
        }
    });
    return result;
}

// ── Liaison automatique des champs de formulaire ───────────────

/**
 * Lie un champ <input> ou <textarea> à un cookie.
 * - Restaure la valeur sauvegardée au chargement.
 * - Sauvegarde automatiquement à chaque modification.
 *
 * @param {string} elementId  - ID de l'élément HTML
 * @param {string} cookieName - Clé du cookie (unique)
 * @param {Function} [onChange] - Callback optionnel appelé après restauration/saisie
 */
function bindFieldToCookie(elementId, cookieName, onChange = null) {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Restaurer la valeur sauvegardée
    const saved = getCookie(cookieName);
    if (saved !== null && saved !== "") {
        el.value = saved;
        if (onChange) onChange(saved, el);
    }

    // Écouter les modifications et les sauvegarder
    const eventType = (el.type === "color" || el.type === "range") ? "input" : "input";
    el.addEventListener(eventType, () => {
        setCookie(cookieName, el.value);
        if (onChange) onChange(el.value, el);
    });

    // Pour les color pickers, on écoute aussi "change"
    if (el.type === "color") {
        el.addEventListener("change", () => {
            setCookie(cookieName, el.value);
            if (onChange) onChange(el.value, el);
        });
    }
}

// ── Initialisation page Index (Admin Panel) ────────────────────

/**
 * Initialise la persistance cookie pour le panneau admin de index.html.
 * Appelé après que le DOM est prêt et que appState est chargé.
 */
function initIndexPageCookies() {
    // Nom du restaurant
    bindFieldToCookie("admin-rest-name", "admin_rest_name", (val) => {
        if (typeof appState !== "undefined") {
            appState.restaurantName = val;
            if (typeof updateTexts === "function") updateTexts();
            if (typeof saveConfigToStorage === "function") saveConfigToStorage();
        }
    });

    // Spécialité / type
    bindFieldToCookie("admin-rest-sub", "admin_rest_sub", (val) => {
        if (typeof appState !== "undefined") {
            appState.restaurantSub = val;
            if (typeof updateTexts === "function") updateTexts();
            if (typeof saveConfigToStorage === "function") saveConfigToStorage();
        }
    });

    // Place ID Google
    bindFieldToCookie("admin-google-link", "admin_google_link", (val) => {
        if (typeof appState !== "undefined") {
            appState.googleLink = val;
            if (typeof saveConfigToStorage === "function") saveConfigToStorage();
        }
    });

    // Couleur du thème
    bindFieldToCookie("admin-theme-color", "admin_theme_color", (val) => {
        if (typeof appState !== "undefined") {
            appState.primaryColor = val;
            document.documentElement.style.setProperty("--primary", val);
            if (typeof renderWheel === "function") renderWheel();
            if (typeof saveConfigToStorage === "function") saveConfigToStorage();
        }
    });

    // Image URL
    bindFieldToCookie("admin-image-url", "admin_image_url", (val) => {
        if (typeof appState !== "undefined") {
            appState.imageUrl = val;
            const savedHero = localStorage.getItem("revioza_custom_hero_image");
            const heroSimImg = document.getElementById("hero-simulator-img");
            const DEFAULT_HERO = "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80";
            if (!savedHero && heroSimImg) {
                heroSimImg.src = val || DEFAULT_HERO;
            }
            if (typeof saveConfigToStorage === "function") saveConfigToStorage();
        }
    });

    showCookieRestoredBanner();
}

// ── Initialisation page Merchant ───────────────────────────────

/**
 * Initialise la persistance cookie pour merchant.html.
 */
function initMerchantPageCookies() {
    // Nom de l'établissement
    bindFieldToCookie("merchant-rest-name", "merchant_rest_name", (val) => {
        if (typeof merchantState !== "undefined") {
            merchantState.restaurantName = val;
            if (typeof saveConfig === "function") saveConfig();
        }
    });

    // Spécialité
    bindFieldToCookie("merchant-rest-sub", "merchant_rest_sub", (val) => {
        if (typeof merchantState !== "undefined") {
            merchantState.restaurantSub = val;
            if (typeof saveConfig === "function") saveConfig();
        }
    });

    // Place ID Google
    bindFieldToCookie("merchant-google-link", "merchant_google_link", (val) => {
        if (typeof merchantState !== "undefined") {
            merchantState.googleLink = val;
            if (typeof saveConfig === "function") saveConfig();
        }
    });

    // Couleur du thème
    bindFieldToCookie("merchant-theme-color", "merchant_theme_color", (val) => {
        if (typeof merchantState !== "undefined") {
            merchantState.primaryColor = val;
            document.documentElement.style.setProperty("--primary", val);
            if (typeof saveConfig === "function") saveConfig();
        }
        const label = document.getElementById("color-hex-label");
        if (label) label.textContent = val;
    });

    // Image URL
    bindFieldToCookie("merchant-image-url", "merchant_image_url", (val) => {
        if (typeof merchantState !== "undefined") {
            merchantState.imageUrl = val;
            if (typeof saveConfig === "function") saveConfig();
        }
    });

    showCookieRestoredBanner();
}

// ── Bannière de confirmation (UX) ──────────────────────────────

/**
 * Affiche une petite bannière discrète si des données ont été restaurées depuis les cookies.
 */
function showCookieRestoredBanner() {
    const cookies = getAllReviozaCookies();
    if (Object.keys(cookies).length === 0) return;

    // Évite les doublons si déjà affiché
    if (document.getElementById("revioza-cookie-banner")) return;

    const banner = document.createElement("div");
    banner.id = "revioza-cookie-banner";
    banner.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        <span>Vos informations ont été restaurées depuis votre dernière session.</span>
        <button onclick="clearAllReviozaCookies()" title="Effacer les données sauvegardées">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    banner.style.cssText = `
        position: fixed;
        bottom: 1.25rem;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #1a1a22 0%, #23232f 100%);
        color: #f5f5f7;
        border: 1px solid rgba(229,9,20,0.35);
        border-radius: 50px;
        padding: 0.6rem 1.1rem;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.78rem;
        font-family: var(--font-body, 'Outfit', sans-serif);
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        z-index: 9999;
        white-space: nowrap;
        animation: slideUpFade 0.4s ease forwards;
        max-width: 90vw;
    `;
    banner.querySelector("i").style.color = "#e50914";
    banner.querySelector("button").style.cssText = `
        background: none;
        border: none;
        color: #8e8e93;
        cursor: pointer;
        padding: 0;
        font-size: 0.85rem;
        line-height: 1;
    `;

    // Inject animation keyframes if not already present
    if (!document.getElementById("revioza-cookie-styles")) {
        const style = document.createElement("style");
        style.id = "revioza-cookie-styles";
        style.textContent = `
            @keyframes slideUpFade {
                from { opacity: 0; transform: translateX(-50%) translateY(12px); }
                to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes slideDownFade {
                from { opacity: 1; transform: translateX(-50%) translateY(0); }
                to   { opacity: 0; transform: translateX(-50%) translateY(12px); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(banner);

    // Auto-masquer après 5 secondes
    setTimeout(() => {
        if (banner && banner.parentNode) {
            banner.style.animation = "slideDownFade 0.4s ease forwards";
            setTimeout(() => banner.remove(), 400);
        }
    }, 5000);
}

/**
 * Efface tous les cookies Revioza et recharge la page.
 */
function clearAllReviozaCookies() {
    const cookies = getAllReviozaCookies();
    Object.keys(cookies).forEach(name => deleteCookie(name));

    const banner = document.getElementById("revioza-cookie-banner");
    if (banner) banner.remove();

    // Notification de confirmation
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed;
        bottom: 1.25rem;
        left: 50%;
        transform: translateX(-50%);
        background: #22222a;
        color: #8e8e93;
        border: 1px solid rgba(142,142,147,0.2);
        border-radius: 50px;
        padding: 0.55rem 1.1rem;
        font-size: 0.78rem;
        font-family: var(--font-body, 'Outfit', sans-serif);
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        z-index: 9999;
        white-space: nowrap;
        animation: slideUpFade 0.3s ease forwards;
    `;
    toast.textContent = "✓ Données effacées avec succès.";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}
