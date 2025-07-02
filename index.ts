require("dotenv").config()

import { db, Thread, Persona } from "./controllers"
import helmet from "helmet"
import express from "express"
import cors from "cors"
// import "./demo"

/*************
 * config
 *************/

const app = express()
const PORT = process.env.PORT ?? 8080

app.use(helmet())
app.use(cors())
app.use(express.json())

/*************
 * threads
 *************/
app.get("/threads/:threadId", (req, res) => {
  try {
    const { threadId } = req.params
    const t = db.threads[Number(threadId)]
    if (t) {
      res.json({
        threadId,
        ...t,
      })
    } else {
      res.sendStatus(400)
    }
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.get("/threads", (req, res) => {
  try {
    res.json({
      objects: Object.entries(db.threads).map(([id, t]) => ({
        threadId: Number(id),
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
    const t = db.threads[Number(threadId)]
    db.threads[Number(threadId)] = {
      ...t,
      topic,
      personas,
      config: {
        ...t.config,
        ...config,
      },
    }
    res.json({ msg: "OK" })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.delete("/threads/:threadId", (req, res) => {
  try {
    const { threadId } = req.params
    const t = db.threads[Number(threadId)]
    if (t) {
      delete db.threads[Number(threadId)]
      res.json({ msg: "OK" })
    } else {
      res.sendStatus(400)
    }
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

/*************
 * personas
 *************/
app.get("/personas", (req, res) => {
  try {
    res.json({
      objects: Object.entries(db.personas).map(([id, p]) => ({
        personaId: Number(id),
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
    const p = db.personas[Number(personaId)]
    if (p) {
      res.json({
        personaId,
        ...p,
      })
    } else {
      res.sendStatus(400)
    }
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
    const t = db.threads[Number(personaId)]
    db.personas[Number(personaId)] = {
      prompt,
      name,
    }
    res.json({ msg: "OK" })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.delete("/personas/:personaId", (req, res) => {
  try {
    const { personaId } = req.params
    const p = db.personas[Number(personaId)]
    if (p) {
      delete db.personas[Number(personaId)]
      res.json({ msg: "OK" })
    } else {
      res.sendStatus(400)
    }
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

/*************
 * run
 *************/

app.listen(PORT, () => {
  console.log(`Forum API server running on http://localhost:${PORT}`)
})
