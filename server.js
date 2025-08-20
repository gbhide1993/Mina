import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// ✅ Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ OpenAI client
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ✅ Health check
app.get("/", (req, res) => {
  res.json({ status: "Mina is running ✅", timestamp: new Date() });
});

// ✅ Webhook for WhatsApp
app.post("/api/whatsapp/webhook", async (req, res) => {
  try {
    const from = req.body.From;
    const body = req.body.Body || "";
    const numMedia = parseInt(req.body.NumMedia || "0", 10);

    console.log("📩 Incoming message from:", from);
    console.log("💬 Message text:", body);

    let reply = "";

    if (numMedia > 0) {
      // ---- STEP 1: Download audio from Twilio ----
      const mediaUrl = req.body.MediaUrl0;
      const mediaType = req.body.MediaContentType0;

      console.log(`🎤 Audio received: ${mediaUrl} (${mediaType})`);

      const audioPath = path.join(__dirname, "meeting_audio.mp3");
      const audioResp = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
        auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN }
      });
      fs.writeFileSync(audioPath, audioResp.data);

      // ---- STEP 2: Transcribe audio with Whisper ----
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1"
      });

      console.log("📝 Transcription:", transcription.text);

      // ---- STEP 3: Generate MoM using GPT ----
      const momResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an assistant that generates clear and concise Minutes of Meetings." },
          { role: "user", content: `Here is the meeting transcript:\n\n${transcription.text}\n\nGenerate structured Minutes of Meeting with key points, decisions, and action items.` }
        ],
        temperature: 0.4
      });

      reply = `📑 *Minutes of Meeting:*\n\n${momResponse.choices[0].message.content}`;
    } else if (body.toLowerCase().includes("start")) {
      reply = "Please send me the meeting audio file 🎤";
    } else {
      reply = "Hello 👋 I am Mina, your MoM assistant. Send me a voice note to get started.";
    }

    // ✅ Always respond with TwiML so WhatsApp gets reply
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>${reply}</Message>
      </Response>
    `);

  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Server error");
  }
});

// ✅ Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});