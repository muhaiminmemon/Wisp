require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 4500;

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get('/', (req, res) => {
  res.send('Productivity app server is running!');
});

app.post('/api/check-sites', async (req, res) => {
  console.log('Received request:', req.body);
  try {
    const { task, url, title } = req.body;

    if (!task || !url || !title) {
      return res.status(400).json({ error: 'Missing task, url, or title in request body' });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a productivity assistant. Assess if the given URL and page title indicate a distraction from the current task. Consider:
          1. The nature of the task
          2. The general purpose of the website (e.g., YouTube can be educational or entertaining)
          3. The specific content indicated by the page title

          For YouTube and other video platforms:
          - Allow general browsing of the site
          - Only consider it a distraction if the video title clearly indicates non-educational content unrelated to the task

          For other sites:
          - Allow general browsing and research
          - Only flag as distractions if the content is clearly unproductive for the given task

          Respond with a JSON object containing only 'isDistraction' (boolean) and 'confidence' (number between 0 and 1).
          Your response must be a valid JSON string, for example: {"isDistraction": true, "confidence": 0.8}`
        },
        {
          role: "user",
          content: `Task: "${task}". URL: "${url}". Page Title: "${title}". Assess if this website is likely to be a distraction for the given task.`
        }
      ],
      max_tokens: 60,
      temperature: 0.2,
    });

    console.log('Raw AI response:', response.choices[0].message.content);

    let aiResponse;
    try {
      aiResponse = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Attempt to extract values if JSON parsing fails
      const content = response.choices[0].message.content;
      const isDistractionMatch = content.match(/isDistraction["\s:]+(\w+)/i);
      const confidenceMatch = content.match(/confidence["\s:]+(\d*\.?\d+)/i);

      aiResponse = {
        isDistraction: isDistractionMatch ? isDistractionMatch[1].toLowerCase() === 'true' : false,
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0
      };
    }

    console.log('Processed AI Response:', aiResponse);

    // Ensure the response has the expected structure
    const safeResponse = {
      isDistraction: Boolean(aiResponse.isDistraction),
      confidence: Number(aiResponse.confidence) || 0
    };

    res.json(safeResponse);
  } catch (error) {
    console.error('Error checking site:', error);
    res.status(500).json({ error: 'An error occurred while checking the site', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});