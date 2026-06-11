// ═══════════════════════════════════════════════════════════════
//  COOKIES.TS — Revioza · Cookie persistence system (TypeScript port)
//  SSR-safe: all document access is guarded
// ═══════════════════════════════════════════════════════════════

const REVIOZA_COOKIE_PREFIX = "revioza_form_";
const REVIOZA_COOKIE_DAYS = 30;

/**
 * Write a cookie with expiration.
 */
export function setCookie(name: string, value: string, days: number = REVIOZA_COOKIE_DAYS): void {
    if (typeof document === "undefined") return;
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${REVIOZA_COOKIE_PREFIX}${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Read a cookie by name.
 */
export function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const key = REVIOZA_COOKIE_PREFIX + name + "=";
    const cookies = document.cookie.split(";");
    for (const c of cookies) {
        const cookie = c.trim();
        if (cookie.startsWith(key)) {
            return decodeURIComponent(cookie.substring(key.length));
        }
    }
    return null;
}

/**
 * Delete a cookie.
 */
export function deleteCookie(name: string): void {
    if (typeof document === "undefined") return;
    document.cookie = `${REVIOZA_COOKIE_PREFIX}${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;
}

/**
 * Get all Revioza cookies as an object.
 */
export function getAllReviozaCookies(): Record<string, string> {
    if (typeof document === "undefined") return {};
    const result: Record<string, string> = {};
    document.cookie.split(";").forEach((c) => {
        const cookie = c.trim();
        if (cookie.startsWith(REVIOZA_COOKIE_PREFIX)) {
            const eqIdx = cookie.indexOf("=");
            const name = cookie.substring(REVIOZA_COOKIE_PREFIX.length, eqIdx);
            const value = decodeURIComponent(cookie.substring(eqIdx + 1));
            result[name] = value;
        }
    });
    return result;
}

/**
 * Bind an input element to a cookie.
 * Restores saved value on mount and saves on every change.
 */
export function bindFieldToCookie(
    elementId: string,
    cookieName: string,
    onChange: ((value: string, el: HTMLInputElement | HTMLTextAreaElement) => void) | null = null
): void {
    if (typeof document === "undefined") return;
    const el = document.getElementById(elementId) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;

    // Restore saved value
    const saved = getCookie(cookieName);
    if (saved !== null && saved !== "") {
        el.value = saved;
        if (onChange) onChange(saved, el);
    }

    // Listen for changes and save
    el.addEventListener("input", () => {
        setCookie(cookieName, el.value);
        if (onChange) onChange(el.value, el);
    });

    // For color pickers, also listen on "change"
    if ((el as HTMLInputElement).type === "color") {
        el.addEventListener("change", () => {
            setCookie(cookieName, el.value);
            if (onChange) onChange(el.value, el);
        });
    }
}

/**
 * Clear all Revioza cookies.
 */
export function clearAllReviozaCookies(): void {
    const cookies = getAllReviozaCookies();
    Object.keys(cookies).forEach((name) => deleteCookie(name));
}
