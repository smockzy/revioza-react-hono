// ═══════════════════════════════════════════════════════════════
//  STATE.TS — Shared types and utilities for Revioza
// ═══════════════════════════════════════════════════════════════

export interface Prize {
    id: number;
    name: string;
    weight: number;
    color: string;
    textStyle: string;
    icon: string;
}

export interface AppState {
    currentStep: number;
    restaurantName: string;
    restaurantSub: string;
    primaryColor: string;
    googleLink: string;
    imageUrl: string;
    prizes: Prize[];
    selectedPrize: Prize | null;
    isSpinning: boolean;
    rating: number;
    timerInterval: ReturnType<typeof setInterval> | null;
    timerSeconds: number;
}

export interface MerchantState {
    restaurantName: string;
    restaurantSub: string;
    primaryColor: string;
    googleLink: string;
    imageUrl: string;
    prizes: Prize[];
}

export const DEFAULT_PRIZES: Prize[] = [
    { id: 1, name: "CAFÉ OFFERT", weight: 45, color: "#111115", textStyle: "#f5f5f7", icon: "☕" },
    { id: 2, name: "-15% SUR LA NOTE", weight: 20, color: "#e50914", textStyle: "#ffffff", icon: "🏷️" },
    { id: 3, name: "TIRAMISU OFFERT", weight: 15, color: "#111115", textStyle: "#f5f5f7", icon: "🍰" },
    { id: 4, name: "BOISSON OFFERTE", weight: 15, color: "#e50914", textStyle: "#ffffff", icon: "🥤" },
    { id: 5, name: "REESSAYEZ UNE PROCHAINE FOIS !", weight: 5, color: "#22222a", textStyle: "#8e8e93", icon: "😢" },
];

export const DEFAULT_PLAY_PRIZES: Prize[] = [
    { id: 1, name: "CAFÉ OFFERT", weight: 40, color: "#111115", textStyle: "#f5f5f7", icon: "☕" },
    { id: 2, name: "-15% SUR LA NOTE", weight: 20, color: "#e50914", textStyle: "#ffffff", icon: "🏷️" },
    { id: 3, name: "TIRAMISU OFFERT", weight: 15, color: "#111115", textStyle: "#f5f5f7", icon: "🍰" },
    { id: 4, name: "BOISSON OFFERTE", weight: 15, color: "#e50914", textStyle: "#ffffff", icon: "🥤" },
    { id: 5, name: "REESSAYEZ UNE PROCHAINE FOIS !", weight: 10, color: "#22222a", textStyle: "#8e8e93", icon: "😢" },
];

export const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80";
export const DEFAULT_HERO_IMAGE_HQ = "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80";

export const GOOGLE_CLIENT_ID = "226741235045-2l3p7d8d5nvmc22dtjdvfs7nfoq90v0m.apps.googleusercontent.com";
export const IMGBB_API_KEY = "9b8e9f6c0a28f9acb69b22ba20d35a79";

export function getFullGoogleLink(placeId: string): string {
    if (!placeId) return "";
    if (placeId.startsWith("http")) return placeId;
    return `https://search.google.com/local/writereview?placeid=${placeId}`;
}

export function selectPrizeWeighted(prizes: Prize[]): Prize {
    const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
    let randomVal = Math.random() * totalWeight;
    for (const prize of prizes) {
        if (randomVal < prize.weight) {
            return prize;
        }
        randomVal -= prize.weight;
    }
    return prizes[0];
}

export function adjustWeights(prizes: Prize[], changedId: number, newWeight: number): void {
    const N = prizes.length;
    if (N <= 1) return;

    const minW = 1;
    const maxW = 100 - (N - 1);
    newWeight = Math.max(minW, Math.min(maxW, newWeight));

    const changedPrize = prizes.find((p) => p.id === changedId);
    if (!changedPrize) return;
    changedPrize.weight = newWeight;

    const remaining = 100 - newWeight;
    const otherPrizes = prizes.filter((p) => p.id !== changedId);
    const sumOthers = otherPrizes.reduce((sum, p) => sum + p.weight, 0);

    if (sumOthers > 0) {
        otherPrizes.forEach((p) => {
            p.weight = Math.round(remaining * (p.weight / sumOthers));
        });
    } else {
        const share = Math.floor(remaining / otherPrizes.length);
        otherPrizes.forEach((p) => (p.weight = share));
    }

    otherPrizes.forEach((p) => {
        if (p.weight < minW) p.weight = minW;
    });

    let currentSum = prizes.reduce((sum, p) => sum + p.weight, 0);
    let diff = 100 - currentSum;

    while (diff !== 0) {
        const step = diff > 0 ? 1 : -1;
        let candidate: Prize | undefined;
        if (step > 0) {
            candidate = otherPrizes.find((p) => p.weight < maxW);
        } else {
            candidate = otherPrizes.find((p) => p.weight > minW);
        }

        if (!candidate) {
            candidate = prizes.find((p) => (step > 0 ? p.weight < maxW : p.weight > minW));
        }

        if (!candidate) break;
        candidate.weight += step;
        diff -= step;
    }
}

export function handlePrizeDeleted(prizes: Prize[]): void {
    const N = prizes.length;
    if (N === 0) return;
    if (N === 1) {
        prizes[0].weight = 100;
        return;
    }

    const sum = prizes.reduce((s, p) => s + p.weight, 0);
    if (sum > 0) {
        prizes.forEach((p) => {
            p.weight = Math.round(100 * (p.weight / sum));
        });
    } else {
        const share = Math.floor(100 / N);
        prizes.forEach((p) => (p.weight = share));
    }

    const minW = 1;
    const maxW = 100 - (N - 1);
    prizes.forEach((p) => {
        p.weight = Math.max(minW, Math.min(maxW, p.weight));
    });

    let currentSum = prizes.reduce((s, p) => s + p.weight, 0);
    let diff = 100 - currentSum;
    while (diff !== 0) {
        const step = diff > 0 ? 1 : -1;
        const candidate = prizes.find((p) => (step > 0 ? p.weight < maxW : p.weight > minW));
        if (!candidate) break;
        candidate.weight += step;
        diff -= step;
    }
}

export function guessIcon(name: string): string {
    const n = name.toUpperCase();
    if (/CAF[ÉE]|EXPRESSO|CAPP/.test(n)) return "☕";
    if (/BOISSON|SODA|COLA|JUS|LIMONADE/.test(n)) return "🥤";
    if (/TIRAMISU|DESSERT|G[AÂ]TEAU|GLACE|TARTE/.test(n)) return "🍰";
    if (/PIZZA/.test(n)) return "🍕";
    if (/BURGER/.test(n)) return "🍔";
    if (/%|REDUC|SUR LA/.test(n)) return "🏷️";
    if (/PERDU|RIEN|REESSAYEZ/.test(n)) return "😢";
    return "🎁";
}

export function renderWheelCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    prizes: Prize[],
    size: number = 300
): void {
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = center - 8;
    const numSectors = prizes.length;
    const anglePerSector = (Math.PI * 2) / numSectors;

    ctx.clearRect(0, 0, size, size);

    prizes.forEach((prize, index) => {
        const startAngle = index * anglePerSector - Math.PI / 2 - anglePerSector / 2;
        const endAngle = startAngle + anglePerSector;

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = prize.color;
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(startAngle + anglePerSector / 2);

        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = prize.textStyle || "#ffffff";
        ctx.font = "800 10px 'Outfit', sans-serif";

        let displayName = (prize.icon ? prize.icon + "  " : "") + prize.name;
        if (displayName.length > 20) displayName = displayName.slice(0, 18) + "..";

        ctx.fillText(displayName, radius - 20, 0);
        ctx.restore();
    });
}

export function addReviewToHistory(rating: number): void {
    if (typeof localStorage === "undefined") return;
    try {
        const history = JSON.parse(localStorage.getItem("revioza_reviews_history") || "[]");
        history.push({
            date: new Date().toISOString(),
            rating: rating,
        });
        localStorage.setItem("revioza_reviews_history", JSON.stringify(history));
    } catch (e) {
        console.error("Error saving review to history", e);
    }
}

export function saveConfigToStorage(state: AppState | MerchantState): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem("revioza_merchant_config", JSON.stringify(state));
}

export function loadConfigFromStorage<T>(defaults: T): T {
    if (typeof localStorage === "undefined") return defaults;
    const saved = localStorage.getItem("revioza_merchant_config");
    if (saved) {
        try {
            return { ...defaults, ...JSON.parse(saved) };
        } catch (e) {
            console.error("Error loading saved config", e);
        }
    }
    return defaults;
}
