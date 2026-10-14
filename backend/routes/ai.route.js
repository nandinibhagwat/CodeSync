const express = require("express");
const { chatWithAI } = require("../controllers/ai.controller");
const { auth } = require("../middleware/auth");
const router = express.Router();

router.post("/chat", auth, chatWithAI);

module.exports = router;
