// ═══════════════════════════════════════════════
//  MERCHANT.JS — Revioza Merchant Mobile Dashboard
// ═══════════════════════════════════════════════

// Default state if nothing in localStorage
let merchantState = {
    restaurantName: "Bella Napoli",
    restaurantSub: "Pizzeria",
    primaryColor: "#e50914",
    googleLink: "ChIJN1t_tDeuEmsRUsoyG83VY24",
    imageUrl: "",
    prizes: [
        { id: 1, name: "CAFÉ OFFERT", weight: 45, color: "#111115", textStyle: "#f5f5f7", icon: "☕" },
        { id: 2, name: "-15% SUR LA NOTE", weight: 20, color: "#e50914", textStyle: "#ffffff", icon: "🏷️" },
        { id: 3, name: "TIRAMISU OFFERT", weight: 15, color: "#111115", textStyle: "#f5f5f7", icon: "🍰" },
        { id: 4, name: "BOISSON OFFERTE", weight: 15, color: "#e50914", textStyle: "#ffffff", icon: "🥤" },
        { id: 5, name: "PERDU DOMMAGE !", weight: 5, color: "#22222a", textStyle: "#8e8e93", icon: "😢" }
    ]
};

// Mock private reviews (< 3 stars)
let privateFeedbacks = [
    {
        id: 1,
        name: "Jean-Marc L.",
        email: "jean.marc.l@yahoo.fr",
        rating: 2,
        date: "Hier, 19:42",
        text: "Le temps d'attente était un peu trop long pour une simple pizza Margherita (25 minutes). La pizza était bonne mais arrivée tiède sur la table."
    },
    {
        id: 2,
        name: "Amélie D.",
        email: "amelie.dupont@gmail.com",
        rating: 3,
        date: "05 Juin, 13:15",
        text: "La garniture de la pizza végétarienne était un peu légère aujourd'hui. L'accueil reste super mais j'espère un geste la prochaine fois."
    },
    {
        id: 3,
        name: "Thomas R.",
        email: "t.rodriguez@outlook.fr",
        rating: 1,
        date: "02 Juin, 21:30",
        text: "La pâte de ma calzone n'était pas assez cuite au milieu, très déçu par rapport à mes visites précédentes."
    }
];

let reviewsChart = null;
let currentPeriod = 'week';
let averageBasket = 25;

// Period stats definition
const statsData = {
    week: { reviews: 14, clients: 42, label: "Avis cette semaine", labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"], dataset: [1, 2, 1, 3, 2, 3, 2] },
    month: { reviews: 58, clients: 174, label: "Avis ce mois-ci", labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"], dataset: [12, 15, 14, 17] },
    year: { reviews: 712, clients: 2136, label: "Avis cette année", labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"], dataset: [45, 52, 60, 58, 62, 70, 68, 55, 61, 65, 58, 60] }
};

document.addEventListener("DOMContentLoaded", () => {
    loadConfig();
    updateClock();
    setInterval(updateClock, 30000);

    initNavigation();
    initStatsPage();
    initConfigurationPage();
    initReviewsPage();
    
    // Initialiser la persistance cookies (après merchantState chargé)
    if (typeof initMerchantPageCookies === "function") {
        initMerchantPageCookies();
    }

    // Initial chart rendering
    renderChart();
});

function loadConfig() {
    const saved = localStorage.getItem("revioza_merchant_config");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Merge settings
            merchantState = { ...merchantState, ...parsed };
        } catch(e) {
            console.error("Error loading config", e);
        }
    }
    
    // Synchroniser l'image hero dans la clé attendue par play.js
    if (merchantState.imageUrl) {
        localStorage.setItem("revioza_custom_hero_image", merchantState.imageUrl);
    }
    
    // Load reviews from localstorage if present, otherwise set default
    const savedReviews = localStorage.getItem("revioza_private_reviews");
    if (savedReviews) {
        try {
            privateFeedbacks = JSON.parse(savedReviews);
        } catch(e) {
            console.error("Error loading private reviews", e);
        }
    } else {
        localStorage.setItem("revioza_private_reviews", JSON.stringify(privateFeedbacks));
    }
    
    // Apply initial brand variables
    document.documentElement.style.setProperty('--primary', merchantState.primaryColor);
    document.querySelectorAll(".restaurant-name-bind").forEach(el => {
        el.textContent = merchantState.restaurantName;
    });
}

function saveConfig() {
    localStorage.setItem("revioza_merchant_config", JSON.stringify(merchantState));
    // Synchroniser l'image hero dans la clé attendue par play.js
    if (merchantState.imageUrl) {
        localStorage.setItem("revioza_custom_hero_image", merchantState.imageUrl);
    } else {
        localStorage.removeItem("revioza_custom_hero_image");
    }
    // Apply changes locally
    document.documentElement.style.setProperty('--primary', merchantState.primaryColor);
    document.querySelectorAll(".restaurant-name-bind").forEach(el => {
        el.textContent = merchantState.restaurantName;
    });
}

function updateClock() {
    const el = document.getElementById("status-time");
    if (el) {
        const now = new Date();
        el.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    }
}

// ── BOTTOM NAV ROUTING ────────────────────────
function initNavigation() {
    const tabs = [
        { btn: "tab-stats", screen: "screen-stats" },
        { btn: "tab-config", screen: "screen-config" },
        { btn: "tab-reviews", screen: "screen-reviews" }
    ];

    tabs.forEach(tab => {
        document.getElementById(tab.btn)?.addEventListener("click", () => {
            // Remove active classes
            tabs.forEach(t => {
                document.getElementById(t.btn).classList.remove("active");
                document.getElementById(t.screen).classList.remove("active");
            });

            // Set current active
            document.getElementById(tab.btn).classList.add("active");
            document.getElementById(tab.screen).classList.add("active");
            
            // Re-render chart if switching to stats to make sure canvas dimension is correct
            if (tab.screen === 'screen-stats') {
                setTimeout(renderChart, 50);
            }
        });
    });
    
    updateBadge();
}

function updateBadge() {
    const badge = document.getElementById("negative-badge");
    if (badge) {
        if (privateFeedbacks.length > 0) {
            badge.style.display = "block";
            badge.textContent = privateFeedbacks.length;
        } else {
            badge.style.display = "none";
        }
    }
}

function getDynamicStats() {
    // Cloner statsData de base pour ne pas modifier l'original statiquement
    const stats = JSON.parse(JSON.stringify(statsData));
    
    // Récupérer l'historique des avis simulés
    const savedHistory = localStorage.getItem("revioza_reviews_history");
    if (!savedHistory) return stats;
    
    try {
        const history = JSON.parse(savedHistory);
        const now = new Date();
        
        history.forEach(item => {
            const itemDate = new Date(item.date);
            const diffTime = now - itemDate;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            
            // 1. Mise à jour Semaine : avis datant de moins de 7 jours
            if (diffDays < 7) {
                const dayIndex = (itemDate.getDay() + 6) % 7; // 0 = Lun, 6 = Dim
                stats.week.dataset[dayIndex]++;
                stats.week.reviews++;
                stats.week.clients += 3;
            }
            
            // 2. Mise à jour Mois : avis datant de moins de 30 jours
            if (diffDays < 30) {
                const dom = itemDate.getDate();
                const weekIndex = Math.min(3, Math.floor((dom - 1) / 7)); // Semaine 1 à 4 (index 0 à 3)
                stats.month.dataset[weekIndex]++;
                stats.month.reviews++;
                stats.month.clients += 3;
            }
            
            // 3. Mise à jour Année : avis datant de la même année
            if (itemDate.getFullYear() === now.getFullYear()) {
                const monthIndex = itemDate.getMonth(); // 0 = Jan, 11 = Déc
                stats.year.dataset[monthIndex]++;
                stats.year.reviews++;
                stats.year.clients += 3;
            }
        });
    } catch (e) {
        console.error("Error parsing reviews history", e);
    }
    
    return stats;
}

// ── STATS & FINANCIAL ESTIMATOR ────────────────
function initStatsPage() {
    // Period buttons
    document.querySelectorAll(".period-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            currentPeriod = e.target.getAttribute("data-period");
            
            updateStatsUI();
            renderChart();
        });
    });

    // Slider average basket
    const slider = document.getElementById("avg-basket-slider");
    const basketLabel = document.getElementById("avg-basket-value");
    
    if (slider && basketLabel) {
        slider.addEventListener("input", (e) => {
            averageBasket = parseInt(e.target.value);
            basketLabel.textContent = `${averageBasket} €`;
            updateEarnings();
        });
    }

    updateStatsUI();
}

function updateStatsUI() {
    const activeStats = getDynamicStats();
    const pData = activeStats[currentPeriod];
    
    const reviewsCountEl = document.getElementById("stat-reviews-count");
    const clientsCountEl = document.getElementById("stat-clients-count");
    
    if (reviewsCountEl) reviewsCountEl.textContent = pData.reviews;
    if (clientsCountEl) clientsCountEl.textContent = pData.clients;
    
    updateEarnings();
}

function updateEarnings() {
    const activeStats = getDynamicStats();
    const pData = activeStats[currentPeriod];
    const earningsEl = document.getElementById("stat-earnings");
    
    if (earningsEl) {
        const totalEarnings = pData.clients * averageBasket;
        earningsEl.textContent = `${totalEarnings.toLocaleString('fr-FR')} €`;
    }
}

function renderChart() {
    const ctx = document.getElementById('reviewsChart');
    if (!ctx) return;

    if (reviewsChart) {
        reviewsChart.destroy();
    }

    const activeStats = getDynamicStats();
    const pData = activeStats[currentPeriod];
    
    reviewsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: pData.labels,
            datasets: [{
                label: 'Avis générés',
                data: pData.dataset,
                borderColor: merchantState.primaryColor,
                backgroundColor: 'rgba(229, 9, 20, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: merchantState.primaryColor,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8e8e93', font: { size: 9 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8e8e93', font: { size: 9 } }
                }
            }
        }
    });
}

// ── CONFIGURATION & WHEEL EDITING ──────────────
function initConfigurationPage() {
    // Sync profile text inputs
    const restNameInput = document.getElementById("merchant-rest-name");
    const restSubInput = document.getElementById("merchant-rest-sub");
    const googleLinkInput = document.getElementById("merchant-google-link");
    const themeColorInput = document.getElementById("merchant-theme-color");
    const colorLabel = document.getElementById("color-hex-label");

    if (restNameInput) {
        restNameInput.value = merchantState.restaurantName;
        restNameInput.addEventListener("input", (e) => {
            merchantState.restaurantName = e.target.value;
            saveConfig();
        });
    }

    if (restSubInput) {
        restSubInput.value = merchantState.restaurantSub;
        restSubInput.addEventListener("input", (e) => {
            merchantState.restaurantSub = e.target.value;
            saveConfig();
        });
    }

    if (googleLinkInput) {
        googleLinkInput.value = merchantState.googleLink;
        googleLinkInput.addEventListener("input", (e) => {
            merchantState.googleLink = e.target.value;
            saveConfig();
        });
    }

    if (themeColorInput) {
        themeColorInput.value = merchantState.primaryColor;
        if (colorLabel) colorLabel.textContent = merchantState.primaryColor;
        
        themeColorInput.addEventListener("input", (e) => {
            const color = e.target.value;
            merchantState.primaryColor = color;
            if (colorLabel) colorLabel.textContent = color;
            saveConfig();
        });
    }

    const imageUrlInput = document.getElementById("merchant-image-url");
    if (imageUrlInput) {
        imageUrlInput.value = merchantState.imageUrl || "";
        imageUrlInput.addEventListener("input", (e) => {
            merchantState.imageUrl = e.target.value;
            saveConfig();
        });
    }

    // Add prize button
    document.getElementById("btn-merchant-add-prize")?.addEventListener("click", () => {
        const nextId = merchantState.prizes.length > 0 ? Math.max(...merchantState.prizes.map(p => p.id)) + 1 : 1;
        const defaultColors = ["#111115", merchantState.primaryColor, "#22222a", "#34c759", "#4285f4"];
        const nextColor = defaultColors[merchantState.prizes.length % defaultColors.length];
        
        merchantState.prizes.push({
            id: nextId,
            name: "NOUVEAU LOT",
            weight: 10,
            color: nextColor,
            textStyle: "#ffffff",
            icon: "🎁"
        });
        adjustMerchantWeights(nextId, 10);
        
        renderPrizesList();
        saveConfig();
    });

    renderPrizesList();

    // Place ID help tutorial toggle
    const helpToggle = document.getElementById("merchant-placeid-help-toggle");
    const helpContent = document.getElementById("merchant-placeid-help-content");
    if (helpToggle && helpContent) {
        helpToggle.addEventListener("click", () => {
            const isHidden = helpContent.style.display === "none" || helpContent.style.display === "";
            helpContent.style.display = isHidden ? "block" : "none";
        });
    }
}

function renderPrizesList() {
    const container = document.getElementById("merchant-prizes-list");
    if (!container) return;

    container.innerHTML = "";

    merchantState.prizes.forEach(prize => {
        const row = document.createElement("div");
        row.className = "prize-row-mobile";
        row.innerHTML = `
            <div class="prize-row-top">
                <input type="text" value="${prize.name}" class="prize-name-input" data-id="${prize.id}">
                <button class="btn-delete-prize" data-id="${prize.id}"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="prize-row-bottom">
                <div class="prob-wrap">
                    <span>Probabilité :</span>
                    <input type="number" min="1" max="100" value="${prize.weight}" class="prize-weight-input" data-id="${prize.id}">
                    <span>%</span>
                </div>
                <div class="color-wrap">
                    <span style="font-size: 0.76rem; color: var(--muted)">Couleur :</span>
                    <div class="color-dot" style="background-color: ${prize.color}">
                        <input type="color" value="${prize.color}" class="prize-color-input" data-id="${prize.id}">
                    </div>
                </div>
            </div>
        `;

        // Handle inputs events
        row.querySelector(".prize-name-input").addEventListener("change", (e) => {
            const id = parseInt(e.target.getAttribute("data-id"));
            const idx = merchantState.prizes.findIndex(p => p.id === id);
            if (idx !== -1) {
                merchantState.prizes[idx].name = e.target.value.toUpperCase();
                saveConfig();
            }
        });

        row.querySelector(".prize-weight-input").addEventListener("change", (e) => {
            const id = parseInt(e.target.getAttribute("data-id"));
            const val = parseInt(e.target.value) || 1;
            adjustMerchantWeights(id, val);
            
            // Update all weight input values in DOM without rebuilding panel (preserves focus)
            merchantState.prizes.forEach(p => {
                const wInput = container.querySelector(`.prize-weight-input[data-id="${p.id}"]`);
                if (wInput) wInput.value = p.weight;
            });
            
            saveConfig();
        });

        row.querySelector(".prize-color-input").addEventListener("input", (e) => {
            const id = parseInt(e.target.getAttribute("data-id"));
            const idx = merchantState.prizes.findIndex(p => p.id === id);
            if (idx !== -1) {
                const color = e.target.value;
                merchantState.prizes[idx].color = color;
                row.querySelector(".color-dot").style.backgroundColor = color;
                saveConfig();
            }
        });

        // Delete button
        row.querySelector(".btn-delete-prize").addEventListener("click", () => {
            if (merchantState.prizes.length <= 2) {
                alert("La roue doit comporter au moins 2 lots !");
                return;
            }
            merchantState.prizes = merchantState.prizes.filter(p => p.id !== prize.id);
            handleMerchantPrizeDeleted();
            renderPrizesList();
            saveConfig();
        });

        container.appendChild(row);
    });
}

// ── REVIEWS & NEGATIVE FEEDBACKS ────────────────
function initReviewsPage() {
    renderReviews();
}

function renderReviews() {
    const container = document.getElementById("private-feedbacks-container");
    if (!container) return;

    if (privateFeedbacks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--muted);">
                <i class="fa-solid fa-face-smile" style="font-size: 2.5rem; color: var(--green); margin-bottom: 1rem; display: block;"></i>
                <p style="font-size: 0.85rem;">Aucun retour négatif privé à traiter ! Félicitations.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    privateFeedbacks.forEach(review => {
        const card = document.createElement("div");
        card.className = "feedback-card";
        card.innerHTML = `
            <div class="feedback-card-header">
                <div class="feedback-client-info">
                    <span class="client-name">${review.name}</span>
                    <span class="feedback-date">${review.date}</span>
                </div>
                <div class="feedback-stars">
                    ${getStarsHtml(review.rating)}
                </div>
            </div>
            <div class="feedback-text">
                "${review.text}"
            </div>
            <div class="feedback-card-footer">
                <a href="mailto:${review.email}?subject=Votre visite chez Bella Napoli" class="btn-action-small primary">
                    <i class="fa-solid fa-envelope"></i> Répondre par Email
                </a>
                <button class="btn-action-small btn-archive-review" data-id="${review.id}">
                    <i class="fa-solid fa-check"></i> Traité
                </button>
            </div>
        `;

        // Archive / process button
        card.querySelector(".btn-archive-review").addEventListener("click", () => {
            privateFeedbacks = privateFeedbacks.filter(r => r.id !== review.id);
            localStorage.setItem("revioza_private_reviews", JSON.stringify(privateFeedbacks));
            renderReviews();
            updateBadge();
        });

        container.appendChild(card);
    });
}

function getStarsHtml(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            html += `<i class="fa-solid fa-star"></i>`;
        } else {
            html += `<i class="fa-solid fa-star empty"></i>`;
        }
    }
    return html;
}

// ── Probability Rebalancing Functions ──────────────────────────
function adjustMerchantWeights(changedId, newWeight) {
    const prizes = merchantState.prizes;
    const N = prizes.length;
    if (N <= 1) return;

    const minW = 1;
    const maxW = 100 - (N - 1);
    newWeight = Math.max(minW, Math.min(maxW, newWeight));

    const changedPrize = prizes.find(p => p.id === changedId);
    if (!changedPrize) return;
    changedPrize.weight = newWeight;

    const remaining = 100 - newWeight;
    const otherPrizes = prizes.filter(p => p.id !== changedId);
    const sumOthers = otherPrizes.reduce((sum, p) => sum + p.weight, 0);

    if (sumOthers > 0) {
        otherPrizes.forEach(p => {
            p.weight = Math.round(remaining * (p.weight / sumOthers));
        });
    } else {
        const share = Math.floor(remaining / otherPrizes.length);
        otherPrizes.forEach(p => p.weight = share);
    }

    // Ensure each other prize has at least minW
    otherPrizes.forEach(p => {
        if (p.weight < minW) p.weight = minW;
    });

    // Adjust to force exact sum of 100
    let currentSum = prizes.reduce((sum, p) => sum + p.weight, 0);
    let diff = 100 - currentSum;

    while (diff !== 0) {
        const step = diff > 0 ? 1 : -1;
        let candidate = null;
        if (step > 0) {
            candidate = otherPrizes.find(p => p.weight < maxW);
        } else {
            candidate = otherPrizes.find(p => p.weight > minW);
        }

        if (!candidate) {
            candidate = prizes.find(p => step > 0 ? p.weight < maxW : p.weight > minW);
        }

        if (!candidate) break;
        candidate.weight += step;
        diff -= step;
    }
}

function handleMerchantPrizeDeleted() {
    const prizes = merchantState.prizes;
    const N = prizes.length;
    if (N === 0) return;
    if (N === 1) {
        prizes[0].weight = 100;
        return;
    }

    const sum = prizes.reduce((s, p) => s + p.weight, 0);
    if (sum > 0) {
        prizes.forEach(p => {
            p.weight = Math.round(100 * (p.weight / sum));
        });
    } else {
        const share = Math.floor(100 / N);
        prizes.forEach(p => p.weight = share);
    }

    const minW = 1;
    const maxW = 100 - (N - 1);
    prizes.forEach(p => {
        p.weight = Math.max(minW, Math.min(maxW, p.weight));
    });

    let currentSum = prizes.reduce((s, p) => s + p.weight, 0);
    let diff = 100 - currentSum;
    while (diff !== 0) {
        const step = diff > 0 ? 1 : -1;
        let candidate = prizes.find(p => step > 0 ? p.weight < maxW : p.weight > minW);
        if (!candidate) break;
        candidate.weight += step;
        diff -= step;
    }
}
