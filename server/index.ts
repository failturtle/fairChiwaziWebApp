import express from 'express'
import cors from 'cors'
import multer from 'multer'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { initDb, recordPersonAdded, recordReceipt, recordSpin, RECEIPTS_DIR } from './db'

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const client = new Anthropic()

app.use(cors({ origin: ['http://localhost:5173', 'https://fairchiwazi.lol'] }))
app.use(express.json({ limit: '200kb' }))

// Trimmed string or null; keeps junk and oversized values out of the DB
function str(value: unknown, max = 200): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
}

app.post('/api/parse-receipt', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No receipt image provided' })
    return
  }

  const base64 = req.file.buffer.toString('base64')
  const mediaType = (req.file.mimetype || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  // Keep every uploaded receipt, even ones that fail to parse
  const receiptId = crypto.randomUUID()
  const filename = `${receiptId}.${EXTENSIONS[mediaType] ?? 'img'}`
  let parsedItems: unknown = null
  try {
    fs.writeFileSync(path.join(RECEIPTS_DIR, filename), req.file.buffer)
  } catch (err) {
    console.error('Could not save receipt image:', err)
  }

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
    parsedItems = items
    console.log(`[receipt] id=${receiptId} items=${Array.isArray(items) ? items.length : '?'}`)
    res.json(items)
  } catch (err) {
    console.error('Receipt parse error:', err)
    res.status(500).json({ error: 'Failed to parse receipt' })
  } finally {
    try {
      recordReceipt({
        id: receiptId,
        clientId: str(req.body?.clientId),
        filename,
        mimeType: mediaType,
        sizeBytes: req.file.size,
        items: parsedItems,
      })
    } catch (err) {
      console.error('Could not record receipt:', err)
    }
  }
})

app.post('/api/events/person-added', (req, res) => {
  const name = str(req.body?.name, 100)
  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const clientId = str(req.body?.clientId)
  console.log(`[person-added] client=${clientId ?? '-'} name=${JSON.stringify(name)}`)
  try {
    recordPersonAdded(clientId, name)
  } catch (err) {
    console.error('Could not record person-added:', err)
  }
  res.status(204).end()
})

app.post('/api/spins', (req, res) => {
  const { people, items } = req.body ?? {}
  const winnerId = str(req.body?.winnerId)
  const winnerName = str(req.body?.winnerName, 100)
  if (!Array.isArray(people) || !Array.isArray(items) || !winnerId || !winnerName) {
    res.status(400).json({ error: 'people, items, winnerId and winnerName are required' })
    return
  }
  const clientId = str(req.body?.clientId)
  // Whole bill the winner pays: every item, assigned or not
  const total = Math.round(
    items.reduce((sum: number, item: { cost?: unknown }) => sum + (typeof item?.cost === 'number' ? item.cost : 0), 0) * 100
  ) / 100
  console.log(`[spin] client=${clientId ?? '-'} people=${people.length} items=${items.length} total=${total} winner=${JSON.stringify(winnerName)}`)
  try {
    recordSpin({ clientId, people, items, winnerId, winnerName, total })
  } catch (err) {
    console.error('Could not record spin:', err)
  }
  res.status(204).end()
})

const port = process.env.PORT || 3001
initDb().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
})
