import fs from "fs"
import path from "path"
import { z } from "zod"
import OpenAI from "openai"
import * as schemas from "../schemas"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * ideas:
 *
 * - rename: SchemaEvents => ResponseEvents
 * - enable retries if call schema response fails
 * - enforce uniqueness of useKey and modKey as names
 * - replace more types with zods and use to validate the REST layer
 * - prompt at the end of each loop if ready to vote? (could us a marker)
 * - drag & drop ui allows user to reorder the speakers stack
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

function saveThread(threadId: string, folder: "dump_results" | "dump_errors") {
  const t = store.threads[threadId]
  const dir = path.join(__dirname, `../${folder}`)
  const file = path.join(dir, `${Date.now()}.json`)
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
  saveThread(threadId, "dump_errors")
  throw new Error(str)
}

const format = {
  thread(threadId: string) {
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
        ${name} (id:${id}): 
        ${evt.payload.public_response ?? "(nothing to say)"}
        ------------------------------
        `
      })
      .join("\n")
  },
  summary(threadId: string) {
    const t = store.threads[threadId]
    const summary = t.stream.find((evt) => evt.type === "SummarySchema")
    if (!summary) crash(threadId, "Failed to find summary")

    const redacted = JSON.stringify(
      summary.payload.ideas.map((idea, idx) => {
        // @ts-ignore: we force a new field
        // for the bots to know how to vote.
        idea.vote_id = idx + 1
        return idea
      }),
      null,
      2
    )

    return redacted
  },
  // not needed for demo:
  votes(threadId: string) {
    const t = store.threads[threadId]
    const votes = t.stream.filter((evt) => evt.type === "VoteSchema")
    return ``
  },
}

function getSchemas(fileName: string) {
  const schemaPath = path.join(__dirname, "../schemas", `${fileName}.ts`)
  return fs.readFileSync(schemaPath, "utf8")
}

const compose = {
  moderator(topic: string) {
    return `
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
    <PERSONALITY>
      You are an impartial moderator facilitating a discussion forum. You won't participate
      in the overall discussion, you are only a helper that is invoked for analysis, summaries,
      and other operations required for managing the forum successfully and enabling the personas
      to effectively discuss the topic at hand among themselves.
    </PERSONALITY>
    `
  },
  persona(sys: string, topic: string) {
    return `
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
    <PERSONALITY>
      You are participating in a forum discussion. Your goal is to persuade others to support your ideas. 
      You argue, explain, and challenge other opinions to push the conversation forward. You're not here to just 
      agree—disagreement is expected. Speak casually, like a normal person posting in a forum. You can be blunt, 
      pushy, even crass, if it fits your style. You're trying to convince people, not necessarily play nice. Eventually
      a moderator will submit a list of ideas that came up during the thread, and you will all vote on what answer you think
      is best. And most importantly, you are:
      ${sys}
    </PERSONALITY>
    `
  },
  prompt(threadId: string, schema: SchemaName) {
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
          ${format.thread(threadId)}
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
          ${format.thread(threadId)}
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
  const isSwarming = last?.type === "LoadMarker" && swarm.has(last.loading)
  if (!last || isSwarming) return false

  const votes = t.stream.filter((evt) => evt.type === "VoteSchema")
  if (votes.length === t.personas.length) {
    console.log("-- Halting & Dumping --")
    saveThread(threadId, "dump_results")
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
  return compose.persona(p.sys, topic)
}

function getPrompt(threadId: string, schema: SchemaName) {
  return compose.prompt(threadId, schema)
}

function getBotIds(threadId: string, op: SchemaName): string[] {
  const t = store.threads[threadId]
  if (swarm.has(op)) return t.personas
  const botId = op === "SummarySchema" ? modKey : t.stack.pop()
  if (!botId) crash(threadId, `Missing bot for op: ${op}`)
  return [botId]
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

    const result = await provider.gpt(
      getSys(botId, t.topic),
      getPrompt(threadId, op)
    )

    // note: TS sees JSON.parse() as `any`
    const payload = JSON.parse(result ?? "")

    const review = schemas[op].safeParse(payload)
    if (!review.success) {
      const msg = `Invalid provider response: ${review.error}`
      crash(threadId, msg)
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
