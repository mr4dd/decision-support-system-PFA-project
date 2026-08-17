const express = require('express');
const { computeScores } = require('./modules/scoring');
require('dotenv').config()
const { chat, extract } = require('./modules/AI');


const app = express();

app.use(express.json());

app.post('/api/score', (req, res) => {
  res.json({ status: 'ok', response: computeScores(req.body.responses ?? req.body) });
});

app.post('/api/chat', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const response = await chat(req.body.message);
    res.json({text: response})
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const extraction_schema = {

}
const recommendation_schema = {

}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));