require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 4500;

app.use(cors({
  origin: ['chrome-extension://lkfpallimhlljkddbebdkdcfnpglhdge', 'http://localhost:3000']
}));
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Store user blocking preferences in memory
const userBlockingPreferences = {};

// Store task-user associations
const taskUserMap = new Map();

app.get('/', (req, res) => {
  res.send('Productivity app server is running!');
});

// Add a new endpoint to handle toggling blocking
app.post('/api/toggle-blocking', (req, res) => {
  try {
    const { userId, enabled } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in request body' });
    }
    
    userBlockingPreferences[userId] = !!enabled;
    console.log(`Blocking for user ${userId} set to: ${enabled}`);
    
    res.json({ success: true, enabled: userBlockingPreferences[userId] });
  } catch (error) {
    console.error('Error toggling blocking:', error);
    res.status(500).json({ error: 'Failed to toggle blocking', details: error.message });
  }
});

// Update the task association endpoint
app.post('/api/update-task', (req, res) => {
  try {
    const { task, userId } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Missing task in request body' });
    }
    
    if (userId) {
      // Store the association between this task text and user ID
      taskUserMap.set(task, userId);
      console.log(`Associated task "${task}" with user ${userId}`);
    } else {
      console.log(`Received task update without userId: ${task}`);
    }
    
    res.json({ success: true, message: 'Task updated' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task', details: error.message });
  }
});

app.post('/api/check-sites', async (req, res) => {
  console.log('Received request:', req.body);
  try {
    const { task, url, title } = req.body;

    if (!task || !url || !title) {
      return res.status(400).json({ error: 'Missing task, url, or title in request body' });
    }
    
    // Look up the user ID for this task
    const userId = taskUserMap.get(task);
    console.log(`Found user ID for task "${task}": ${userId || 'none'}`);
    
    // Check if blocking is disabled for this user
    if (userId && userBlockingPreferences[userId] === false) {
      console.log(`Blocking disabled for user ${userId}, skipping GPT API call`);
      // Return a response indicating no distraction without calling the API
      return res.json({ 
        isDistraction: false, 
        confidence: 1.0,
        message: "Blocking is disabled"
      });
    }

    // Preprocess URL and title
    const parsedUrl = new URL(url);
    let processedTitle = title;

    // If it's YouTube and the homepage, set a generic title
    if (parsedUrl.hostname === 'www.youtube.com' && parsedUrl.pathname === '/') {
      processedTitle = 'YouTube Homepage';
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI productivity assistant. Evaluate whether a given URL and page title represent a distraction from the current task. Consider:
          1. The nature and focus of the current task.
          2. The typical purpose and content of the website (e.g., YouTube can serve both educational and entertainment purposes).
          3. The specific context provided by the page title.
    
          Guidelines:
          - For video platforms (e.g., YouTube, Vimeo): 
            - For homepages, consider it as general browsing and do not flag as a distraction if it is general browswing of the platform and evaluate based on the current task.
            - For specific videos, evaluate based on the video title and its relevance to the task.
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
          content: `Task: "${task}". URL: "${url}". Page Title: "${processedTitle}". Determine if this website is likely to distract from the task at hand.`
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
    const processedData = screenTimeData.map(item => {
      try {
        // Make sure url is defined and not empty
        const urlString = item.url && item.url.trim() ? item.url : "https://unknown.com";
        const url = new URL(urlString);
        
        return {
          ...item,
          user_id: item.user_id,
          duration: Number(item.duration) || 0,
          created_at: new Date().toISOString(),
          domain: url.hostname  // Extract domain from URL
        };
      } catch (error) {
        console.error(`Error processing URL: ${item.url}`, error);
        // Return a valid object with default values
        return {
          ...item,
          user_id: item.user_id,
          duration: Number(item.duration) || 0,
          created_at: new Date().toISOString(),
          domain: "unknown"
        };
      }
    });

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

app.post('/api/toggle-block', async (req, res) => {
  try {
    const { userId, url, isBlocked } = req.body;
    
    if (!userId || !url) {
      return res.status(400).json({ error: 'Missing userId or url in request body' });
    }

    // Check if the record already exists
    const { data: existingData, error: fetchError } = await supabase
      .from('blocked_sites')
      .select('*')
      .eq('user_id', userId)
      .eq('url', url);

    if (fetchError) {
      console.error('Error checking for existing blocked site:', fetchError);
      return res.status(500).json({ error: 'Failed to check for existing blocked site' });
    }

    let result;
    
    if (existingData && existingData.length > 0) {
      // Update existing record
      const { data, error } = await supabase
        .from('blocked_sites')
        .update({ is_blocked: isBlocked })
        .eq('user_id', userId)
        .eq('url', url);
        
      if (error) {
        console.error('Error updating blocked site:', error);
        return res.status(500).json({ error: 'Failed to update blocked site' });
      }
      
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('blocked_sites')
        .insert([
          { user_id: userId, url: url, is_blocked: isBlocked }
        ]);
        
      if (error) {
        console.error('Error inserting blocked site:', error);
        return res.status(500).json({ error: 'Failed to insert blocked site' });
      }
      
      result = data;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in /api/toggle-block:', error);
    res.status(500).json({ error: 'An error occurred while toggling block status', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});