const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Security: Configure CORS ---
// This ensures that only your Shopify store can make requests to this backend.
const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN; // e.g., 'seoustaad.com'
const whitelist = [
  `https://www.${shopifyDomain}`,
  `https://${shopifyDomain}`,
  `https://admin.shopify.com` // Allows requests from the Shopify theme editor
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // and requests from our whitelist.
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['POST', 'OPTIONS'], // Allow POST and preflight OPTIONS requests
};

app.use(cors(corsOptions));
app.use(express.json()); // Middleware to parse JSON bodies

// --- Define the API Endpoint ---
app.post('/analyze', async (req, res) => {
  const { url: urlToAnalyze } = req.body;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // 1. Basic Input Validation
  if (!urlToAnalyze) {
    return res.status(400).json({ error: 'URL is required' });
  }
  if (!geminiApiKey) {
    console.error('Gemini API key is not configured on the server.');
    return res.status(500).json({ error: 'Internal server configuration error.' });
  }

  // 2. Construct the Gemini API Request
  const geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  
  const promptText = `Analyze the website URL provided: ${urlToAnalyze}. Evaluate its Expertise, Authoritativeness, and Trustworthiness (E-A-T) based on its content, backlinks, and public perception. Return the analysis in a clean JSON format. The JSON object should contain three main keys: 'expertise', 'authoritativeness', and 'trustworthiness'. Each key should have an object as its value containing two sub-keys: 'score' (an integer between 1-100) and 'summary' (a concise, 2-sentence explanation of the score).`;

  const requestBody = {
    contents: [{
      parts: [{ text: promptText }]
    }]
  };
  
  // 3. Make the Secure Server-to-Server API Call
  try {
    const geminiResponse = await axios.post(
      `${geminiApiUrl}?key=${geminiApiKey}`,
      requestBody,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    // 4. Return the Gemini response directly to the frontend
    res.status(200).json(geminiResponse.data);

  } catch (error) {
    console.error('Error calling Gemini API:', error.response ? error.response.data : error.message);
    res.status(502).json({ error: 'Failed to get analysis from AI service.' });
  }
});

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.send('E-A-T Analyzer Backend is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});