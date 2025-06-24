"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askOpenAI = askOpenAI;
const openai_1 = __importDefault(require("openai"));
async function askOpenAI(prompt) {
    // const apiKey = vscode.workspace.getConfiguration('aiChat').get<string>('openaiApiKey');
    const apiKey = "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";
    if (!apiKey) {
        return '⚠️ API key not set. Please set aiChat.openaiApiKey in settings.json.';
    }
    const openai = new openai_1.default({ apiKey });
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });
        return completion.choices[0].message.content || '⚠️ No response.';
    }
    catch (err) {
        console.error('OpenAI error:', err);
        return '⚠️ Error: Unable to connect to OpenAI.';
    }
}
