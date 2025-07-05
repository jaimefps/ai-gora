require("dotenv").config()

import { store, provider, usrKey, exec, Persona } from "./controllers"
import shuffle from "lodash.shuffle"
import helmet from "helmet"
import express from "express"
import cors from "cors"

const app = express()
const PORT = process.env.PORT ?? 8080

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get("/threads", (req, res) => {
  try {
    res.json({
      objects: Object.entries(store.threads).map(([threadId, t]) => ({
        threadId,
        ...t,
      })),
    })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.get("/threads/:threadId", (req, res) => {
  try {
    const { threadId } = req.params
    const t = store.threads[threadId]
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

app.post("/threads", (req, res) => {
  try {
    const threadId = String(Date.now())
    // todo: allow for config updates:
    const { topic, personas } = req.body

    // todo: use config.loops
    // to set length of stream.
    const order = shuffle(personas)
    const stack = [...order, ...order]

    store.threads[threadId] = {
      topic,
      personas,
      stream: [],
      stack,
      config: {
        delay: 250,
        //...(config as Partial<(typeof store.threads)[string]["config"]>),
      },
    }

    exec(threadId)

    res.json({
      threadId,
    })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

/**
 * Maybe only allow updates to
 * via the `/intervene` endpoint.
 *
 */
// app.put("/threads/:threadId", (req, res) => {
//   try {
//     const { threadId } = req.params
//     const { topic, personas, config } = req.body
//     const t = store.threads[threadId]
//     if (!t) {
//       res.sendStatus(400)
//       return
//     }
//     const next = {
//       ...t,
//       topic: topic ?? t.topic,
//       // risky to allow persona updates here;
//       // only `/intervene` should do this.
//       personas: personas ?? t.personas,
//       config: {
//         ...t.config,
//         delay: config?.delay ?? t.config.delay,
//       },
//     }
//     store.threads[threadId] = next
//     res.json({
//       threadId,
//       ...next,
//     })
//   } catch (err) {
//     console.error(err)
//     res.sendStatus(500)
//   }
// })

/**
 * Eventually enable,
 * not necessary for demo.
 *
 */
// app.delete("/threads/:threadId", (req, res) => {
//   try {
//     const { threadId } = req.params
//     const t = store.threads[threadId]
//     if (!t) {
//       res.sendStatus(400)
//       return
//     }
//     delete store.threads[threadId]
//     res.json({ msg: "OK" })
//   } catch (err) {
//     console.error(err)
//     res.sendStatus(500)
//   }
// })

// PERSONAS

app.get("/personas", (req, res) => {
  try {
    res.json({
      objects: Object.entries(store.personas).map(([personaId, p]) => ({
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
    const p = store.personas[personaId]
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
    const personaId = String(Date.now())
    const { name, sys } = req.body
    store.personas[personaId] = {
      name,
      sys,
    }
    res.json({ personaId })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

/**
 * Eventually enable,
 * not necessary for demo.
 *
 */
// app.put("/personas/:personaId", (req, res) => {
//   try {
//     const { personaId } = req.params
//     const { name, sys } = req.body
//     const p = store.personas[personaId]
//     if (!p) {
//       res.sendStatus(400)
//       return
//     }
//     const next = {
//       ...p,
//       name: name ?? p.name,
//       sys: sys ?? p.sys,
//     }
//     store.personas[personaId] = next
//     res.json({
//       personaId: personaId,
//       ...next,
//     })
//   } catch (err) {
//     console.error(err)
//     res.sendStatus(500)
//   }
// })

/**
 * Eventually enable,
 * not necessary for demo.
 *
 */
// app.delete("/personas/:personaId", (req, res) => {
//   try {
//     const { personaId } = req.params
//     const p = store.personas[personaId]
//     if (!p) {
//       res.sendStatus(400)
//       return
//     }
//     delete store.personas[personaId]
//     res.json({ msg: "OK" })
//   } catch (err) {
//     console.error(err)
//     res.sendStatus(500)
//   }
// })

app.post("/expand/persona", async (req, res) => {
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
    Just respond with the text for the prompt, don't begin by saying "System Prompt:"
  `
  try {
    const { profile } = req.body
    const result = await provider.gpt(sys, profile, {
      max_tokens: 999,
    })
    res.json({ result })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.post("/expand/topic", async (req, res) => {
  const sys = `
    You are an expert in question refinement and discussion design, with deep knowledge in critical thinking, epistemology, rhetoric, and intellectual discourse.
    Your task is to expand and enhance user-submitted questions or discussion topics to make them more precise, thought-provoking, and intellectually engaging.
    Each expanded version you produce should help the user articulate a clearer, more nuanced, or more productive inquiry.
    You will be given a raw or informal question or topic written by a human.
    Your job is to:
    - Clarify ambiguous phrasing or vague intentions behind the question.
    - Surface underlying assumptions, motivations, or implications that can deepen the inquiry.
    - Suggest more specific or insightful framings of the topic.
    - Preserve the user's core intent while offering higher-resolution versions of their question.
    - Offer alternate angles, rephrasings, or follow-up directions that enrich the discussion potential.
    - Avoid generic academic verbosity; focus on clarity, depth, and conversational utility.
    Your output should be a self-contained, improved version of the user's question or topic—polished, purposeful, and ready to prompt a more meaningful exchange.
  `
  try {
    const { topic } = req.body
    const result = await provider.gpt(sys, topic, {
      max_tokens: 999,
    })
    res.json({ result })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

app.post("/intervene", async (req, res) => {
  try {
    const { threadId, action } = req.body
    const t = store.threads[threadId]
    if (!t) {
      res.sendStatus(400)
      return
    }
    /**
     * todo: validate that the user can intervene; require
     * a Pause at(-1) for any interventions to be valid:
     */
    switch (action.type) {
      // todo: do not allow Pause in
      // the middle of a swarm call:
      case "pause":
        t.stream.push({
          type: "PauseMarker",
          timestamp: Date.now(),
          sourceId: usrKey,
        })
        break
      // todo: dos this pop the
      // Pause from the stream?
      case "resume":
        t.stream.push({
          type: "ResumeMarker",
          timestamp: Date.now(),
          sourceId: usrKey,
        })
        break
      case "speak":
        t.stream.push({
          type: "ThesisSchema",
          timestamp: Date.now(),
          sourceId: usrKey,
          payload: {
            secret_thoughts: action?.payload.notes,
            public_response: action?.payload.opinion,
          },
        })
        break
      // todo: i need to think more about this case;
      // unclear how the stack of bots is impacted,
      // likely regenerate the stack:
      case "select":
        t.stream.push({
          type: "SelectMarker",
          timestamp: Date.now(),
          personaId: action?.payload.personaId,
          sourceId: usrKey,
        })
        break
      // todo: i need to think more about this case;
      // unclear how the stack of bots is impacted,
      // likely regenerate the stack:
      case "invite":
        t.stream.push({
          type: "SelectMarker",
          timestamp: Date.now(),
          personaId: action?.payload.personaId,
          sourceId: usrKey,
        })
      // todo: i need to think more about this case;
      // unclear how the stack of bots is impacted,
      // likely regenerate the stack:
      case "dismiss":
        t.stream.push({
          type: "SelectMarker",
          timestamp: Date.now(),
          personaId: action?.payload.personaId,
          sourceId: usrKey,
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

app.listen(PORT, () => {
  console.log(`Forum API server running on http://localhost:${PORT}`)
})
