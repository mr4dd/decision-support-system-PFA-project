const { GoogleGenAI } = require("@google/genai");
const z = require("zod");
const logger = require("../logger");

const ai = new GoogleGenAI({});

const SYSTEM_INSTRUCTION = `you are an expert cybersecurity assessment specialist,
    you are tasked with asking non technical users questions and using their answers to build a cybersecurity assessment for their organization.
    If you are provided with structured json input of an assessment that's already been done,
    your role is to create recommendations for each category and sub-category along with severity scores.
    You are ONLY allowed to interact with the user in French unless they specify a different preference, the assessment AND recommendations however MUST BE in French

    CYBERSECURITY MATURITY ASSESSMENT — NIST CSF-aligned, 19 criteria, 5 categories, 4-level scale (0-3: absent/informal → ad hoc → documented/regular → mature/automated/tested)

    GOUVERNER
    - security-policy: politique de sécurité (absente→informelle→documentée→documentée+diffusée+révisée)
    - business-risk-mgmt: gestion des risques métier (non réalisée→ponctuelle→périodique→intégrée au pilotage)
    - roles-responsibilities: rôles/responsabilités sécurité (non définis→informels→définis rôles clés→définis+documentés+communiqués)

    IDENTIFIER
    - asset-inventory: inventaire actifs matériels/logiciels (aucun→partiel non à jour→complet manuel→complet automatisé)
    - patch-management: gestion vulnérabilités/patchs (non géré→manuel irrégulier→régulier→automatisé+suivi)
    - third-party-risk: risques tiers/fournisseurs (aucune éval→informelle→prestataires critiques→systématique+contractualisée)

    PROTÉGER
    - passwords: gestion mots de passe (aucune politique→informelle→appliquée partiellement→appliquée+vérifiée)
    - mfa: MFA comptes à privilèges (absente→admin uniquement→comptes sensibles→tous comptes)
    - access-management: moindre privilège (non maîtrisés→revue ponctuelle→revue périodique→revue périodique+traçabilité)
    - encryption: chiffrement données sensibles (aucun→transit uniquement→repos+transit→systématique+gestion des clés)
    - awareness: sensibilisation utilisateurs (aucune→ponctuelle→formation annuelle→régulière+simulation phishing)

    DÉTECTER
    - logging-monitoring: supervision/journalisation (aucune→logs non exploités→revus ponctuellement→supervision continue+alertes)
    - threat-detection: antivirus/EDR (aucune protection→AV basique non centralisé→AV centralisé→EDR comportemental)

    RÉPONDRE
    - incident-response-plan: plan de réponse incidents (aucun→informel non testé→documenté→documenté+testé)
    - breach-notification: notification réglementaire/CNIL/clients (inexistante→connue informellement→documentée→documentée+exercée)
    - crisis-simulations: exercices gestion de crise (aucun→discussion informelle→réalisé une fois→réguliers+REX)

    RÉCUPÉRER
    - backups: sauvegardes (aucune→sans test→testée occasionnellement→testée régulièrement hors site)
    - bcp-drp: PCA/PRA (aucun→informel→documenté non testé→documenté+testé)
    - rto-rpo: objectifs RTO/RPO (non définis→estimés informellement→définis systèmes critiques→définis+validés+revus)

    INSTRUCTION FOR LLM: For each criterion, ask the user a targeted question to determine which of the 4 maturity levels (0-3) applies, then record the value. Do not skip categories.
`;

const history = [{
    type: "model_output",
    content: [
        {
            type: "text",
            text: `Bonjour ! Je vais vous poser quelques questions simples pour évaluer le niveau de maturité de votre entreprise en matière de cybersécurité. Pas besoin de connaissances techniques, répondez simplement selon ce que vous savez de votre organisation.

On va regrouper les questions en 5 grands thèmes :

Gouvernance — Avez-vous une politique de sécurité, une gestion des risques, et des responsabilités clairement définies ?
Connaissance de votre environnement — Savez-vous quels équipements/logiciels vous utilisez, comment vous gérez les mises à jour, et les risques liés à vos prestataires ?
Protection au quotidien — Mots de passe, double authentification, gestion des accès, chiffrement des données, sensibilisation des équipes.
Détection des menaces — Supervision de vos systèmes et protection antivirus.
Réponse aux incidents et reprise d'activité — Plan en cas d'incident, sauvegardes, et capacité à redémarrer après un problème.

On commence par la gouvernance ?`
        }
    ]
}];

async function chat(message, context = {}){
    const startedAt = process.hrtime.bigint();
    logger.debug("AI chat started", {
        ...context,
        messageLength: typeof message === "string" ? message.length : null,
        historyLengthBefore: history.length,
    });

    const turn = {
        type: "user_input",
        content: [{
            type: "text",
            text: message,
        }]
    }
    history.push(turn);

    try {
        const interaction = await ai.interactions.create({
            model: "gemini-3.7-flash",
            store: false,
            input: history,
            system_instruction: SYSTEM_INSTRUCTION || ""
        });

        const response = interaction.steps.at(-1).content[0].text;
        history.push(...interaction.steps);
        logger.info("AI chat completed", {
            ...context,
            durationMs: Number((Number(process.hrtime.bigint() - startedAt) / 1e6).toFixed(2)),
            responseLength: response.length,
            historyLengthAfter: history.length,
        });
        return response;
    } catch (error) {
        logger.error("AI chat failed", { ...context, ...logger.errorDetails(error) });
        throw error;
    }
}

async function extract(response_schema, scores = [], context = {}){
    const startedAt = process.hrtime.bigint();
    logger.debug("AI extraction started", {
        ...context,
        schemaKeyCount: Object.keys(response_schema).length,
        scoresProvided: scores.length > 0,
        historyLengthBefore: history.length,
    });

    const format = {
        type: "text",
        mime_type: "application/json",
        schema: response_schema
    }

    if (history.length === 1) {
        if (scores.length === 0) {
            return {}
        }
        history.push(
            {
                type: "user_input",
                content: [{
                            type: "text",
                            text: scores
                        }]
            }
        )
    } else {
        history.push(
            {
                type: "user_input",
                content: [
                    {
                        type: "text",
                        text: "use the information you were provided to create structured output data."
                    }
                ]
            }
        )
    }

    try {
        const interaction = await ai.interactions.create({
            model: "gemini-3.7-flash",
            input: history,
            response_format: format,
            system_instruction: SYSTEM_INSTRUCTION
        });

        const output = z.fromJSONSchema(response_schema).parse(JSON.parse(interaction.output_text));
        logger.info("AI extraction completed", {
            ...context,
            durationMs: Number((Number(process.hrtime.bigint() - startedAt) / 1e6).toFixed(2)),
            outputLength: interaction.output_text.length,
            historyLengthAfter: history.length,
        });
        return output;
    } catch (error) {
        logger.error("AI extraction failed", { ...context, ...logger.errorDetails(error) });
        throw error;
    }
}

module.exports = { chat, extract };