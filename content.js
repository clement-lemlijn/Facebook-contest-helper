// Remplace cette URL par ton lien "RAW" de Gist ou Pastebin
const URL_LISTE_AMIS = "https://gist.github.com/clement-lemlijn/378f0b8e17cbfd82f8b0655abf1f800d";

async function recupererListeAmis() {
    try {
        console.log("☁️ Récupération de la liste en ligne...");
        const response = await fetch(URL_LISTE_AMIS);
        const texte = await response.text();

        // On transforme le texte en tableau (sépare par ligne ou virgule)
        // .filter(n => n) permet d'enlever les lignes vides
        return texte.split('\n').map(name => name.trim()).filter(n => n);
    } catch (error) {
        console.error("❌ Erreur de récupération :", error);
        return [];
    }
}

// 2. Fonction pour attendre
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * DETECTION DE LA ZONE DE TEXTE
 */
async function getCommentBox() {
    const selector = 'div[role="textbox"][contenteditable="true"]';
    let el = document.querySelector(selector);

    if (el) {
        el.focus();
        el.click(); // Active l'éditeur Lexical de FB
        await wait(500);
        return el;
    }
    return null;
}

/**
 * LOGIQUE PRINCIPALE
 */
async function lancerLeBot() {
    console.log("🚀 Initialisation du bot...");
    await wait(2000);

    const mesAmis = await recupererListeAmis();

    // Boucle par paquets de 3
    for (let i = 0; i < mesAmis.length; i += 3) {
        let trio = mesAmis.slice(i, i + 3);
        if (trio.length < 3) {
            console.log("Fin de liste ou reste moins de 3 amis.");
            break;
        }

        let inputBox = await getCommentBox();

        if (inputBox) {
            console.log(`💬 Préparation du commentaire : ${trio.join(', ')}`);

            for (let ami of trio) {
                // On insère le texte du tag
                document.execCommand('insertText', false, `@${ami}`);
                await wait(2000); // Pause cruciale pour laisser FB charger la suggestion

                // On simule Flèche Bas + Entrée pour valider le "Lien Bleu"
                inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
                await wait(500);
                inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                await wait(1000);
            }

            // Validation finale du commentaire
            console.log("✅ Envoi du commentaire...");
            inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

            // Pause aléatoire entre 35 et 65 secondes pour simuler un humain
            let pause = Math.floor(Math.random() * (65000 - 35000) + 35000);
            console.log(`⏱️ Pause de sécurité : ${Math.round(pause/1000)}s...`);
            await wait(pause);
        } else {
            alert("Erreur : Impossible de trouver la zone de commentaire. Clique dedans une fois manuellement ?");
            break;
        }
    }
    console.log("🏁 Bot terminé avec succès !");
}

/**
 * INTERFACE UTILISATEUR (Bouton)
 */
if (!document.getElementById("btn-bot-concours")) {
    const btn = document.createElement("button");
    btn.id = "btn-bot-concours";
    btn.innerHTML = "🚀 LANCER BOT CONCOURS";
    btn.style = "position:fixed; top:100px; left:20px; z-index:10000; padding:12px; background:#4267B2; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; box-shadow: 0px 4px 10px rgba(0,0,0,0.3);";

    // Effet visuel au clic
    btn.onclick = () => {
        btn.style.background = "gray";
        btn.disabled = true;
        lancerLeBot();
    };

    document.body.appendChild(btn);
}

// async function getCommentBox() {
//     // On essaie plusieurs sélecteurs au cas où
//     const selectors = [
//         'div[role="textbox"][aria-label*="commentaire"]',
//         'div[role="textbox"][aria-label*="comment"]',
//         'div[data-lexical-editor="true"]',
//         'div[contenteditable="true"][role="textbox"]'
//     ];
//
//     for (let selector of selectors) {
//         let el = document.querySelector(selector);
//         if (el) {
//             console.log("Cible trouvée avec : " + selector);
//             return el;
//         }
//     }
//     return null;
// }
//
// // Fonction pour "forcer" le focus et l'apparition du curseur
// async function preparerZoneTexte(selector) {
//     let el = document.querySelector(selector);
//     if (el) {
//         el.focus();
//         el.click();
//         await wait(500);
//         return el;
//     }
//     return null;
// }
//
// async function lancerLeBot() {
//     console.log("Démarrage du bot dans 3 secondes...");
//     await wait(3000);
//
//     // On boucle sur la liste par paquets de 3
//     for (let i = 0; i < mesAmis.length; i += 3) {
//         let trio = mesAmis.slice(i, i + 3);
//         if (trio.length < 3) break;
//
//         // Trouver la zone de texte du commentaire
//         let inputBox = await preparerZoneTexte('div[role="textbox"][aria-label*="commentaire"], div[role="textbox"]');
//
//         if (inputBox) {
//             inputBox.focus();
//             console.log(`Tentative de tag pour : ${trio.join(', ')}`);
//
//             for (let ami of trio) {
//                 // On simule la frappe du @ et du nom
//                 document.execCommand('insertText', false, `@${ami}`);
//                 await wait(1500); // Temps pour que la liste de suggestions apparaisse
//
//                 // On simule "Flèche Bas" puis "Entrée" pour valider le tag bleu
//                 inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
//                 await wait(500);
//                 inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
//                 await wait(1000);
//             }
//
//             // Une fois les 3 amis mis, on valide le commentaire final
//             console.log("Envoi du commentaire...");
//             inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
//
//             // PAUSE DE SÉCURITÉ : On attend entre 30 et 60 secondes avant le prochain
//             let pause = Math.floor(Math.random() * (60000 - 30000) + 30000);
//             console.log(`Pause de ${pause/1000}s pour éviter le ban...`);
//             await wait(pause);
//         } else {
//             console.log("Zone de commentaire non trouvée. Es-tu sur la bonne page ?");
//             break;
//         }
//     }
//     console.log("Travail terminé !");
// }
//
// // On ajoute un petit bouton flottant sur FB pour lancer le script manuellement
// const btn = document.createElement("button");
// btn.innerHTML = "🚀 LANCER BOT CONCOURS";
// btn.style = "position:fixed;top:100px;left:20px;z-index:9999;padding:10px;background:red;color:white;border-radius:5px;cursor:pointer;";
// document.body.appendChild(btn);
//
// btn.onclick = lancerLeBot;