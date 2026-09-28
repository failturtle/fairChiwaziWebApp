import express from 'express'
import cors from 'cors'
import multer from 'multer'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const client = new Anthropic()

app.use(cors({ origin: ['http://localhost:5173', 'https://fairchiwazi.lol'] }))

app.post('/api/parse-receipt', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No receipt image provided' })
    return
  }

  const base64 = req.file.buffer.toString('base64')
  const mediaType = (req.file.mimetype || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: 'Extract all line items from this receipt. Return ONLY a JSON array where each element has "name" (string) and "cost" (number in dollars, no currency symbol). Include every item with a price. Do not include tax, tips, or totals. Example: [{"name":"Burger","cost":12.99},{"name":"Fries","cost":4.50}]',
            },
          ],
        },
      ],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      res.status(500).json({ error: 'No text response from AI' })
      return
    }

    let text = textBlock.text.trim()
    // Strip markdown fences if present
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const items = JSON.parse(text)
    res.json(items)
  } catch (err) {
    console.error('Receipt parse error:', err)
    res.status(500).json({ error: 'Failed to parse receipt' })
  }
})

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
