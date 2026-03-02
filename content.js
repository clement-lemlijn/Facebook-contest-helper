const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let isRunning = false;
let isPaused = false;
let currentIndex = 0;
let listeAmisTotale = []; // La liste complète du fichier
let listeAmisATaguer = []; // La portion sélectionnée par le slider

const VITESSE_PROFILES = {
    "Lent": [15000, 25000],
    "Moyen": [5000, 15000],
    "Rapide": [1000, 5000],
    "Extreme": [100, 1000]
};

const VITESSE_PAUSES = {
    "Lent": [2500, 500, 1200],
    "Moyen": [1000, 500, 500],
    "Rapide": [800, 400, 500],
    "Extreme": [400, 200, 500]
};

// --- FONCTIONS DE LOGIQUE ---

function melangerListe(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function chargerListeInitiale() {
    chrome.storage.local.get(['maListeSauvegardee'], (result) => {
        if (result.maListeSauvegardee) {
            listeAmisTotale = result.maListeSauvegardee;
            initialiserSlider();
            majInterfaceStatut(true);
        } else {
            majInterfaceStatut(false);
        }
    });
}

function initialiserSlider() {
    const slider = document.getElementById("sliderAmis");
    const label = document.getElementById("labelSlider");
    if (slider && listeAmisTotale.length > 0) {
        slider.max = listeAmisTotale.length;
        // Calcul des 2 tiers par défaut
        const deuxTiers = Math.floor((listeAmisTotale.length * 2) / 3);
        slider.value = deuxTiers;
        label.innerHTML = `${deuxTiers} / ${listeAmisTotale.length}`;
    }
}

function majInterfaceStatut(isLoaded) {
    const statusEl = document.getElementById("listeStatus");
    if (statusEl) {
        statusEl.innerHTML = isLoaded ? `✅ ${listeAmisTotale.length} amis en mémoire` : "⚠️ Liste vide";
        statusEl.style.color = isLoaded ? "#2ecc71" : "#e67e22";
    }
}

async function getCommentBox() {
    const selector = 'div[role="textbox"][contenteditable="true"]';
    let el = document.querySelector(selector);
    if (el) {
        el.focus(); el.click();
        await wait(800);
        return el;
    }
    return null;
}

// --- LOGIQUE PRINCIPALE ---

async function lancerAssistant(nbAmisParCom, vitesse, nbATaguer) {
    if (listeAmisTotale.length === 0) {
        alert("Chargez un fichier .txt d'abord !");
        updateButtonState("start");
        return;
    }

    // Mélange et découpe selon le slider
    console.log(`🔀 Mélange et sélection de ${nbATaguer} amis...`);
    let copieMelangee = melangerListe([...listeAmisTotale]);
    listeAmisATaguer = copieMelangee.slice(0, nbATaguer);

    isRunning = true;
    const [minWait, maxWait] = VITESSE_PROFILES[vitesse];
    const [pause1, pause2, pause3] = VITESSE_PAUSES[vitesse];

    for (let i = currentIndex; i < listeAmisATaguer.length; i += nbAmisParCom) {
        if (!isRunning) { currentIndex = 0; updateButtonState("start"); return; }
        while (isPaused) { await wait(1000); if (!isRunning) return; }

        currentIndex = i;
        let groupe = listeAmisATaguer.slice(i, i + nbAmisParCom);
        if (groupe.length < nbAmisParCom) break;

        let inputBox = await getCommentBox();
        if (inputBox) {
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
            for(let p=0; p < pause/100; p++) {
                if (!isRunning || isPaused) break;
                await wait(100);
            }
        }
    }
    alert("🏁 Assistant : Mission terminée !");
    isRunning = false; currentIndex = 0; updateButtonState("start");
}

function updateButtonState(state) {
    const btn = document.getElementById("startHelper");
    const stopBtn = document.getElementById("stopHelper");
    if (state === "running") {
        btn.innerHTML = "⏸ PAUSE"; btn.style.background = "#f39c12"; stopBtn.style.display = "block";
    } else if (state === "paused") {
        btn.innerHTML = "▶ REPRENDRE"; btn.style.background = "#2ecc71";
    } else {
        btn.innerHTML = "LANCER"; btn.style.background = "#1877F2"; stopBtn.style.display = "none";
    }
}

// --- INTERFACE ---

if (!document.getElementById("helper-container")) {
    const container = document.createElement("div");
    container.id = "helper-container";
    // Ajout de box-sizing: border-box sur le container
    container.style = "position:fixed; top:80px; left:20px; z-index:10000; padding:15px; background:#ffffff !important; border:2px solid #1877F2; border-radius:10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); font-family: Arial, sans-serif; display: flex; flex-direction: column; gap: 8px; width: 220px; color: #000000 !important; box-sizing: border-box;";

    container.innerHTML = `
        <div style="font-weight:bold; color:#1877F2 !important; text-align:center; margin-bottom:5px; font-size:14px;">FB Contest Helper 🏆</div>
        <div id="listeStatus" style="font-size:10px; text-align:center; font-weight:bold; color: #333 !important; margin-bottom:5px;">Vérification...</div>
        
        <input type="file" id="fileInput" accept=".txt" style="display:none;">
        <button id="btnUpload" style="padding:8px; font-size:11px; cursor:pointer; background:#f0f2f5 !important; border:1px dashed #1877F2; border-radius:5px; color: #000 !important; width: 100%; font-weight: bold; box-sizing: border-box;">📁 Charger Liste .txt</button>
        
        <hr style="border:0; border-top:1px solid #ccc; margin:5px 0;">

        <div style="display:flex; justify-content:space-between; align-items:center; box-sizing: border-box;">
            <label style="font-size:11px; font-weight:bold; color:#000 !important;">Amis à taguer :</label>
            <span id="labelSlider" style="font-size:11px; font-weight:bold; color:#1877F2 !important;">0 / 0</span>
        </div>
        <input type="range" id="sliderAmis" min="0" max="100" value="0" style="width:100%; cursor:pointer; box-sizing: border-box;">

        <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-size:11px; color: #000 !important; font-weight:bold;">Amis par com :</label>
            <input type="number" id="nbAmis" value="3" min="1" style="padding:5px; border-radius:5px; border:1px solid #ccc; background:white !important; color:black !important; width:100%; box-sizing: border-box;">
        </div>

        <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-size:11px; color: #000 !important; font-weight:bold;">Rapidité :</label>
            <select id="selectVitesse" style="padding:5px; border-radius:5px; border:1px solid #ccc; background:white !important; color:black !important; width:100%; box-sizing: border-box;">
                <option value="Lent">Lent</option>
                <option value="Moyen" selected>Moyen</option>
                <option value="Rapide">Rapide</option>
                <option value="Extreme">Extreme ⚡</option>
            </select>
        </div>

        <button id="startHelper" style="padding:10px; background:#1877F2 !important; color:white !important; border:none; border-radius:5px; cursor:pointer; font-weight:bold; margin-top:5px; width:100%; box-sizing: border-box;">LANCER</button>
        <button id="stopHelper" style="display:none; padding:8px; background:#e74c3c !important; color:white !important; border:none; border-radius:5px; cursor:pointer; font-weight:bold; width:100%; box-sizing: border-box;">⏹ ARRÊTER</button>
    `;

    document.body.appendChild(container);
    chargerListeInitiale();

    // --- EVENEMENTS ---

    document.getElementById("sliderAmis").oninput = function() {
        document.getElementById("labelSlider").innerHTML = `${this.value} / ${listeAmisTotale.length}`;
    };

    document.getElementById("btnUpload").onclick = () => document.getElementById("fileInput").click();

    document.getElementById("fileInput").onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const liste = e.target.result.split(/[\n\r]+/).map(n => n.trim()).filter(n => n);
            chrome.storage.local.set({ maListeSauvegardee: liste }, () => {
                listeAmisTotale = liste;
                initialiserSlider();
                majInterfaceStatut(true);
                alert("✅ Liste mémorisée !");
            });
        };
        reader.readAsText(file);
    };

    document.getElementById("startHelper").onclick = function() {
        if (!isRunning) {
            const nb = parseInt(document.getElementById("nbAmis").value);
            const vit = document.getElementById("selectVitesse").value;
            const nbATaguer = parseInt(document.getElementById("sliderAmis").value);
            updateButtonState("running");
            lancerAssistant(nb, vit, nbATaguer);
        } else {
            isPaused = !isPaused;
            updateButtonState(isPaused ? "paused" : "running");
        }
    };

    document.getElementById("stopHelper").onclick = function() {
        isRunning = false; isPaused = false; updateButtonState("start");
    };
}