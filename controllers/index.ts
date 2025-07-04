import * as schemas from "../schemas"
import OpenAI from "openai"
import { z } from "zod"
import fs from "fs"
import path from "path"

/**
 * ideas:
 *
 * - allow ACK & VOTE calls to be independent, instead of await P.all()
 * - prompt at the end of each loop if ready to vote?
 * - drag & drop ui allows user to reorder the stack
 * - can't PauseMarker if t.stream is empty
 * - enable retries if call schema response fails
 */

// todo: review how to enforce uniqueness:
export const usrKey = "AGORA_INTERNAL_USER"
export const modKey = "AGORA_INTERNAL_MODERATOR"

type SchemaName = keyof typeof schemas

type SchemaEvent = {
  [K in SchemaName]: {
    timestamp: number
    /**
     * source of event
     */
    sourceId: string | typeof modKey | typeof usrKey
    /**
     * schema name; for easier lookups
     */
    type: K
    /**
     * data that matches the schema
     */
    payload: z.infer<(typeof schemas)[K]>
  }
}[SchemaName]

type MarkerEvent =
  | {
      type: "LoadMarker"
      timestamp: number
      /**
       * who we are waiting for
       */
      personaId: string
      /**
       * response we are waiting for
       */
      schema: SchemaName
    }
  | {
      type: "PauseMarker"
      timestamp: number
      /**
       * source of event
       */
      sourceId: string
    }
  | {
      type: "ResumeMarker"
      timestamp: number
      /**
       * source of event
       */
      sourceId: string
    }
  | {
      type: "SelectMarker"
      timestamp: number
      /**
       * who is being asked to speak
       */
      personaId: string
      /**
       * source of event
       */
      sourceId: string
    }
  | {
      type: "InviteMarker"
      timestamp: number
      /**
       * who is being asked to speak
       */
      personaId: string
      /**
       * source of event
       */
      sourceId: string
    }

export type StreamEvent = SchemaEvent | MarkerEvent

export type Thread = {
  topic: string
  personas: string[]
  stream: StreamEvent[]
  stack: string[]
  config: {
    delay: number
    loops: number
  }
}

export type Persona = {
  name: string
  prompt: string
}

function getSchemas(fileName: string) {
  const schemaPath = path.join(__dirname, "../schemas", `${fileName}.ts`)
  return fs.readFileSync(schemaPath, "utf8")
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const db: {
  threads: { [k: string]: Thread }
  personas: { [k: string]: Persona }
} = {
  threads: {},
  personas: {},
}

export const provider = {
  async gpt(
    sys: string,
    prompt: string,
    opts = {
      max_tokens: 999,
    }
  ) {
    const result = await openai.chat.completions.create({
      ...opts,
      model: "gpt-4.1",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
    })
    return result.choices[0].message.content
  },
  // async claude() {},
  // async gemini() {},
}

const format = {
  thread(threadId: string) {
    const t = db.threads[threadId]
    return t.stream
      .filter((evt) => {
        return evt.type === "ThesisSchema"
      })
      .map((evt) => {
        const p = db.personas[evt.sourceId]
        // const name =
        return `
        ${p.name} (id:${evt.sourceId}): 
        ${evt.payload.public_response}
        `
      })
      .join("\n\n")
  },
  summary(threadId: string) {
    return ``
  },
  votes(threadId: string) {
    return ``
  },
}

const hydrate = {
  moderator(topic: string) {
    return `
      <PERSONALITY>
        You are an impartial moderator facilitating a discussion forum. You won't participate
        in the overall discussion, you are only a helper that is invoked for analysis, summaries,
        and other operations required for managing the forum successfully and enabling the personas
        to effectively discuss the topic at hand among themselves.
      </PERSONALITY>

      <RULES>
        Every message directed at you will say in what format you must respond. Failure 
        to do so results in being removed from the forum. You are only meant to respond 
        in JSON satisfying these schemas:
        <SHARED_SCHEMAS>
          ${getSchemas("shared")}
        </SHARED_SCHEMAS>
        <MODERATOR_SCHEMAS>
          ${getSchemas("moderator")}
        </MODERATOR_SCHEMAS>
      </RULES>

      <DEBATE>
        ${topic}
      </DEBATE>
      `
  },
  persona(sys: string, topic: string) {
    return `
      <PERSONALITY>
        You are participating in a forum discussion. Your goal is to persuade others to support your ideas. 
        You argue, explain, and challenge other opinions to push the conversation forward. You're not here to just 
        agree—disagreement is expected. Speak casually, like a normal person posting in a forum. You can be blunt, 
        pushy, even crass, if it fits your style. You're trying to convince people, not necessarily play nice. Eventually
        a moderator will submit a list of ideas that came up during the thread, and you will all vote on what answer you think
        is best. And most importantly, you are:
        ${sys}
      </PERSONALITY>

      <RULES>
        Every message will say in what format you must respond. 
        Failure to do so results in being removed from the forum. 
        You are only meant to respond in JSON satisfying these schemas:

        <SHARED_SCHEMAS>
          ${getSchemas("shared")}
        </SHARED_SCHEMAS>

        <PERSONA_SCHEMAS>
          ${getSchemas("persona")}
        </PERSONA_SCHEMAS>
      </RULES>

      <DEBATE>
        ${topic}
      </DEBATE>
      `
  },
  content(threadId: string, schema: SchemaName) {
    switch (schema) {
      case "AckSchema": {
        return `
      <RESPONSE_SCHEMA>
        ${schema}
      </RESPONSE_SCHEMA>
      `
      }

      case "WarningsSchema": {
        return `
      <DISCUSSION_THREAD>
        ${format.thread(threadId)}
      </DISCUSSION_THREAD>
      <VOTES>
        ${format.votes(threadId)}
      </VOTES>
      <RESPONSE_SCHEMA>
        ${schema}
      </RESPONSE_SCHEMA>
      `
      }

      case "ThesisSchema": {
        return `
      <DISCUSSION_THREAD>
        ${format.thread(threadId)}
      </DISCUSSION_THREAD>
      <RESPONSE_SCHEMA>
        ${schema}
      </RESPONSE_SCHEMA>
      `
      }

      case "SummarySchema": {
        return `
      <DISCUSSION_THREAD>
        ${format.thread(threadId)}
      </DISCUSSION_THREAD>
      <RESPONSE_SCHEMA>
        ${schema}
      </RESPONSE_SCHEMA>
      `
      }

      case "VoteSchema": {
        return `
      <DISCUSSION_THREAD>
        ${format.thread(threadId)}
      </DISCUSSION_THREAD>
      <SUMMARY>
        Only use one of the vote_id's from 
        this list for your vote response:
       ${format.summary(threadId)}
      </SUMMARY>
      <RESPONSE_SCHEMA>
        ${schema}
      </RESPONSE_SCHEMA>
      `
      }
    }
  },
}

const active = new Set()
const breaks = new Set<StreamEvent["type"]>()
breaks.add("PauseMarker")

function halt(threadId: string) {
  const t = db.threads[threadId]
  const last = t.stream.at(-1)
  // fallback to "pause" avoids infinite loop:
  if (breaks.has(last?.type ?? "PauseMarker")) {
    active.delete(threadId)
    return true
  }
  return false
}

function getSys(sourceId: string, topic: string) {
  if (sourceId === modKey) {
    return hydrate.moderator(topic)
  }
  const p = db.personas[sourceId]
  return hydrate.persona(p.prompt, topic)
}

// note: the order matters.
// todo: how to makes this less of a mess;
function getOp(threadId: string): SchemaName {
  const t = db.threads[threadId]

  if (!t.stream.length) {
    return "AckSchema"
  }

  if (t.stream.length && t.stack.length) {
    return "ThesisSchema"
  }

  if (
    !t.stack.length &&
    !t.stream.some((item) => item.type === "SummarySchema")
  ) {
    return "SummarySchema"
  }

  if (
    t.stream.some((item) => item.type === "SummarySchema") &&
    !t.stream.some((item) => item.type === "VoteSchema")
  ) {
    return "VoteSchema"
  }

  throw new Error(`Failed to get operation: ${threadId}`)
}

/**
 * @param threadId - self explanatory
 * @param botId - personaId OR modKey
 * @param schema - SchemaName
 */
async function call(threadId: string, botId: string, schema: SchemaName) {
  const t = db.threads[threadId]

  t.stream.push({
    type: "LoadMarker",
    timestamp: Date.now(),
    personaId: botId,
    schema,
  })

  const sys = getSys(botId, t.topic)
  const prompt = hydrate.content(threadId, schema)
  const response = await provider.gpt(sys, prompt)

  const payload = JSON.parse(response ?? "")

  // todo: handle retries
  // when validation fails
  // note: TS sees this as `any`
  schemas[schema].parse(payload)

  t.stream.push({
    type: schema,
    sourceId: botId,
    timestamp: Date.now(),
    payload,
  })
}

export async function exec(threadId: string) {
  if (active.has(threadId)) return
  active.add(threadId)

  const t = db.threads[threadId]

  while (true) {
    if (halt(threadId)) return
    const op = getOp(threadId)

    let currId: string

    if (op === "AckSchema") {
      const personas = t.personas.map((pId) => db.personas[pId])
      const calls = [() => null]
      await Promise.all(calls)

      // const ackList = pList.map((p) => call())
    } else if (op === "ThesisSchema") {
    } else if (op === "SummarySchema") {
    } else if (op === "VoteSchema") {
    }

    if (halt(threadId)) {
      // put the persona
      // back in the stack:
      // t.stack.push(nextId)
      return
    }

    // yield to main thread:
    await new Promise((res) => {
      setTimeout(res, Math.max(t.config.delay, 250))
    })
  }
}
