const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const dotenv = require("dotenv");
const twilio = require("twilio");

dotenv.config();
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// ✅ Twilio WhatsApp webhook endpoint
app.post("/api/whatsapp/webhook", async (req, res) => {
  try {
    const from = req.body.From;
    const msg = req.body.Body;

    console.log("Incoming text message:", msg);

    // ✅ Handle media (audio/image/video)
    if (req.body.NumMedia && parseInt(req.body.NumMedia) > 0) {
      console.log(`📎 ${req.body.NumMedia} media file(s) received`);

      for (let i = 0; i < req.body.NumMedia; i++) {
        const mediaUrl = req.body[`MediaUrl${i}`];
        const mediaType = req.body[`MediaContentType${i}`];
        console.log(`➡️ Media ${i + 1}: ${mediaUrl} (type: ${mediaType})`);
      }
    }

    // Quick reply logic
    let reply = "Hello 👋 I am Mina, your MoM assistant.";
    if (msg && msg.toLowerCase().includes("start")) {
      reply = "Please send me the meeting audio file 🎤";
    } else if (msg && msg.toLowerCase().includes("hello")) {
      reply = "Hi there! 👋 Say 'start' to begin MoM recording.";
    }

    // Respond back using Twilio MessagingResponse
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(reply);

    res.set("Content-Type", "text/xml");
    res.send(twiml.toString());
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Error");
  }
});

// ✅ Health check
app.get("/", (req, res) => {
  res.json({ status: "Mina is running ✅" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
