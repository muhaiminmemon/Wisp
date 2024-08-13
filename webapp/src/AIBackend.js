const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Use environment variable for API key
});

router.post('/check-sites', async (req, res) => {
  try {
    const { task } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a productivity assistant. Your job is to determine which websites might be distracting for a given task and which might be helpful."
        },
        {
          role: "user",
          content: `The current task is: ${task}. Please provide a list of websites that might be distracting and a list of websites that might be helpful for this task. Respond in JSON format with 'blockedSites' and 'allowedSites' arrays.`
        }
      ]
    });

    const response = JSON.parse(completion.choices[0].message.content);

    res.json(response);
  } catch (error) {
    console.error('Error checking sites:', error);
    res.status(500).json({ error: 'An error occurred while checking sites' });
  }
});

module.exports = router;