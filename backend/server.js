require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Proxy endpoint for LLM chat completions
app.post('/chat/completions', async (req, res) => {
  try {
    const { model, messages, temperature = 0, max_tokens = 4096, top_p = 1 } = req.body;

    // Get API configuration from environment variables
    const apiUrl = process.env.LLM_API_URL;
    const apiKey = process.env.LLM_API_KEY;

    if (!apiUrl) {
      return res.status(500).json({ error: 'LLM API URL not configured' });
    }

    // Prepare request to actual LLM API
    const llmRequestBody = {
      model,
      messages,
      temperature,
      max_tokens,
      top_p,
      stream: false
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    // Make request to actual LLM API
    const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(llmRequestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `LLM API error: ${errorText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal proxy error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`LLM Proxy server running on port ${PORT}`);
});