// State management
let appState = {
    currentStep: 1, // 1: Connect, 2: Review, 3: Roulette, 4: Congrats
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
    ],
    selectedPrize: null,
    isSpinning: false,
    rating: 0,
    timerInterval: null,
    timerSeconds: 7183 // 1h 59m 43s
};

// Canvas drawing context for roulette
let canvas, ctx;

function getFullGoogleLink(placeId) {
    if (!placeId) return "";
    if (placeId.startsWith("http")) return placeId; // fallback for full links
    return `https://search.google.com/local/writereview?placeid=${placeId}`;
}

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("roulette-canvas");
    if (canvas) ctx = canvas.getContext("2d");
    
    // Load saved config
    const saved = localStorage.getItem("revioza_merchant_config");
    if (saved) {
        try {
            appState = JSON.parse(saved);
        } catch(e) {
            console.error("Error loading saved config", e);
        }
    }
    
    initEvents();
    renderWheel();
    updateSimulatorUI();
    syncAdminPanel();
    syncProfilePanel();

    // Initialiser la persistance cookies (après appState chargé)
    if (typeof initIndexPageCookies === "function") {
        initIndexPageCookies();
    }
});

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

function saveConfigToStorage() {
    localStorage.setItem("revioza_merchant_config", JSON.stringify(appState));
}

/**
 * Restaure les valeurs des champs de profil dans le panneau admin
 * à partir de appState (chargé depuis localStorage ou cookies).
 */
function syncProfilePanel() {
    const restNameEl   = document.getElementById("admin-rest-name");
    const restSubEl    = document.getElementById("admin-rest-sub");
    const googleLinkEl = document.getElementById("admin-google-link");
    const themeColorEl = document.getElementById("admin-theme-color");
    const imageUrlEl   = document.getElementById("admin-image-url");

    if (restNameEl)   restNameEl.value   = appState.restaurantName || "";
    if (restSubEl)    restSubEl.value    = appState.restaurantSub  || "";
    if (googleLinkEl) googleLinkEl.value = appState.googleLink     || "";
    if (themeColorEl) themeColorEl.value = appState.primaryColor   || "#e50914";
    if (imageUrlEl)   imageUrlEl.value   = appState.imageUrl       || "";

    // Appliquer la couleur du thème
    if (appState.primaryColor) {
        document.documentElement.style.setProperty("--primary", appState.primaryColor);
    }
}

function initEvents() {
    // Simulator step dots clicking
    document.querySelectorAll(".step-dot").forEach(dot => {
        dot.addEventListener("click", () => {
            const step = parseInt(dot.getAttribute("data-step"));
            goToStep(step);
        });
    });

    // Preview header nav buttons
    const prevBtn = document.getElementById("prev-step-btn");
    const nextBtn = document.getElementById("next-step-btn");
    if (prevBtn) prevBtn.addEventListener("click", () => goToStep(appState.currentStep - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => goToStep(appState.currentStep + 1));

    // Admin Inputs Realtime Sync
    const restNameInput = document.getElementById("admin-rest-name");
    const restSubInput = document.getElementById("admin-rest-sub");
    const googleLinkInput = document.getElementById("admin-google-link");
    
    if (restNameInput) {
        restNameInput.addEventListener("input", (e) => {
            appState.restaurantName = e.target.value;
            updateTexts();
            saveConfigToStorage();
        });
    }
    if (restSubInput) {
        restSubInput.addEventListener("input", (e) => {
            appState.restaurantSub = e.target.value;
            updateTexts();
            saveConfigToStorage();
        });
    }
    if (googleLinkInput) {
        googleLinkInput.addEventListener("input", (e) => {
            appState.googleLink = e.target.value;
            saveConfigToStorage();
        });
    }

    // Stars Interactive rating
    document.querySelectorAll(".star-interactive").forEach(star => {
        star.addEventListener("click", () => {
            const val = parseInt(star.getAttribute("data-value"));
            appState.rating = val;
            
            // Highlight stars
            document.querySelectorAll(".star-interactive").forEach(s => {
                const sVal = parseInt(s.getAttribute("data-value"));
                if (sVal <= val) {
                    s.classList.add("active");
                    s.innerHTML = "★";
                } else {
                    s.classList.remove("active");
                    s.innerHTML = "☆";
                }
            });

            // Triage flows
            const posFlow = document.getElementById("positive-review-flow");
            const privFlow = document.getElementById("private-feedback-flow");
            const safetyLock = document.getElementById("review-safety-lock");

            if (val >= 4) {
                if (posFlow) posFlow.style.display = "block";
                if (privFlow) privFlow.style.display = "none";
                if (safetyLock) safetyLock.style.display = "flex";
                
                addReviewToHistory(val);
                showRedirectModal();
                const fullLink = getFullGoogleLink(appState.googleLink);
                if (fullLink) {
                    window.open(fullLink, "_blank");
                }
            } else {
                if (posFlow) posFlow.style.display = "none";
                if (privFlow) privFlow.style.display = "block";
                if (safetyLock) safetyLock.style.display = "none";
            }
        });
    });

    // Handle submit private feedback in simulator
    const btnSubmitPrivate = document.getElementById("btn-submit-private");
    if (btnSubmitPrivate) {
        btnSubmitPrivate.addEventListener("click", () => {
            const txtarea = document.getElementById("private-feedback-text");
            if (txtarea) txtarea.value = "";
            addReviewToHistory(appState.rating || 3);
            goToStep(3);
        });
    }

    // Google Sign-in simulation
    const btnGoogle = document.getElementById("btn-google-signin");
    if (btnGoogle) {
        btnGoogle.addEventListener("click", () => {
            // Fake loading state
            btnGoogle.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Connexion...`;
            btnGoogle.disabled = true;
            setTimeout(() => {
                btnGoogle.innerHTML = `<img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google"> JE TENTE MA CHANCE`;
                btnGoogle.disabled = false;
                goToStep(2);
            }, 1000);
        });
    }

    // Google Redirect click
    const btnGoogleAction = document.getElementById("btn-google-action");
    if (btnGoogleAction) {
        btnGoogleAction.addEventListener("click", () => {
            showRedirectModal();
            const fullLink = getFullGoogleLink(appState.googleLink);
            if (fullLink) {
                window.open(fullLink, "_blank");
            }
        });
    }

    // Redirect modal action
    const btnAlertAction = document.getElementById("btn-alert-action");
    if (btnAlertAction) {
        btnAlertAction.addEventListener("click", () => {
            document.getElementById("phone-alert-overlay").classList.remove("active");
            goToStep(3);
        });
    }

    // Test client button clicking
    const btnOpenClient = document.getElementById("btn-open-client");
    if (btnOpenClient) {
        btnOpenClient.addEventListener("click", () => {
            const url = new URL("play.html", window.location.href);
            url.searchParams.set("name", appState.restaurantName);
            url.searchParams.set("sub", appState.restaurantSub);
            url.searchParams.set("color", appState.primaryColor);
            url.searchParams.set("google_link", getFullGoogleLink(appState.googleLink));
            if (appState.imageUrl) {
                url.searchParams.set("image", appState.imageUrl);
            }
            
            const prizeNames = appState.prizes.map(p => p.name).join(",");
            const prizeWeights = appState.prizes.map(p => p.weight).join(",");
            url.searchParams.set("prizes", prizeNames);
            url.searchParams.set("weights", prizeWeights);
            
            window.open(url.toString(), "_blank");
        });
    }

    // Spin wheel action
    const btnSpin = document.getElementById("btn-spin-wheel");
    if (btnSpin) {
        btnSpin.addEventListener("click", () => {
            spinWheel();
        });
    }

    // Generate QR Code action
    const btnGenerateQr = document.getElementById("btn-generate-qr");
    if (btnGenerateQr) {
        btnGenerateQr.addEventListener("click", () => {
            saveConfigToStorage();
            window.location.href = "QR_code.html";
        });
    }



    // Admin theme color picker
    const themeColorPicker = document.getElementById("admin-theme-color");
    if (themeColorPicker) {
        themeColorPicker.addEventListener("input", (e) => {
            const color = e.target.value;
            appState.primaryColor = color;
            document.documentElement.style.setProperty('--primary', color);
            // Re-render wheel since colors might be derived from primary
            renderWheel();
            saveConfigToStorage();
        });
    }

    // Add prize row admin
    const btnAddPrize = document.getElementById("btn-add-prize");
    if (btnAddPrize) {
        btnAddPrize.addEventListener("click", () => {
            const newId = appState.prizes.length > 0 ? Math.max(...appState.prizes.map(p => p.id)) + 1 : 1;
            const colors = ["#111115", "#e50914", "#22222a", "#34c759", "#4285f4"];
            const nextColor = colors[appState.prizes.length % colors.length];
            appState.prizes.push({
                id: newId,
                name: "NOUVEAU LOT",
                weight: 10,
                color: nextColor,
                textStyle: "#ffffff",
                icon: "🎁"
            });
            adjustAppStateWeights(newId, 10);
            syncAdminPanel();
            renderWheel();
            saveConfigToStorage();
        });
    }

    // ── Hero Image Upload ──────────────────────────────────────────
    const heroFileInput  = document.getElementById("admin-hero-image");
    const dropZone       = document.getElementById("upload-drop-zone");
    const previewWrap    = document.getElementById("upload-preview-wrap");
    const previewImg     = document.getElementById("upload-preview-img");
    const placeholder    = document.getElementById("upload-placeholder");
    const removeBtn      = document.getElementById("upload-remove-btn");
    const heroSimImg     = document.getElementById("hero-simulator-img");
    const DEFAULT_HERO   = "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80";

    function applyHeroImage(dataUrl, publicUrl) {
        if (heroSimImg) heroSimImg.src = publicUrl || dataUrl;
        if (previewImg) previewImg.src = publicUrl || dataUrl;
        if (previewWrap)  previewWrap.style.display  = "flex";
        if (placeholder)  placeholder.style.display  = "none";
        
        // Stocker l'URL publique (ou base64 en fallback local)
        if (publicUrl) {
            appState.imageUrl = publicUrl;
            localStorage.setItem("revioza_custom_hero_image", publicUrl);
            localStorage.setItem("revioza_merchant_config", JSON.stringify(appState));
            // Mettre à jour le champ URL si présent
            const imageUrlInput = document.getElementById("admin-image-url");
            if (imageUrlInput) imageUrlInput.value = publicUrl;
        } else {
            // Fallback: base64 (uniquement pour affichage local, pas dans le QR)
            localStorage.setItem("revioza_custom_hero_image", dataUrl);
        }
    }

    function resetHeroImage() {
        if (heroSimImg)   heroSimImg.src             = DEFAULT_HERO;
        if (previewWrap)  previewWrap.style.display  = "none";
        if (placeholder)  placeholder.style.display  = "flex";
        if (heroFileInput) heroFileInput.value        = "";
        
        // Réinitialiser l'URL d'image
        appState.imageUrl = "";
        localStorage.removeItem("revioza_custom_hero_image");
        localStorage.setItem("revioza_merchant_config", JSON.stringify(appState));
        const imageUrlInput = document.getElementById("admin-image-url");
        if (imageUrlInput) imageUrlInput.value = "";
    }

    function showUploadStatus(msg, isError) {
        let statusEl = document.getElementById("upload-status-msg");
        if (!statusEl) {
            statusEl = document.createElement("div");
            statusEl.id = "upload-status-msg";
            statusEl.style.cssText = "font-size:0.78rem; margin-top:0.4rem; padding: 6px 10px; border-radius:8px; text-align:center;";
            const uploadGroup = document.getElementById("upload-drop-zone");
            if (uploadGroup) uploadGroup.parentNode.insertBefore(statusEl, uploadGroup.nextSibling);
        }
        statusEl.textContent = msg;
        statusEl.style.background = isError ? "rgba(229,9,20,0.12)" : "rgba(52,199,89,0.12)";
        statusEl.style.color = isError ? "#e50914" : "#34c759";
        statusEl.style.border = isError ? "1px solid rgba(229,9,20,0.3)" : "1px solid rgba(52,199,89,0.3)";
        if (!isError) setTimeout(() => { if (statusEl) statusEl.remove(); }, 5000);
    }

    async function uploadToImgBB(base64Data) {
        // ImgBB API publique (clé de démo) — remplacez par votre propre clé sur imgbb.com
        const API_KEY = "9b8e9f6c0a28f9acb69b22ba20d35a79";
        const base64Clean = base64Data.split(",")[1]; // retirer le préfixe data:image/...;base64,
        
        const formData = new FormData();
        formData.append("key", API_KEY);
        formData.append("image", base64Clean);
        
        const response = await fetch("https://api.imgbb.com/1/upload", {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) throw new Error("Échec de l'upload");
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || "Erreur inconnue");
        
        return data.data.url; // URL publique HTTPS de l'image
    }

    function handleFile(file) {
        if (!file || !file.type.startsWith("image/")) return;
        
        // Afficher aperçu immédiat en base64 (rapide)
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;
            
            // Afficher l'aperçu local immédiatement
            if (heroSimImg) heroSimImg.src = base64;
            if (previewImg) previewImg.src = base64;
            if (previewWrap) previewWrap.style.display = "flex";
            if (placeholder) placeholder.style.display = "none";
            showUploadStatus("⏳ Hébergement de l'image en cours…", false);
            
            try {
                // Uploader sur ImgBB pour obtenir une URL publique (accessible depuis tous appareils)
                const publicUrl = await uploadToImgBB(base64);
                applyHeroImage(base64, publicUrl);
                showUploadStatus("✓ Image hébergée — visible sur tous les appareils !", false);
            } catch(err) {
                console.warn("Upload ImgBB échoué, utilisation base64 locale:", err);
                // Fallback : stocker en base64 (fonctionnel localement mais pas sur QR code)
                applyHeroImage(base64, null);
                showUploadStatus("⚠️ Hébergement échoué. L'image sera visible localement uniquement. Utilisez le champ URL ci-dessous pour un lien externe.", true);
            }
        };
        reader.readAsDataURL(file);
    }

    // Restore saved custom image on startup if present
    const savedHero = localStorage.getItem("revioza_custom_hero_image");
    if (savedHero) {
        applyHeroImage(savedHero);
    } else if (appState.imageUrl && heroSimImg) {
        heroSimImg.src = appState.imageUrl;
    }

    const imageUrlInput = document.getElementById("admin-image-url");
    if (imageUrlInput) {
        imageUrlInput.value = appState.imageUrl || "";
        imageUrlInput.addEventListener("input", (e) => {
            appState.imageUrl = e.target.value;
            // Update the simulator image if no custom uploaded image is selected
            const hasLocalHero = localStorage.getItem("revioza_custom_hero_image");
            if (!hasLocalHero && heroSimImg) {
                heroSimImg.src = appState.imageUrl || DEFAULT_HERO;
            }
            saveConfigToStorage();
        });
    }

    if (heroFileInput) {
        heroFileInput.addEventListener("change", (e) => {
            handleFile(e.target.files[0]);
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // don't re-open file picker
            resetHeroImage();
            
            // Fallback to imageUrl if present after removing custom upload
            if (appState.imageUrl && heroSimImg) {
                heroSimImg.src = appState.imageUrl;
            }
        });
    }

    // Drag & Drop support
    if (dropZone) {
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("drag-over");
        });
        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("drag-over");
        });
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("drag-over");
            handleFile(e.dataTransfer.files[0]);
        });
    }

    // Place ID help tutorial toggle
    const helpToggle = document.getElementById("placeid-help-toggle");
    const helpContent = document.getElementById("placeid-help-content");
    if (helpToggle && helpContent) {
        helpToggle.addEventListener("click", () => {
            const isHidden = helpContent.style.display === "none" || helpContent.style.display === "";
            helpContent.style.display = isHidden ? "block" : "none";
        });
    }

    // ── Gérant Registration & Login Modal Handlers ─────────────────
    const btnHeaderRegister = document.getElementById("btn-header-register");
    const overlayRegister = document.getElementById("overlay-register");
    const btnCloseRegister = document.getElementById("btn-close-register");
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const formLogin = document.getElementById("form-login");
    const formRegister = document.getElementById("form-register");

    if (btnHeaderRegister && overlayRegister) {
        btnHeaderRegister.addEventListener("click", () => {
            overlayRegister.style.display = "flex";
        });
    }

    if (btnCloseRegister && overlayRegister) {
        btnCloseRegister.addEventListener("click", () => {
            overlayRegister.style.display = "none";
        });
    }

    if (tabLogin && tabRegister && formLogin && formRegister) {
        tabLogin.addEventListener("click", () => {
            tabLogin.style.borderBottom = "2px solid var(--primary)";
            tabLogin.style.color = "#fff";
            tabRegister.style.borderBottom = "2px solid transparent";
            tabRegister.style.color = "var(--text-muted)";
            formLogin.style.display = "flex";
            formRegister.style.display = "none";
        });

        tabRegister.addEventListener("click", () => {
            tabRegister.style.borderBottom = "2px solid var(--primary)";
            tabRegister.style.color = "#fff";
            tabLogin.style.borderBottom = "2px solid transparent";
            tabLogin.style.color = "var(--text-muted)";
            formRegister.style.display = "flex";
            formLogin.style.display = "none";
        });
    }

    // Submit forms logic
    if (formLogin) {
        formLogin.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email")?.value;
            if (email) {
                localStorage.setItem("revioza_merchant_email", email);
            }
            window.location.href = "merchant.html";
        });
    }

    if (formRegister) {
        formRegister.addEventListener("submit", (e) => {
            e.preventDefault();
            const restName = document.getElementById("register-rest-name")?.value;
            const restSub = document.getElementById("register-rest-sub")?.value;
            const email = document.getElementById("register-email")?.value;

            if (restName) appState.restaurantName = restName;
            if (restSub) appState.restaurantSub = restSub;
            if (email) localStorage.setItem("revioza_merchant_email", email);

            // Save the state to localStorage so the Espace Gérant has it
            saveConfigToStorage();

            window.location.href = "merchant.html";
        });
    }
}

function updateTexts() {
    // Update all occurrences of restaurant name/sub in simulator screen
    document.querySelectorAll(".restaurant-name-bind").forEach(el => {
        el.textContent = appState.restaurantName;
    });
    document.querySelectorAll(".restaurant-sub-bind").forEach(el => {
        el.textContent = appState.restaurantSub;
    });
}

function goToStep(step) {
    if (step < 1 || step > 4) return;
    
    appState.currentStep = step;
    
    // Manage Screen Visibility
    document.querySelectorAll(".app-screen").forEach(screen => {
        screen.classList.remove("active");
    });
    const targetScreen = document.getElementById(`screen-${step}`);
    if (targetScreen) targetScreen.classList.add("active");
    
    // Manage dot highlights
    document.querySelectorAll(".step-dot").forEach(dot => {
        dot.classList.remove("active");
        if (parseInt(dot.getAttribute("data-step")) === step) {
            dot.classList.add("active");
        }
    });

    // Update Step Titles
    const titles = [
        "1. Connexion Client",
        "2. Avis sur Google",
        "3. Lancer de la Roue",
        "4. Félicitations !"
    ];
    const previewTitle = document.getElementById("preview-step-title");
    if (previewTitle) previewTitle.textContent = titles[step - 1];

    // Toggle timer
    if (step === 4) {
        startTimer();
    } else {
        stopTimer();
    }
    
    updateSimulatorUI();
}

function updateSimulatorUI() {
    updateTexts();

    // Disable spin button if already spinning
    const btnSpin = document.getElementById("btn-spin-wheel");
    if (btnSpin) {
        btnSpin.disabled = appState.isSpinning;
    }
}

function showRedirectModal() {
    const overlay = document.getElementById("phone-alert-overlay");
    if (overlay) {
        overlay.classList.add("active");
    }
}

// Draw wheel using canvas
function renderWheel() {
    if (!canvas) return;
    
    const size = 300;
    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const center = size / 2;
    const radius = center - 8;
    const numSectors = appState.prizes.length;
    const anglePerSector = (Math.PI * 2) / numSectors;
    
    ctx.clearRect(0, 0, size, size);
    
    appState.prizes.forEach((prize, index) => {
        const startAngle = index * anglePerSector - Math.PI / 2;
        const endAngle = startAngle + anglePerSector;
        
        // Draw sector pie slice
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.closePath();
        
        ctx.fillStyle = prize.color;
        ctx.fill();
        
        // Sector divider line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw text
        ctx.save();
        ctx.translate(center, center);
        // Rotate text to middle of sector
        ctx.rotate(startAngle + anglePerSector / 2);
        
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = prize.textStyle || "#ffffff";
        ctx.font = "800 10px 'Outfit', sans-serif";
        
        // Truncate name if too long
        let displayName = prize.name;
        if (displayName.length > 16) displayName = displayName.slice(0, 14) + "..";
        
        // Draw text at outer portion of wheel
        ctx.fillText(displayName, radius - 20, 0);
        ctx.restore();
    });
}

// Select prize based on weights (random roulette decision)
function selectPrizeWeighted() {
    const totalWeight = appState.prizes.reduce((sum, p) => sum + p.weight, 0);
    let randomVal = Math.random() * totalWeight;
    
    for (let prize of appState.prizes) {
        if (randomVal < prize.weight) {
            return prize;
        }
        randomVal -= prize.weight;
    }
    return appState.prizes[0];
}

// Spin Wheel interaction
function spinWheel() {
    if (appState.isSpinning) return;
    
    appState.isSpinning = true;
    updateSimulatorUI();
    
    appState.selectedPrize = selectPrizeWeighted();
    
    const numSectors = appState.prizes.length;
    const selectedIndex = appState.prizes.findIndex(p => p.id === appState.selectedPrize.id);
    const anglePerSector = 360 / numSectors;
    
    // Sector base angle to stop at (sectors drawn from -90deg/12 o'clock, clockwise)
    // Pointer is at the top (12 o'clock / -90deg).
    // To stop sector X at pointer: angle = - (X * anglePerSector + half sector)
    const targetAngle = 360 - (selectedIndex * anglePerSector + anglePerSector / 2);
    
    // Add multiple spins for visual effect (5 full rotations)
    const currentRotation = parseFloat(canvas.style.transform.replace(/[^0-9.]/g, '')) || 0;
    const spinRotations = 5 * 360; 
    const finalRotation = currentRotation + spinRotations + targetAngle;
    
    // Visual Pointer wiggler interaction
    const pointer = document.getElementById("wheel-pointer");
    if (pointer) pointer.classList.add("wiggle");
    
    canvas.style.transition = "transform 4.5s cubic-bezier(0.15, 0.95, 0.35, 1)";
    canvas.style.transform = `rotate(${finalRotation}deg)`;
    
    setTimeout(() => {
        appState.isSpinning = false;
        if (pointer) pointer.classList.remove("wiggle");
        
        // Show result text
        const winTitle = document.getElementById("won-prize-name");
        const winIcon = document.getElementById("won-prize-icon");
        
        if (winTitle) winTitle.textContent = appState.selectedPrize.name;
        if (winIcon) winIcon.textContent = appState.selectedPrize.icon || "🎁";
        
        // Ticket updates
        const ticketPrize = document.getElementById("ticket-prize-name");
        if (ticketPrize) ticketPrize.textContent = appState.selectedPrize.name;
        
        // Trigger confetti for celebration if won something
        if (!appState.selectedPrize.name.toLowerCase().includes("perdu")) {
            triggerConfetti();
        }
        
        // Go to next step after celebration pause
        setTimeout(() => {
            goToStep(4);
        }, 1200);
        
    }, 4500);
}

// Confetti engine using canvas-confetti (standard implementation)
function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// Sync Admin configuration table
function syncAdminPanel() {
    const listContainer = document.getElementById("admin-prizes-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    appState.prizes.forEach((prize, idx) => {
        const row = document.createElement("div");
        row.className = "prize-row";
        row.innerHTML = `
            <div class="prize-name-wrapper">
                <input type="text" value="${prize.name}" data-field="name" data-id="${prize.id}">
                <button class="btn-icon-delete" data-id="${prize.id}"><i class="fas fa-trash"></i></button>
            </div>
            <div class="prize-probability-wrapper">
                <input type="number" value="${prize.weight}" data-field="weight" data-id="${prize.id}" min="1" max="100">
                <span class="percent-symbol">%</span>
            </div>
            <div class="prize-color-dot" style="background-color: ${prize.color}">
                <input type="color" value="${prize.color}" data-field="color" data-id="${prize.id}">
            </div>
        `;
        
        // Handle input events
        row.querySelectorAll("input").forEach(input => {
            input.addEventListener("change", (e) => {
                const pId = parseInt(e.target.getAttribute("data-id"));
                const field = e.target.getAttribute("data-field");
                let val = e.target.value;
                
                if (field === 'weight') {
                    val = parseInt(val) || 1;
                    adjustAppStateWeights(pId, val);
                    
                    // Update all weight input values in DOM without rebuilding panel (preserves focus)
                    appState.prizes.forEach(p => {
                        const wInput = listContainer.querySelector(`input[data-field="weight"][data-id="${p.id}"]`);
                        if (wInput) wInput.value = p.weight;
                    });
                    
                    renderWheel();
                    saveConfigToStorage();
                } else {
                    const pIdx = appState.prizes.findIndex(p => p.id === pId);
                    if (pIdx !== -1) {
                        appState.prizes[pIdx][field] = val;
                        if (field === 'color') {
                            row.querySelector(".prize-color-dot").style.backgroundColor = val;
                        }
                        renderWheel();
                        saveConfigToStorage();
                    }
                }
            });
        });
        
        // Handle delete event
        row.querySelector(".btn-icon-delete").addEventListener("click", () => {
            if (appState.prizes.length <= 2) {
                alert("Il faut au moins 2 lots sur la roue !");
                return;
            }
            appState.prizes = appState.prizes.filter(p => p.id !== prize.id);
            handleAppStatePrizeDeleted();
            syncAdminPanel();
            renderWheel();
            saveConfigToStorage();
        });
        
        listContainer.appendChild(row);
    });
}

// Timer Functions
function startTimer() {
    if (appState.timerInterval) clearInterval(appState.timerInterval);
    
    appState.timerInterval = setInterval(() => {
        appState.timerSeconds--;
        if (appState.timerSeconds <= 0) {
            appState.timerSeconds = 7200; // Reset to 2 hours
        }
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const hours = Math.floor(appState.timerSeconds / 3600);
    const minutes = Math.floor((appState.timerSeconds % 3600) / 60);
    const seconds = appState.timerSeconds % 60;
    
    const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerDisplay = document.getElementById("timer-digits");
    const ticketTimerDisplay = document.getElementById("ticket-timer-digits");
    
    if (timerDisplay) timerDisplay.textContent = formatted;
    if (ticketTimerDisplay) ticketTimerDisplay.textContent = formatted;
}

// ── Probability Rebalancing Functions ──────────────────────────
function adjustAppStateWeights(changedId, newWeight) {
    const N = appState.prizes.length;
    if (N <= 1) return;

    const minW = 1;
    const maxW = 100 - (N - 1);
    newWeight = Math.max(minW, Math.min(maxW, newWeight));

    const changedPrize = appState.prizes.find(p => p.id === changedId);
    if (!changedPrize) return;
    changedPrize.weight = newWeight;

    const remaining = 100 - newWeight;
    const otherPrizes = appState.prizes.filter(p => p.id !== changedId);
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
    let currentSum = appState.prizes.reduce((sum, p) => sum + p.weight, 0);
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
            candidate = appState.prizes.find(p => step > 0 ? p.weight < maxW : p.weight > minW);
        }

        if (!candidate) break;
        candidate.weight += step;
        diff -= step;
    }
}

function handleAppStatePrizeDeleted() {
    const N = appState.prizes.length;
    if (N === 0) return;
    if (N === 1) {
        appState.prizes[0].weight = 100;
        return;
    }

    const sum = appState.prizes.reduce((s, p) => s + p.weight, 0);
    if (sum > 0) {
        appState.prizes.forEach(p => {
            p.weight = Math.round(100 * (p.weight / sum));
        });
    } else {
        const share = Math.floor(100 / N);
        appState.prizes.forEach(p => p.weight = share);
    }

    const minW = 1;
    const maxW = 100 - (N - 1);
    appState.prizes.forEach(p => {
        p.weight = Math.max(minW, Math.min(maxW, p.weight));
    });

    let currentSum = appState.prizes.reduce((s, p) => s + p.weight, 0);
    let diff = 100 - currentSum;
    while (diff !== 0) {
        const step = diff > 0 ? 1 : -1;
        let candidate = appState.prizes.find(p => step > 0 ? p.weight < maxW : p.weight > minW);
        if (!candidate) break;
        candidate.weight += step;
        diff -= step;
    }
}
