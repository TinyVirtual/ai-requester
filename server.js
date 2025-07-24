
const app = require("express")();
const bp = require("body-parser");
const fetch = require("node-fetch").default;
const fs = require("fs");

let serverStatus = {
  up: true,
  quotaReached: false,
  lastCheck: new Date().toISOString()
};

const PORT = 8080;

globalThis.fetch = fetch;
globalThis.Headers = fetch.Headers;
globalThis.Request = fetch.Request;
globalThis.Response = fetch.Response;

app.use(bp.json());

const { GoogleGenerativeAI, aihc, aihbt } = require("@google/generative-ai");
// GoogleGenerativeAI, HarmCategory,  HarmBlockThreshold

const apiKeys = [
  process.env.API_KEY1,
  process.env.API_KEY2,
  process.env.API_KEY3
].filter(Boolean); // drop any undefined

const generationconfig = {
    temperature: 0,
    topP: 0.95,
    topK: 64,
    responseMimeType: "text/plain"
}

async function run(prompt, history, instruction) {
  for (const key of apiKeys) {
    try {
      let genAi = new GoogleGenerativeAI(key);
      const model = genAi.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: instruction + ". short responses, at the most 150 characters"
      });
      const chatSession = model.startChat({ generationconfig, history });
      const result = await chatSession.sendMessage(prompt);
      serverStatus.quotaReached = false;
      serverStatus.lastCheck = new Date().toISOString();
      return { Response: true, Text: result.response.text() };
    } catch (e) {
      console.error(`Key failed: HIDDEN →`, e.message);
      if (!e.message.includes("429")) {
        break; // non-quota error, abort early
      }
      serverStatus.quotaReached = true;
      serverStatus.lastCheck = new Date().toISOString();
    }
  }
  return { Response: false };
}

app.post("/",async (req, res) => {
    const prompt = req.body.prompt
    const history = req.body.history
    const instruction = req.body.instruction || "You're an ingame npc called \"Pidonha\", you're a 14 years old gen z teenager and only knows teenagers things, dont use utf8 emojis, only ascii emoticons, also you cannot say mean things"

    const response = await run(prompt,history,instruction)

    response.Response? res.status(200).send(response.Text): res.status(500).send("Server Error") //note: original was if else statement, but this short  version of mine is better B)
})

app.listen(PORT,() => console.log("Working"))

app.get("/status", (req, res) => {
  res.status(200).json({
    status: "Online",
    quotaReached: serverStatus.quotaReached,
    lastChecked: serverStatus.lastCheck
  });
});
//*/
