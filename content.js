// Ton lien par défaut (si aucun fichier n'est uploadé)
const URL_LISTE_PAR_DEFAUT = "https://gist.githubusercontent.com/clement-lemlijn/378f0b8e17cbfd82f8b0655abf1f800d/raw/facebook-liste-amis.txt";

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- ÉTATS ET CONFIGURATION ---
let isRunning = false;
let isPaused = false;
let currentIndex = 0;
let listeAmisActive = [];

const VITESSE_PROFILES = {
    "Lent": [60000, 90000],
    "Moyen": [30000, 45000],
    "Rapide": [1000, 5000],
    "Extreme": [100, 1000]
};

const VITESSE_PAUSES = {
    "Lent": [2500, 500, 1200],
    "Moyen": [2500, 500, 1200],
    "Rapide": [1000, 500, 500],
    "Extreme": [200, 200, 500]
};

// --- LOGIQUE DE STOCKAGE & CHARGEMENT ---

function chargerListeInitiale() {
    chrome.storage.local.get(['maListeSauvegardee'], (result) => {
        if (result.maListeSauvegardee) {
            listeAmisActive = result.maListeSauvegardee;
            majInterfaceStatut(true);
        } else {
            console.log("Aucune liste locale, prêt pour upload.");
            majInterfaceStatut(false);
        }
    });
}

function majInterfaceStatut(isLoaded) {
    const statusEl = document.getElementById("listeStatus");
    if (statusEl) {
        statusEl.innerHTML = isLoaded
            ? `✅ ${listeAmisActive.length} amis en mémoire`
            : "⚠️ Aucune liste chargée (.txt)";
        statusEl.style.color = isLoaded ? "#2ecc71" : "#e67e22";
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

// --- LOGIQUE PRINCIPALE ---

async function lancerAssistant(nbAmisParCom, vitesse) {
    // Si la liste est vide, on tente un dernier fetch sur le Gist par défaut
    if (listeAmisActive.length === 0) {
        console.log("Tentative de secours sur le Gist...");
        try {
            const response = await fetch(URL_LISTE_PAR_DEFAUT);
            const texte = await response.text();
            listeAmisActive = texte.split('\n').map(name => name.trim()).filter(n => n);
        } catch (e) {
            alert("Erreur : Charge un fichier .txt d'abord !");
            updateButtonState("start");
            return;
        }
    }

    isRunning = true;
    const [minWait, maxWait] = VITESSE_PROFILES[vitesse];
    const [pause1, pause2, pause3] = VITESSE_PAUSES[vitesse];

    for (let i = currentIndex; i < listeAmisActive.length; i += nbAmisParCom) {
        if (!isRunning) { currentIndex = 0; updateButtonState("start"); return; }
        while (isPaused) { await wait(1000); if (!isRunning) return; }

        currentIndex = i;
        let groupe = listeAmisActive.slice(i, i + nbAmisParCom);
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

            // Boucle de pause réactive (check toutes les 100ms)
            for(let p=0; p < pause/100; p++) {
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
 * INTERFACE DE L'ASSISTANT (CORRIGÉE POUR LA VISIBILITÉ)
 */
if (!document.getElementById("helper-container")) {
    const container = document.createElement("div");
    container.id = "helper-container";
    // On force le fond en gris clair et le texte en noir pour contrer le Dark Mode de FB
    container.style = "position:fixed; top:80px; left:20px; z-index:10000; padding:15px; background:#ffffff !important; border:2px solid #1877F2; border-radius:10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); font-family: Arial, sans-serif; display: flex; flex-direction: column; gap: 8px; width: 210px; color: #000000 !important;";

    container.innerHTML = `
        <div style="font-weight:bold; color:#1877F2 !important; text-align:center; margin-bottom:5px; font-size:14px;">🏆 Contest Helper</div>
        
        <div id="listeStatus" style="font-size:10px; text-align:center; font-weight:bold; color: #333 !important; margin-bottom:5px;">Vérification...</div>
        
        <input type="file" id="fileInput" accept=".txt" style="display:none;">
        <button id="btnUpload" style="padding:8px; font-size:11px; cursor:pointer; background:#f0f2f5 !important; border:1px dashed #1877F2; border-radius:5px; color: #000000 !important; width: 100%; font-weight: bold;">📁 Charger Liste (.txt)</button>

        <hr style="border:0; border-top:1px solid #ccc; margin:5px 0;">

        <label style="font-size:11px; color: #000000 !important; font-weight:bold;">Amis par com :</label>
        <input type="number" id="nbAmis" value="3" min="1" style="padding:5px; border-radius:5px; border:1px solid #ccc; background: white !important; color: black !important; width: 100%; box-sizing: border-box;">
        
        <label style="font-size:11px; color: #000000 !important; font-weight:bold;">Rapidité :</label>
        <select id="selectVitesse" style="padding:5px; border-radius:5px; border:1px solid #ccc; background: white !important; color: black !important; width: 100%; box-sizing: border-box;">
            <option value="Lent">Lent</option>
            <option value="Moyen" selected>Moyen</option>
            <option value="Rapide">Rapide</option>
            <option value="Extreme">Extreme ⚡</option>
        </select>

        <button id="startHelper" style="padding:10px; background:#1877F2 !important; color:white !important; border:none; border-radius:5px; cursor:pointer; font-weight:bold; margin-top:5px; width: 100%;">LANCER</button>
        <button id="stopHelper" style="display:none; padding:8px; background:#e74c3c !important; color:white !important; border:none; border-radius:5px; cursor:pointer; font-weight:bold; width: 100%;">⏹ ARRÊTER</button>
    `;

    document.body.appendChild(container);

    // Relance les fonctions de logique après avoir créé le HTML
    chargerListeInitiale();

    // --- LOGIQUE DES BOUTONS (À RECOPIER BIEN EN DESSOUS) ---
    document.getElementById("btnUpload").onclick = () => document.getElementById("fileInput").click();

    document.getElementById("fileInput").onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const texte = e.target.result;
            const liste = texte.split(/[\n\r]+/).map(n => n.trim()).filter(n => n);
            chrome.storage.local.set({ maListeSauvegardee: liste }, () => {
                listeAmisActive = liste;
                majInterfaceStatut(true);
                alert("✅ " + liste.length + " amis mémorisés !");
            });
        };
        reader.readAsText(file);
    };

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

    document.getElementById("stopHelper").onclick = function() {
        isRunning = false;
        isPaused = false;
        updateButtonState("start");
    };
}