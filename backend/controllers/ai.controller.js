const axios = require('axios');
const express = require('express');

const chatWithAI = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const response = await axios.post(
      'https://api.cohere.ai/v1/generate',
      {
        model: 'command-r-plus',
        prompt: `
You are a helpful coding assistant. Respond clearly and concisely to the following user message:

User: ${message}
AI:`,
        max_tokens: 200,
        temperature: 0.6,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.generations[0].text.trim();
    res.status(200).json({ reply });
  } catch (error) {
    console.error('AI Chat Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'AI service failed' });
  }
};

module.exports = { chatWithAI };
