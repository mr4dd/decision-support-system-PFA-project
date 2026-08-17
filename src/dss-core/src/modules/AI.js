const { GoogleGenAI } = require("@google/genai");
const z = require("zod");

const ai = new GoogleGenAI({});

const history = [];
async function chat(message){
    const turn = {
        type: "user_input",
        content: [{
            type: "text",
            text: message,
        }]
    }
    history.push(turn);

    const interaction = await ai.interactions.create({
        model: "gemini-3.7-flash",
        store: false,
        input: history
    });

    const response = interaction.steps.at(-1).content[0].text;
    history.push(...interaction.steps);

    return response;
}

async function extract(response_schema){

    const format = {
        type: "text",
        mime_type: "application/json",
        schema: response_schema
    }

    const interaction = await ai.interaction.create({
        model: "gemini-3.7-flash",
        input: history,
        response_format: format
    })

    const output = z.fromJSONSchema(response_schema).parse(JSON.parse(interaction.output_text))
    return output;
}

module.exports = { chat, extract };