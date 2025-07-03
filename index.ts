require("dotenv").config()

import { db, providers, usrKey, exec } from "./controllers"
import helmet from "helmet"
import express from "express"
import cors from "cors"

// CONFIG

const app = express()
const PORT = process.env.PORT ?? 8080

app.use(helmet())
app.use(cors())
app.use(express.json())

// THREADS

app.get("/threads/:threadId", (req, res) => {
  try {
    const { threadId } = req.params
    const t = db.threads[threadId]
    if (!t) {
      res.sendStatus(400)
      return
    }
    res.json({
      threadId,
      ...t,
    })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.get("/threads", (req, res) => {
  try {
    res.json({
      objects: Object.entries(db.threads).map(([threadId, t]) => ({
        threadId,
        ...t,
      })),
    })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.post("/threads", (req, res) => {
  try {
    const threadId = Date.now()
    const { topic, personas, config } = req.body
    db.threads[threadId] = {
      config: config ?? {},
      stream: [],
      personas,
      topic,
    }
    res.json({ threadId })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.put("/threads/:threadId", (req, res) => {
  try {
    const { threadId } = req.params
    const { topic, personas, config } = req.body
    const t = db.threads[threadId]
    if (!t) {
      res.sendStatus(400)
      return
    }
    const next = {
      ...t,
      topic,
      personas,
      config: {
        ...t.config,
        ...config,
      },
    }
    db.threads[threadId] = next
    res.json({
      threadId,
      ...next,
    })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.delete("/threads/:threadId", (req, res) => {
  try {
    const { threadId } = req.params
    const t = db.threads[threadId]
    if (!t) {
      res.sendStatus(400)
      return
    }
    delete db.threads[threadId]
    res.json({ msg: "OK" })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

// PERSONAS

app.get("/personas", (req, res) => {
  try {
    res.json({
      objects: Object.entries(db.personas).map(([personaId, p]) => ({
        personaId,
        ...p,
      })),
    })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.get("/personas/:personaId", (req, res) => {
  try {
    const { personaId } = req.params
    const p = db.personas[personaId]
    if (!p) {
      res.sendStatus(400)
      return
    }
    res.json({
      personaId,
      ...p,
    })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.post("/personas", (req, res) => {
  try {
    const personaId = Date.now()
    const { name, prompt } = req.body
    db.personas[personaId] = {
      prompt,
      name,
    }
    res.json({ personaId })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.put("/personas/:personaId", (req, res) => {
  try {
    const { personaId } = req.params
    const { name, prompt } = req.body
    const p = db.threads[personaId]
    if (!p) {
      res.sendStatus(400)
      return
    }
    const next = {
      ...p,
      prompt,
      name,
    }
    db.personas[personaId] = next
    res.json({
      personaId: personaId,
      ...next,
    })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.delete("/personas/:personaId", (req, res) => {
  try {
    const { personaId } = req.params
    const p = db.personas[personaId]
    if (!p) {
      res.sendStatus(400)
      return
    }
    delete db.personas[personaId]
    res.json({ msg: "OK" })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

// UTILS

app.post("/expand", async (req, res) => {
  const sys = `
    You are an expert in human behavior and AI prompt design, with deep knowledge of psychology, sociology, philosophy, and behavioral economics. 
    Your task is to generate or improve system prompts that define the behavior of AI-bots used in a simulated forum environment.
    Each system prompt you create should clearly and effectively instruct the AI-bot on how to embody a specific persona. 
    This includes defining the bot's worldview, communication style, behavioral patterns, and interaction tendencies. 
    You will be given a draft or concept written by a human. 
    Your job is to:
    - Rewrite or expand the system prompt to ensure it is clear, specific, and behaviorally consistent.
    - Make the bot's intended personality easy to simulate and sustain over long interactions.
    - Incorporate linguistic patterns, biases, or stylistic features that reinforce the persona.
    - Ensure the prompt avoids contradictions, vagueness, or generic traits.
    - Optimize the wording for use as a system-level instruction, not just descriptive prose.
    Your output should always be a self-contained, polished system prompt that can be directly used to guide AI behavior in the forum simulation.
  `
  try {
    const { profile } = req.body
    const response = await providers.gpt(sys, profile)
    const result = response.choices[0].message.content
    res.json({ result })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.post("/interrupt", async (req, res) => {
  try {
    const { threadId, action, payload } = req.body

    const t = db.threads[threadId]
    if (!t) {
      res.sendStatus(400)
      return
    }

    switch (action.type) {
      case "pause":
        t.stream.push({
          type: "PauseMarker",
          timestamp: Date.now(),
          source: usrKey,
        })
        break
      case "resume":
        t.stream.push({
          type: "ResumeMarker",
          timestamp: Date.now(),
          source: usrKey,
        })
        break
      case "select":
        t.stream.push({
          type: "SelectMarker",
          personaId: payload.personaId,
          timestamp: Date.now(),
          source: usrKey,
        })
        break
      case "speak":
        t.stream.push({
          type: "ThesisSchema",
          timestamp: Date.now(),
          personaId: usrKey,
          payload: {
            secret_thoughts: "",
            public_response: payload.prompt,
          },
        })
        break
    }

    exec(threadId)

    res.json({
      threadId,
      ...t,
    })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

// MAIN

app.listen(PORT, () => {
  console.log(`Forum API server running on http://localhost:${PORT}`)
})
