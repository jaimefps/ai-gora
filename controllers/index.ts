import * as schemas from "../schemas"
import OpenAI from "openai"
import { z } from "zod"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// todo: how to guarantee uniqueness:
export const usrKey = "USER" as const
export const modKey = "MODERATOR" as const

type SchemaName = keyof typeof schemas

type SchemaEvent = {
  [K in SchemaName]: {
    personaId: string | typeof modKey | typeof usrKey
    payload: z.infer<(typeof schemas)[K]>
    type: K // easier lookups
    timestamp: number
  }
}[SchemaName]

type MarkerEvent =
  | {
      type: "LoadMarker"
      target: SchemaName
      timestamp: number
      personaId: string
    }
  | {
      type: "PauseMarker"
      timestamp: number
      source: string
    }
  | {
      type: "ResumeMarker"
      timestamp: number
      source: string
    }
  | {
      type: "SelectMarker"
      personaId: number
      timestamp: number
      source: string
    }

export type StreamEvent = SchemaEvent | MarkerEvent

export type Thread = {
  topic: string
  personas: Persona[]
  stream: StreamEvent[]
  config: {}
}

export type Persona = {
  name: string
  prompt: string
}

export const db: {
  threads: { [k: string]: Thread }
  personas: { [k: string]: Persona }
} = {
  threads: {},
  personas: {},
}

export const providers = {
  async gpt(
    sys: string,
    prompt: string,
    opts = {
      model: "gpt-4.1",
      max_tokens: 999,
    }
  ) {
    const result = await openai.chat.completions.create({
      ...opts,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
    })
    return result
  },
  async claude() {},
  async gemini() {},
}

// track active threads:
const upSet = new Set()

// track conditions to halt thread:
const stoppers = new Set<StreamEvent["type"]>()
stoppers.add("PauseMarker")

function halt(threadId: string) {
  const t = db.threads[threadId]
  const last = t.stream.at(-1)
  // fallback to pause avoids infinite loop:
  if (stoppers.has(last?.type ?? "PauseMarker")) {
    upSet.delete(threadId)
    return true
  }
  return false
}

export async function exec(threadId: string) {
  if (upSet.has(threadId)) return
  upSet.add(threadId)

  while (true) {
    if (halt(threadId)) {
      return
    }

    const t = db.threads[threadId]

    // bookmark

    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}
