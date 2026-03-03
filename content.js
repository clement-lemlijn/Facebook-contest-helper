const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let isRunning = false;
let isPaused = false;
let currentIndex = 0;
let totalEnvoyes = 0;
let listeAmisTotale = [];
let listeAmisATaguer = [];

const VITESSE_PROFILES = {
    "Lent": [60000, 180000],
    "Moyen": [30000, 75000],
    "Rapide": [3000, 10000],
    "Extreme": [100, 1000]
};

const VITESSE_PAUSES = {
    "Lent": [3000, 1000, 1500],
    "Moyen": [2000, 800, 1000],
    "Rapide": [1200, 400, 800],
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

        // --- VERIFICATION DU BLOCAGE ---
        if (detecterBlocage()) {
            isRunning = false;
            isPaused = false;
            logStatus("⚠️ BLOCAGE FACEBOOK ! <br>L'assistant s'est arrêté pour protéger votre compte.", "#e74c3c");
            updateButtonState("start");
            alert("Facebook a bloqué l'action. L'assistant s'est arrêté par sécurité. Attendez quelques heures avant de recommencer.");
            return; // On sort définitivement de la fonction
        }

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
                inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
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

function detecterBlocage() {
    // On cherche le texte exact que tu as fourni dans le HTML
    const phraseBlocage = "Vous ne pouvez pas utiliser cette fonctionnalité pour le moment";

    // On regarde dans tout le document si cette phrase existe
    const estBloque = document.body.innerText.includes(phraseBlocage);

    if (estBloque) {
        console.error("🚨 BLOCAGE DETECTÉ ! Arrêt d'urgence.");
        return true;
    }
    return false;
}



// --- INTERFACE ---

if (!document.getElementById("helper-container")) {
    const container = document.createElement("div");
    container.id = "helper-container";
    container.style = "position:fixed; top:80px; left:20px; z-index:10000; padding:15px; background:#ffffff !important; border:2px solid #1877F2; border-radius:12px; box-shadow: 0 8px 30px rgba(0,0,0,0.3); font-family: Arial, sans-serif; display: flex; flex-direction: column; gap: 8px; width: 240px; color: #000000 !important; box-sizing: border-box; transition: transform 0.3s ease, opacity 0.3s ease;";

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <div style="font-weight:bold; color:#1877F2 !important; font-size:14px;">FB Contest Helper 🏆</div>
            <button id="minimizeBtn" style="background:#f0f2f5; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; color:#666; font-weight:bold; display:flex; align-items:center; justify-content:center;">_</button>
        </div>
        <div id="statusBox" style="background:#f8f9fa; border:1px solid #ddd; padding:10px; border-radius:8px; min-height:60px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; box-sizing: border-box;">
            <div id="logConsole" style="font-size:11px; font-weight:bold; line-height:1.3; color:#333;">Prêt</div>
            <div id="comCount" style="font-size:10px; margin-top:5px; color:#666;">Commentaires : 0</div>
        </div>
        <input type="file" id="fileInput" accept=".txt" style="display:none;">
        
        <div id="uploadContainer" style="display:flex; align-items:center; gap:5px; width:100%;">
            <button id="btnUpload" style="flex-grow:1; padding:8px; font-size:11px; cursor:pointer; background:#f0f2f5 !important; border:1px dashed #1877F2; border-radius:5px; color: #000 !important; font-weight: bold; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📁 Charger Liste (.txt)</button>
            <button id="clearList" style="display:none; padding:8px; background:#ffdce0; border:1px solid #ff4d4f; border-radius:5px; color:#ff4d4f; cursor:pointer; font-weight:bold; font-size:11px;">✕</button>
        </div>

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
                    <option value="Lent">Très lent</option>
                    <option value="Lent">Lent</option>
                    <option value="Moyen" selected>Moyen (recommandé)</option>
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

    const fbBarBtn = document.createElement("div");
    fbBarBtn.id = "fb-bar-helper-btn";
    fbBarBtn.style = "position:fixed; top:8px; right:200px; z-index:10001; background:#e4e6eb; width:36px; height:36px; border-radius:50%; display:none; align-items:center; justify-content:center; cursor:pointer; font-size:18px; transition: background 0.2s;";
    fbBarBtn.innerHTML = "🏆";
    fbBarBtn.title = "Ouvrir Assistant Concours";
    fbBarBtn.onmouseover = () => fbBarBtn.style.background = "#d8dadf";
    fbBarBtn.onmouseout = () => fbBarBtn.style.background = "#e4e6eb";

    document.body.appendChild(container);
    document.body.appendChild(fbBarBtn);
    chargerListeInitial();

    // --- EVENEMENTS ---

    document.getElementById("minimizeBtn").onclick = () => {
        container.style.transform = "scale(0.8) translateY(-20px)";
        container.style.opacity = "0";
        setTimeout(() => {
            container.style.display = "none";
            fbBarBtn.style.display = "flex";
        }, 300);
    };

    fbBarBtn.onclick = () => {
        fbBarBtn.style.display = "none";
        container.style.display = "flex";
        setTimeout(() => {
            container.style.transform = "scale(1) translateY(0)";
            container.style.opacity = "1";
        }, 10);
    };

    document.getElementById("sliderAmis").oninput = function() {
        document.getElementById("labelSlider").innerHTML = `${this.value} / ${listeAmisTotale.length}`;
    };

    document.getElementById("btnUpload").onclick = () => document.getElementById("fileInput").click();

    // SUPPRIMER LA LISTE
    document.getElementById("clearList").onclick = () => {
        chrome.storage.local.remove('maListeSauvegardee', () => {
            listeAmisTotale = [];
            const btn = document.getElementById("btnUpload");
            btn.innerHTML = `📁 Charger Liste (.txt)`;
            btn.style.borderStyle = "dashed";
            btn.style.background = "#f0f2f5 !important";
            document.getElementById("clearList").style.display = "none";

            const slider = document.getElementById("sliderAmis");
            slider.max = 100;
            slider.value = 0;
            document.getElementById("labelSlider").innerHTML = `0 / 0`;
            logStatus("🗑 Liste supprimée.");
        });
    };

    document.getElementById("fileInput").onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const btn = document.getElementById("btnUpload");
        btn.innerHTML = `📄 ${file.name}`;
        btn.style.borderStyle = "solid";
        btn.style.background = "#e7f3ff !important";
        document.getElementById("clearList").style.display = "block";

        const reader = new FileReader();
        reader.onload = (ev) => {
            const liste = ev.target.result.split(/[\n\r]+/).map(n => n.trim()).filter(n => n);
            chrome.storage.local.set({ maListeSauvegardee: liste, dernierNomFichier: file.name }, () => {
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

function chargerListeInitial() {
    chrome.storage.local.get(['maListeSauvegardee', 'dernierNomFichier'], (result) => {
        if (result.maListeSauvegardee) {
            listeAmisTotale = result.maListeSauvegardee;
            const nomFichier = result.dernierNomFichier || "Liste chargée";
            const btn = document.getElementById("btnUpload");
            btn.innerHTML = `📄 ${nomFichier}`;
            btn.style.borderStyle = "solid";
            btn.style.background = "#e7f3ff !important";
            document.getElementById("clearList").style.display = "block";

            const slider = document.getElementById("sliderAmis");
            slider.max = listeAmisTotale.length;
            slider.value = Math.floor((listeAmisTotale.length * 2) / 3);
            document.getElementById("labelSlider").innerHTML = `${slider.value} / ${listeAmisTotale.length}`;
        }
    });
}