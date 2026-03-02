const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let isRunning = false;
let isPaused = false;
let currentIndex = 0;
let totalEnvoyes = 0;
let listeAmisTotale = [];
let listeAmisATaguer = [];

const VITESSE_PROFILES = {
    "Lent": [15000, 25000],
    "Moyen": [5000, 8000],
    "Rapide": [1000, 5000],
    "Extreme": [100, 1000]
};

const VITESSE_PAUSES = {
    "Lent": [2500, 500, 1200],
    "Moyen": [1000, 500, 500],
    "Rapide": [800, 400, 500],
    "Extreme": [400, 200, 500]
};

// --- FONCTIONS DE LOGIQUE & AFFICHAGE ---

function logStatus(msg, color = "#333") {
    const el = document.getElementById("logConsole");
    if (el) {
        el.innerHTML = msg;
        el.style.color = color;
    }
}

function majCompteur(nb) {
    const el = document.getElementById("comCount");
    if (el) el.innerHTML = `Commentaires envoyés : <b>${nb}</b>`;
}

function melangerListe(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function insertTextLexical(el, text) {
    el.focus();
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    const event = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
    });
    el.dispatchEvent(event);
}

// --- CIBLAGE INTELLIGENT ---

async function getCommentBox() {
    const textboxes = Array.from(document.querySelectorAll('div[role="textbox"][contenteditable="true"]'));
    if (textboxes.length === 0) return null;

    const midScreen = window.innerHeight / 2;

    let target = textboxes.reduce((prev, curr) => {
        const prevRect = prev.getBoundingClientRect();
        const currRect = curr.getBoundingClientRect();
        const prevDist = Math.abs((prevRect.top + prevRect.height / 2) - midScreen);
        const currDist = Math.abs((currRect.top + currRect.height / 2) - midScreen);
        return (currDist < prevDist) ? curr : prev;
    });

    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await wait(500);
        target.focus();
        target.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        return target;
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

    isRunning = true;
    totalEnvoyes = 0;
    majCompteur(0);

    logStatus("🎲 Mélange des amis...", "#1877F2");
    let copieMelangee = melangerListe([...listeAmisTotale]);
    listeAmisATaguer = copieMelangee.slice(0, nbATaguer);
    await wait(1000);

    const [minWait, maxWait] = VITESSE_PROFILES[vitesse];
    const [pause1, pause2, pause3] = VITESSE_PAUSES[vitesse];

    for (let i = currentIndex; i < listeAmisATaguer.length; i += nbAmisParCom) {
        if (!isRunning) { currentIndex = 0; logStatus("⏹ Arrêté.", "#e74c3c"); updateButtonState("start"); return; }
        while (isPaused) { await wait(1000); if (!isRunning) return; }

        currentIndex = i;
        let groupe = listeAmisATaguer.slice(i, i + nbAmisParCom);
        if (groupe.length < nbAmisParCom) break;

        let inputBox = await getCommentBox();

        if (inputBox) {
            logStatus(`✍️ Écriture : <br><small>${groupe.join(', ')}</small>`, "#2ecc71");

            for (let ami of groupe) {
                if (!isRunning) return;
                insertTextLexical(inputBox, `@${ami}`);
                await wait(pause1);
                inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                await wait(pause3);
            }

            inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            totalEnvoyes++;
            majCompteur(totalEnvoyes);

            let pauseMs = Math.floor(Math.random() * (maxWait - minWait) + minWait);
            for(let p = Math.floor(pauseMs/1000); p > 0; p--) {
                if (!isRunning || isPaused) break;
                logStatus(`⏳ Idle : <b>${p}s</b> restants`, "#7f8c8d");
                await wait(1000);
            }
        } else {
            logStatus("❌ Aucune zone visible au centre", "#e74c3c");
            isRunning = false;
            updateButtonState("start");
            return;
        }
    }

    logStatus("🏁 Terminé !", "#27ae60");
    isRunning = false; currentIndex = 0; updateButtonState("start");
}

// --- INTERFACE ---

if (!document.getElementById("helper-container")) {
    const container = document.createElement("div");
    container.id = "helper-container";
    container.style = "position:fixed; top:80px; left:20px; z-index:10000; padding:15px; background:#ffffff !important; border:2px solid #1877F2; border-radius:10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); font-family: Arial, sans-serif; display: flex; flex-direction: column; gap: 8px; width: 230px; color: #000000 !important; box-sizing: border-box;";

    container.innerHTML = `
        <div style="font-weight:bold; color:#1877F2 !important; text-align:center; margin-bottom:5px; font-size:14px;">FB Contest Helper 🏆</div>
        <div id="statusBox" style="background:#f8f9fa; border:1px solid #ddd; padding:10px; border-radius:8px; min-height:60px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; box-sizing: border-box;">
            <div id="logConsole" style="font-size:11px; font-weight:bold; line-height:1.3; color:#333;">Prêt</div>
            <div id="comCount" style="font-size:10px; margin-top:5px; color:#666;">Commentaires : 0</div>
        </div>
        <input type="file" id="fileInput" accept=".txt" style="display:none;">
        <button id="btnUpload" style="padding:8px; font-size:11px; cursor:pointer; background:#f0f2f5 !important; border:1px dashed #1877F2; border-radius:5px; color: #000 !important; width: 100%; font-weight: bold; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📁 Charger Liste (.txt)</button>
        <hr style="border:0; border-top:1px solid #ccc; margin:5px 0;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <label style="font-size:11px; font-weight:bold;">Taguer :</label>
            <span id="labelSlider" style="font-size:11px; font-weight:bold; color:#1877F2;">0 / 0</span>
        </div>
        <input type="range" id="sliderAmis" min="0" max="100" value="0" style="width:100%; cursor:pointer;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div style="display:flex; flex-direction:column;">
                <label style="font-size:10px; font-weight:bold;">Amis/com :</label>
                <input type="number" id="nbAmis" value="3" min="1" style="padding:5px; border-radius:5px; border:1px solid #ccc; width:100%; box-sizing: border-box;">
            </div>
            <div style="display:flex; flex-direction:column;">
                <label style="font-size:10px; font-weight:bold;">Vitesse :</label>
                <select id="selectVitesse" style="padding:5px; border-radius:5px; border:1px solid #ccc; width:100%; box-sizing: border-box;">
                    <option value="Lent">Lent</option>
                    <option value="Moyen" selected>Moyen</option>
                    <option value="Rapide">Rapide</option>
                    <option value="Extreme">Extreme ⚡</option>
                </select>
            </div>
        </div>
        <button id="startHelper" style="padding:10px; background:#1877F2 !important; color:white !important; border:none; border-radius:5px; cursor:pointer; font-weight:bold; margin-top:5px; width:100%; box-sizing: border-box;">LANCER</button>
        <button id="stopHelper" style="display:none; padding:8px; background:#e74c3c !important; color:white !important; border:none; border-radius:5px; cursor:pointer; font-weight:bold; width:100%; box-sizing: border-box;">⏹ ARRÊTER</button>
        
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; text-align: center; font-size: 9px; color: #999; font-style: italic;">
            &copy; 2026 Lemlijn Clément
        </div>
    `;

    document.body.appendChild(container);
    chargerListeInitiale();

    document.getElementById("sliderAmis").oninput = function() {
        document.getElementById("labelSlider").innerHTML = `${this.value} / ${listeAmisTotale.length}`;
    };

    document.getElementById("btnUpload").onclick = () => document.getElementById("fileInput").click();
    document.getElementById("fileInput").onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // MISE À JOUR DU TEXTE DU BOUTON
        const btn = document.getElementById("btnUpload");
        btn.innerHTML = `📄 ${file.name}`;
        btn.style.borderStyle = "solid"; // Change le pointillé en ligne pleine pour valider l'action
        btn.style.background = "#e7f3ff !important"; // Un léger bleu pour confirmer

        const reader = new FileReader();
        reader.onload = (e) => {
            const liste = e.target.result.split(/[\n\r]+/).map(n => n.trim()).filter(n => n);
            chrome.storage.local.set({ maListeSauvegardee: liste }, () => {
                listeAmisTotale = liste;
                const slider = document.getElementById("sliderAmis");
                slider.max = liste.length;
                slider.value = Math.floor((liste.length * 2) / 3);
                document.getElementById("labelSlider").innerHTML = `${slider.value} / ${liste.length}`;
                logStatus(`✅ ${liste.length} amis importés.`);
            });
        };
        reader.readAsText(file);
    };

    document.getElementById("startHelper").onclick = function() {
        if (!isRunning) {
            updateButtonState("running");
            lancerAssistant(
                parseInt(document.getElementById("nbAmis").value),
                document.getElementById("selectVitesse").value,
                parseInt(document.getElementById("sliderAmis").value)
            );
        } else {
            isPaused = !isPaused;
            updateButtonState(isPaused ? "paused" : "running");
        }
    };

    document.getElementById("stopHelper").onclick = function() {
        isRunning = false; isPaused = false; updateButtonState("start");
    };
}

function updateButtonState(state) {
    const btn = document.getElementById("startHelper");
    const stopBtn = document.getElementById("stopHelper");
    if (state === "running") {
        btn.innerHTML = "⏸ PAUSE"; btn.style.background = "#f39c12 !important"; stopBtn.style.display = "block";
    } else if (state === "paused") {
        btn.innerHTML = "▶ REPRENDRE"; btn.style.background = "#2ecc71 !important";
    } else {
        btn.innerHTML = "LANCER"; btn.style.background = "#1877F2 !important"; stopBtn.style.display = "none";
    }
}

function chargerListeInitiale() {
    chrome.storage.local.get(['maListeSauvegardee'], (result) => {
        if (result.maListeSauvegardee) {
            listeAmisTotale = result.maListeSauvegardee;
            const slider = document.getElementById("sliderAmis");
            slider.max = listeAmisTotale.length;
            slider.value = Math.floor((listeAmisTotale.length * 2) / 3);
            document.getElementById("labelSlider").innerHTML = `${slider.value} / ${listeAmisTotale.length}`;
            logStatus("✅ Liste prête.");
        }
    });
}