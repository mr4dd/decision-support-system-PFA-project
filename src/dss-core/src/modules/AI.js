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

function toInteractionHistory(messages = []) {
    if (!Array.isArray(messages)) {
        return [];
    }

    return messages
        .filter((message) => (
            message &&
            typeof message === 'object' &&
            (message.role === 'assistant' || message.role === 'user') &&
            (message.text !== undefined || message.content !== undefined)
        ))
        .map((message) => ({
            type: message.role === 'assistant' ? 'model_output' : 'user_input',
            content: [{ type: 'text', text: String(message.text ?? message.content ?? '') }],
        }));
}

async function chat(message, messages = [], context = {}){
    const startedAt = process.hrtime.bigint();
    const history = toInteractionHistory(messages);
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
        logger.info("AI chat completed", {
            ...context,
            durationMs: Number((Number(process.hrtime.bigint() - startedAt) / 1e6).toFixed(2)),
            responseLength: response.length,
            historyLengthAfter: history.length + interaction.steps.length,
        });
        return response;
    } catch (error) {
        logger.error("AI chat failed", { ...context, ...logger.errorDetails(error) });
        throw error;
    }
}

async function extract(response_schema, messages = [], context = {}){
    const startedAt = process.hrtime.bigint();
    const history = toInteractionHistory(messages);
    logger.debug("AI extraction started", {
        ...context,
        schemaKeyCount: Object.keys(response_schema).length,
        messagesProvided: messages.length > 0,
        historyLengthBefore: history.length,
    });

    const format = {
        type: "text",
        mime_type: "application/json",
        schema: response_schema
    }

    history.push({
        type: "user_input",
        content: [{ type: "text", text: "use the information you were provided to create structured output data." }]
    });

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

module.exports = { chat, extract, toInteractionHistory };