const axios = require('axios');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // --- Main Logic ---
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API key is not configured.");
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // Parse the incoming data from Shopify's proxy
    const body = JSON.parse(event.body);
    const websiteToAnalyze = body.url;
    if (!websiteToAnalyze) {
      throw new Error("No URL was provided.");
    }

    const prompt = `Analyze the E-A-T of the website: ${websiteToAnalyze}. Provide a score from 1-100 and a list of 5 concise, actionable suggestions for improvement. Output must be in a clean JSON format with "score" and "suggestions" as keys.`;

    const geminiResponse = await axios.post(GEMINI_API_URL, {
      contents: [{ parts: [{ text: prompt }] }]
    });

    const responseText = geminiResponse.data.candidates[0].content.parts[0].text;
    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    // Return the successful response
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: cleanedText,
    };

  } catch (error) {
    console.error("Error in Netlify function:", error.message);
    // Return a valid JSON error message
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "A backend error occurred: " + error.message }),
    };
  }
};