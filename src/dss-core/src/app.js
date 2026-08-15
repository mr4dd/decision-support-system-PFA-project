const express = require('express');
const { computeScores } = require('./modules/scoring');

const app = express();

app.use(express.json());

app.post('/api/score', (req, res) => {
  res.json({ status: 'ok', response: computeScores(req.body.responses ?? req.body) });
});

app.post('/api/chat', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `google-ai-api-url?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: req.body }] }]
        })
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));