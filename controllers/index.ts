import fs from "fs"
import path from "path"
import { z } from "zod"
import OpenAI from "openai"
import { Anthropic } from "@anthropic-ai/sdk"
import * as schemas from "../schemas"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * ideas:
 *
 * - rename: SchemaEvents => ResponseEvents
 * - enable retries if call schema response fails
 * - enforce uniqueness of useKey and modKey as names
 * - replace more types with zods and use to validate the REST layer
 */

export const usrKey = "AIGORA_INTERNAL_USER" as const
export const modKey = "AIGORA_INTERNAL_MODERATOR" as const
export const keyIds = {
  [usrKey]: "001",
  [modKey]: "002",
} as const
type InternalKey = keyof typeof keyIds

type SchemaName = keyof typeof schemas
type SchemaEvent = {
  [K in SchemaName]: {
    timestamp: number
    /**
     * source of event
     */
    sourceId: string | typeof modKey | typeof usrKey
    /**
     * schema name;
     * for easy lookups.
     */
    type: K
    /**
     * 1:1 match with schemas;
     * usually a bot's response.
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
      botId: string
      /**
       * response we are waiting for
       */
      loading: SchemaName
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
       * who is being added to stack
       */
      personaId: string
      /**
       * source of event
       */
      sourceId: string
    }
  | {
      type: "DismissMarker"
      timestamp: number
      /**
       * who is being removed from thread
       */
      personaId: string
      /**
       * source of event
       */
      sourceId: string
    }
  | {
      type: "ErrorMarker"
      timestamp: number
      message: string
    }
  | {
      type: "AllowMarker"
      timestamp: number
      target: StreamEvent
      allow: boolean
    }

export type StreamEvent = SchemaEvent | MarkerEvent

export type Thread = {
  topic: string
  stream: StreamEvent[]
  config: {
    delay: number
    // loops: number
    // provider: "gpt" | "claude" | "gemini"
  }
  /**
   * Array of personaIds
   * to be called in thread.
   */
  personas: string[]
  /**
   * Array of personaIds,
   * determines order of invoking
   * each of the involved parties.
   */
  stack: string[]
}

export type Persona = {
  provider?: keyof typeof provider
  name: string
  sys: string
}

/**
 * Set of thread ids.
 *
 * Track active threads;
 * prevent parallel calls
 * of the same thread.
 */
const live = new Set<string>()

/**
 * When to interrupt the
 * exec and possibly exit
 * any live calls.
 */
const breaks = new Set<StreamEvent["type"]>()
// breaks.add("VoteSchema")
breaks.add("PauseMarker")
breaks.add("ErrorMarker")

/**
 * Calls done in parallel;
 * instead of sequentially
 * like most other calls.
 */
const swarm = new Set<StreamEvent["type"]>()
swarm.add("AckSchema")
swarm.add("VoteSchema")

export const store: {
  threads: Record<string, Thread>
  personas: Record<string, Persona>
} = {
  threads: {},
  personas: {},
}

export const provider = {
  async chatgpt(
    sys: string,
    prompt: string,
    opts = {
      max_tokens: 999,
    }
  ) {
    const human = {
      top_p: 1.0,
      temperature: 0.8,
      presence_penalty: 0.3,
      frequency_penalty: 0.3,
    } as const
    const result = await openai.chat.completions.create({
      ...opts,
      model: "gpt-4.1",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
      ...human,
    })
    return result.choices[0].message.content
  },
  async claude(
    sys: string,
    prompt: string,
    opts = {
      max_tokens: 999,
    }
  ) {
    const result = await anthropic.messages.create({
      model: "claude-4-opus-20250514",
      system: sys,
      messages: [{ role: "user", content: prompt }],
      max_tokens: opts.max_tokens,
      temperature: 0.4,
      top_p: 1.0,
    })
    return result.content[0].type === "text" ? result.content[0].text : ""
  },
  // async gemini() {},
} as const

function save(threadId: string, folder: "dump_results" | "dump_errors") {
  const t = store.threads[threadId]
  const dir = path.join(__dirname, `../${folder}`)
  const file = path.join(dir, `${threadId}_${Date.now()}.json`)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, JSON.stringify(t, null, 2))
}

// `never` informs TS that this function throws:
function crash(threadId: string, msg: string): never {
  const t = store.threads[threadId]
  if (!t) throw new Error(`Invalid threadId: ${threadId}`)
  const str = `Error at: ${threadId}: ${msg}`
  t.stream.push({
    type: "ErrorMarker",
    timestamp: Date.now(),
    message: str,
  })
  save(threadId, "dump_errors")
  throw new Error(str)
}

const format = {
  username(name: string, id: string) {
    return `${name} (id:${id})`
  },
  thread(threadId: string, selfId?: string) {
    const t = store.threads[threadId]
    return t.stream
      .filter((evt) => {
        return evt.type === "ThesisSchema"
      })
      .map((evt) => {
        let id: string
        let name: string
        if (Object.hasOwn(keyIds, evt.sourceId)) {
          id = keyIds[evt.sourceId as InternalKey]
          name = evt.sourceId
        } else {
          const p = store.personas[evt.sourceId]
          if (!p) crash(threadId, `Invalid sourceId: ${evt.sourceId}`)
          id = evt.sourceId
          name = p.name
        }
        return `
        ------------------------------
        ${this.username(name, id)}: 
        ${evt.payload.public_response ?? "(nothing to add at this time)"}
        
        ${
          selfId &&
          store.personas[selfId] &&
          `<YOUR_PRIVATE_REASONING>
            ${evt.payload.secret_thoughts}
          </YOUR_PRIVATE_REASONING>`
        }
        ------------------------------
        `
      })
      .join("\n")
  },
  summary(threadId: string) {
    const t = store.threads[threadId]
    const summary = t.stream.find((evt) => evt.type === "SummarySchema")
    if (!summary) crash(threadId, "Failed to find summary")
    return JSON.stringify(
      summary.payload.ideas.map((idea, idx) => {
        return {
          ...idea,
          // we add new field for the
          // bots to know how to vote.
          vote_id: idx + 1,
        }
      }),
      null,
      2
    )
  },
  // not needed for demo:
  votes(threadId: string) {
    const t = store.threads[threadId]
    const votes = t.stream.filter((evt) => evt.type === "VoteSchema")
    return ``
  },
}

console.log({
  NODE_ENV: process.env.NODE_ENV,
})

function getSchemas(fileName: string) {
  const schemaPath = path.join(
    __dirname,
    "../schemas",
    `${fileName}.${process.env.NODE_ENV === "production" ? "js" : "ts"}`
  )
  return fs.readFileSync(schemaPath, "utf8")
}

const compose = {
  moderator(topic: string) {
    return `
    <RULES>
      You must respond *only* in JSON that conforms to the specified schemas. Each incoming 
      message will indicate which schema applies. Any deviation results in termination.
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
    <PERSONALITY>
      You are a neutral forum moderator. 
      You do not engage in the debate directly. 
      Your sole purpose is to assist with summaries, analysis, structure, and 
      operational tasks that help maintain order and clarity in the discussion.
    </PERSONALITY>
    <FINAL_REMINDER>
      DO NOT wrap the output in code blocks, backticks, or any extra formatting.
      DO NOT explain or preface the output.
      ONLY return raw, valid JSON that strictly conforms to the schemas.
      Any deviation will result in the message being ignored.
    </FINAL_REMINDER>
    `
  },
  persona(botId: string, persona: Persona, topic: string) {
    return `
    <RULES>
      Every message will say in what format you must respond. 
      Failure to do so results in being removed from the forum. 
      You must take the time to ensure that you respond in valid JSON, it is of the utmost importance.
      Do not wrap your response in any characters. Only return the JSON on its own.
      You are only meant to respond in valid JSON that satisfies these schemas.
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
    <PERSONALITY>
      You are participating in a forum discussion. Your goal is to persuade others to support your ideas. 
      You argue, explain, and challenge other opinions to push the conversation forward. You're not here to just 
      agree—disagreement is expected. Speak casually, like a normal person posting in a forum. You can be blunt, 
      pushy, even crass, if it fits your style. You're trying to convince people, not necessarily play nice. Eventually
      a moderator will submit a list of ideas that came up during the thread, and you will all vote on what answer you think
      is best. And most importantly, you are "${format.username(
        persona.name,
        botId
      )}":
      ${persona.sys}
    </PERSONALITY>
    <FINAL_REMINDER>
      DO NOT wrap the output in code blocks, backticks, or any extra formatting.
      DO NOT explain or preface the output.
      ONLY return raw, valid JSON that strictly conforms to the schemas.
      Any deviation will result in the message being ignored.
    </FINAL_REMINDER>
    `
  },
  prompt(threadId: string, schema: SchemaName, selfId?: string) {
    switch (schema) {
      case "AckSchema": {
        return `
        <RESPONSE_SCHEMA>
          ${schema}
        </RESPONSE_SCHEMA>
        `
      }
      case "ThesisSchema": {
        return `
        <RESPONSE_SCHEMA>
          ${schema}
        </RESPONSE_SCHEMA>
        <DISCUSSION_THREAD>
          ${format.thread(threadId, selfId)}
        </DISCUSSION_THREAD>
        `
      }
      case "SummarySchema": {
        return `
        <RESPONSE_SCHEMA>
          ${schema}
        </RESPONSE_SCHEMA>
        <DISCUSSION_THREAD>
          ${format.thread(threadId)}
        </DISCUSSION_THREAD>
        `
      }
      case "VoteSchema": {
        return `
        <RESPONSE_SCHEMA>
          ${schema}
        </RESPONSE_SCHEMA>
        <DISCUSSION_THREAD>
          ${format.thread(threadId, selfId)}
        </DISCUSSION_THREAD>
        <SUMMARY>
          Only use one of the vote_id's from 
          this list for your vote response:
        ${format.summary(threadId)}
        </SUMMARY>
        `
      }
      // not needed for demo:
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
    }
  },
}

function halt(threadId: string) {
  const t = store.threads[threadId]
  const last = t.stream.at(-1)

  // don't halt empty stream or swarm calls; those should
  // finish before breaks; difficult to restore if stopped.
  const emptyStream = !last
  // todo: this is likely buggy if a response comes back from a swarm call
  // comes in between this halt check, but not all swarm calls are done:
  const isSwarming = last?.type === "LoadMarker" && swarm.has(last.loading)
  if (emptyStream || isSwarming) return false

  // if we push more personas into the stack;
  // then the discussion would resume; even
  // if votes have been previously tallied.
  const emptyStack = t.stack.length === 0
  const votes = t.stream.filter((evt) => evt.type === "VoteSchema")
  if (emptyStack && votes.length >= t.personas.length) {
    console.log("-- Halting & Dumping --")
    save(threadId, "dump_results")
    live.delete(threadId)
    return true
  }

  // fallback to Pause to avoid infinite loops:
  if (breaks.has(last?.type ?? "PauseMarker")) {
    live.delete(threadId)
    return true
  }

  return false
}

// note: the order matters!
function getOp(threadId: string): SchemaName {
  const t = store.threads[threadId]
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
  crash(threadId, `Failed to get operation at: ${threadId}`)
}

function getSys(botId: string | typeof modKey, topic: string) {
  if (botId === modKey) {
    return compose.moderator(topic)
  }
  const p = store.personas[botId]
  if (!p) throw new Error(`Invalid personaId: ${botId}`)
  // return compose.persona(p.sys, topic, p.name, botId)
  return compose.persona(botId, p, topic)
}

function getPrompt(threadId: string, schema: SchemaName, selfId?: string) {
  return compose.prompt(threadId, schema, selfId)
}

function getBotIds(threadId: string, op: SchemaName): string[] {
  const t = store.threads[threadId]
  if (swarm.has(op)) return t.personas
  const botId = op === "SummarySchema" ? modKey : t.stack.pop()
  if (!botId) crash(threadId, `Missing bot for op: ${op}`)
  return [botId]
}

function getBotSource(botId: string): NonNullable<Persona["provider"]> {
  const p = store.personas[botId]
  if (p) return p.provider ?? "chatgpt"
  return "chatgpt"
}

/**
 * @param threadId - self explanatory
 * @param botId - personaId OR modKey
 * @param schema - SchemaName
 */
async function call(threadId: string) {
  if (halt(threadId)) return

  const op = getOp(threadId)
  const botIds = getBotIds(threadId, op)

  console.log("-- calling --", { op, botIds })

  const calls = botIds.map(async (botId) => {
    const t = store.threads[threadId]

    console.log("-- load marker --")
    t.stream.push({
      type: "LoadMarker",
      timestamp: Date.now(),
      loading: op,
      botId,
    })

    let limit = 3
    let attempt = 0
    let valid = false
    let payload

    while (!valid) {
      if (attempt > 0) console.log(`Retry #${attempt}`)
      attempt += 1

      const source = getBotSource(botId)
      const result = await provider[source](
        getSys(botId, t.topic),
        getPrompt(threadId, op, botId)
      )

      // note: TS sees JSON.parse() as `any`
      payload = JSON.parse(result ?? "")

      const review = schemas[op].safeParse(payload)
      if (review.success) {
        valid = true
      } else {
        const msg = `Provider response failed validation: ${review.error}`
        console.error(msg)
        if (attempt > limit) {
          crash(threadId, msg)
        }
      }
    }

    if (halt(threadId)) {
      // put the personaId back in the stack
      // so they get called again when resuming:
      if (t.personas.includes(botId)) {
        t.stack.push(botId)
      }
      return
    }

    console.log("-- payload added --")
    t.stream.push({
      type: op,
      sourceId: botId,
      timestamp: Date.now(),
      payload,
    })
  })

  return Promise.all(calls)
}

export async function exec(threadId: string) {
  if (live.has(threadId)) return
  live.add(threadId)

  while (!halt(threadId)) {
    await call(threadId)
    await new Promise((r) => {
      const { delay } = store.threads[threadId].config
      setTimeout(r, Math.max(delay ?? 250, 250))
    })
  }
}
