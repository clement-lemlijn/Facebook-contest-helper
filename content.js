const URL_LISTE_AMIS = "https://gist.githubusercontent.com/clement-lemlijn/378f0b8e17cbfd82f8b0655abf1f800d/raw/facebook-liste-amis.txt";

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuration des vitesses (min_pause, max_pause en millisecondes)
const VITESSE_PROFILES = {
    "Lent": [60000, 90000],
    "Moyen": [30000, 45000],
    "Rapide": [1000, 5000],
    "Extreme": [100, 1000]
};

const VITESSE_PAUSES = {
    "Lent": [2500, 500],
    "Moyen": [2500, 500, 1200],
    "Rapide": [1000, 500, 500],
    "Extreme": [200, 200, 500]
};

let isRunning = false;
let isPaused = false;
let currentIndex = 0;

async function recupererListeAmis() {
    try {
        const response = await fetch(URL_LISTE_AMIS);
        const texte = await response.text();
        return texte.split('\n').map(name => name.trim()).filter(n => n);
    } catch (error) {
        console.error("❌ Erreur de récupération :", error);
        return [];
    }
}

async function getCommentBox() {
    const selector = 'div[role="textbox"][contenteditable="true"]';
    let el = document.querySelector(selector);
    if (el) {
        el.focus();
        el.click();
        await wait(800);
        return el;
    }
    return null;
}

async function lancerAssistant(nbAmisParCom, vitesse) {
    isRunning = true;
    const mesAmis = await recupererListeAmis();
    const [minWait, maxWait] = VITESSE_PROFILES[vitesse];
    const [pause1, pause2, pause3] = VITESSE_PAUSES[vitesse];
    const btnStart = document.getElementById("startHelper");

    for (let i = currentIndex; i < mesAmis.length; i += nbAmisParCom) {
        // GESTION DE L'ARRÊT COMPLET
        if (!isRunning) {
            currentIndex = 0;
            updateButtonState("start");
            return;
        }

        // GESTION DE LA PAUSE
        while (isPaused) {
            await wait(1000);
            if (!isRunning) return; // Si on arrête pendant une pause
        }

        currentIndex = i; // Sauvegarde l'index actuel
        let groupe = mesAmis.slice(i, i + nbAmisParCom);
        if (groupe.length < nbAmisParCom) break;

        let inputBox = await getCommentBox();

        if (inputBox) {
            console.log(`💬 Commentaire : ${groupe.join(', ')}`);
            for (let ami of groupe) {
                document.execCommand('insertText', false, `@${ami}`);
                await wait(pause1);
                inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
                await wait(pause2);
                inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                await wait(pause3);
            }

            inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

            let pause = Math.floor(Math.random() * (maxWait - minWait) + minWait);
            console.log(`⏱️ Pause : ${Math.round(pause/1000)}s...`);

            // On découpe la grosse pause en petits morceaux de 0.1s pour pouvoir "Pause/Stop" instantanément
            for(let p=0; p < pause/10000; p++) {
                if (!isRunning || isPaused) break;
                await wait(100);
            }
        } else {
            alert("Zone de texte introuvable.");
            break;
        }
    }

    alert("🏁 Assistant : Mission terminée !");
    isRunning = false;
    currentIndex = 0;
    updateButtonState("start");
}

function updateButtonState(state) {
    const btn = document.getElementById("startHelper");
    const stopBtn = document.getElementById("stopHelper");

    if (state === "running") {
        btn.innerHTML = "⏸ PAUSE";
        btn.style.background = "#f39c12";
        stopBtn.style.display = "block";
    } else if (state === "paused") {
        btn.innerHTML = "▶ REPRENDRE";
        btn.style.background = "#2ecc71";
    } else {
        btn.innerHTML = "LANCER";
        btn.style.background = "#1877F2";
        stopBtn.style.display = "none";
    }
}

/**
 * INTERFACE
 */
if (!document.getElementById("helper-container")) {
    const container = document.createElement("div");
    container.id = "helper-container";
    container.style = "position:fixed; top:80px; left:20px; z-index:10000; padding:15px; background:#f0f2f5; border:1px solid #ddd; border-radius:10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: sans-serif; display: flex; flex-direction: column; gap: 10px; width: 200px;";

    container.innerHTML = `
        <div style="font-weight:bold; color:#1877F2; text-align:center;">🏆 Contest Helper</div>
        
        <label style="font-size:11px; margin-bottom:-5px;">Amis par com :</label>
        <input type="number" id="nbAmis" value="3" min="1" style="padding:5px; border-radius:5px; border:1px solid #ccc;">
        
        <label style="font-size:11px; margin-bottom:-5px;">Rapidité :</label>
        <select id="selectVitesse" style="padding:5px; border-radius:5px; border:1px solid #ccc;">
            <option value="Lent">Lent</option>
            <option value="Moyen" selected>Moyen</option>
            <option value="Rapide">Rapide</option>
            <option value="Extreme">Extreme (très rapide)</option>
        </select>

        <button id="startHelper" style="padding:10px; background:#1877F2; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">LANCER</button>
        <button id="stopHelper" style="display:none; padding:8px; background:#e74c3c; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">⏹ ARRÊTER</button>
    `;

    document.body.appendChild(container);

    // LOGIQUE DU BOUTON PRINCIPAL (Lancer / Pause / Reprendre)
    document.getElementById("startHelper").onclick = function() {
        if (!isRunning) {
            const nb = parseInt(document.getElementById("nbAmis").value);
            const vit = document.getElementById("selectVitesse").value;
            updateButtonState("running");
            lancerAssistant(nb, vit);
        } else {
            isPaused = !isPaused;
            updateButtonState(isPaused ? "paused" : "running");
        }
    };

    // LOGIQUE DU BOUTON ARRÊTER
    document.getElementById("stopHelper").onclick = function() {
        isRunning = false;
        isPaused = false;
        updateButtonState("start");
        console.log("⏹ Assistant stoppé manuellement.");
    };
}