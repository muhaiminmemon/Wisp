require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 4500;

app.use(cors({
  origin: 'chrome-extension://lkfpallimhlljkddbebdkdcfnpglhdge'
}));
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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
          content: `You are an AI productivity assistant. Your task is to evaluate whether a given URL and page title represent a distraction from the current task based on the following criteria:
          1. The nature and focus of the current task.
          2. The typical purpose and content of the website (e.g., YouTube can serve both educational and entertainment purposes).
          3. The specific context provided by the page title.
    
          Guidelines:
          - For video platforms (e.g., YouTube, Vimeo): 
            - Allow general browsing unless the video title clearly suggests non-educational or entertainment content that is unrelated to the task.
          - For other types of websites:
            - Permit general browsing and research unless the page content is clearly irrelevant or unproductive for the current task.
    
          Your response should be a concise JSON object containing two fields:
          1. 'isDistraction': A boolean indicating whether the site is likely a distraction.
          2. 'confidence': A number between 0 and 1 representing the confidence level of your assessment.
    
          Example response:
          {"isDistraction": true, "confidence": 0.85}`
        },
        {
          role: "user",
          content: `Task: "${task}". URL: "${url}". Page Title: "${title}". Determine if this website is likely to distract from the task at hand.`
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

app.post('/api/sync-screen-time', async (req, res) => {
  console.log('Received screen time data:', JSON.stringify(req.body, null, 2));
  try {
    const { screenTimeData } = req.body;

    if (!screenTimeData || !Array.isArray(screenTimeData) || screenTimeData.length === 0) {
      console.error('Invalid screen time data received');
      return res.status(400).json({ error: 'Invalid screen time data' });
    }

    // Process and validate the data
    const processedData = screenTimeData.map(item => ({
      ...item,
      user_id: item.user_id, // Use the existing user_id
      duration: Number(item.duration) || 0,
      created_at: new Date().toISOString()
    }));

    console.log('Processed screen time data:', JSON.stringify(processedData, null, 2));

    // Insert data into Supabase
    const { data, error } = await supabase
      .from('screen_time')
      .insert(processedData);

    if (error) {
      console.error('Error inserting screen time data:', error);
      return res.status(500).json({ error: 'Failed to insert screen time data', details: error });
    }

    console.log('Screen time data synced successfully:', data);
    res.json({ success: true, message: 'Screen time data synced successfully', data });
  } catch (error) {
    console.error('Error in /api/sync-screen-time:', error);
    res.status(500).json({ error: 'An error occurred while syncing screen time data', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});