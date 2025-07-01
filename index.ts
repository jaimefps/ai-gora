require("dotenv").config()

import fs from "fs"
import path from "path"
import { z } from "zod"
import OpenAI from "openai"
import * as schemas from "./schemas"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const userQuestion =
  "What is the best programming language to learn when you want to break into the software engineering industry?"

const userBots = [
  {
    name: "Optimist",
    systemPrompt:
      "You are an optimistic problem-solver who always looks for positive solutions and opportunities.",
  },
  {
    name: "Pragmatist",
    systemPrompt:
      "You are a pragmatic analyst who focuses on practical, realistic solutions and considers constraints.",
  },
  {
    name: "Skeptic",
    systemPrompt:
      "You are a skeptical critic who questions assumptions and points out potential problems or flaws.",
  },
]

function getSchemas(fileName: string) {
  const schemaPath = path.join(__dirname, "schemas", `${fileName}.ts`)
  return fs.readFileSync(schemaPath, "utf8")
}

// unique symbol, cannot be
// overwritten by user inputs:
const modKey = Symbol("moderator")

type BotInfo = {
  systemPrompt: string
}

const bots: Record<string | typeof modKey, BotInfo> = {
  [modKey]: {
    systemPrompt: `
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

      <USER_TOPIC>
        ${userQuestion}
      </USER_TOPIC>
    `,
  },
}

function addPersona({
  name,
  systemPrompt,
}: {
  name: string
  systemPrompt: string
}) {
  bots[name] = {
    systemPrompt: `
      <PERSONALITY>
        You are participating in a forum discussion. Your goal is to persuade others to support your ideas. 
        You argue, explain, and challenge other opinions to push the conversation forward. You're not here to just 
        agree—disagreement is expected. Speak casually, like a normal person posting in a forum. You can be blunt, 
        pushy, even crass, if it fits your style. You're trying to convince people, not necessarily play nice. Eventually
        a moderator will submit a list of ideas that came up during the thread, and you will all vote on what answer you think
        is best. And most importantly, you are:

        ${systemPrompt}
      </PERSONALITY>

      <RULES>
        Every message directed at you will say in what format you must respond. Failure 
        to do so results in being removed from the forum. You are only meant to respond 
        in JSON satisfying these schemas:
        <SHARED_SCHEMAS>
          ${getSchemas("shared")}
        </SHARED_SCHEMAS>
        <PERSONA_SCHEMAS>
          ${getSchemas("persona")}
        </PERSONA_SCHEMAS>
      </RULES>

      <USER_TOPIC>
        ${userQuestion}
      </USER_TOPIC>
    `,
  }
}

userBots.forEach(addPersona)

type ConvoEvent =
  | {
      type: "Conclusion"
      counter: {
        [k: string]: number
      }
    }
  | {
      type: "AwaitingResponse"
      waitingOn: keyof typeof schemas
      timestamp: number
      speaker: string
    }
  | {
      [K in keyof typeof schemas]: {
        speaker: string | typeof modKey
        type: K // simpler lookups
        payload: z.infer<(typeof schemas)[K]>
        timestamp: number
      }
    }[keyof typeof schemas]

// global state:
const convo: ConvoEvent[] = []

function formatThread() {
  return (
    convo
      .filter((item) => item.type === "ThesisSchema")
      // todo implementation:
      .map((item) => `${String(item.speaker)}:${item.payload.public_response}`)
      .join("\n\n")
  )
}

function formatSummary() {
  const summary = convo.find((item) => item.type === "SummarySchema")
  if (!summary) throw new Error("Failed to find summary entry")
  summary.payload.ideas.forEach((item, idx) => {
    // @ts-ignore : allow us to add a new field
    item.vote_id = idx + 1
  })
  return summary
}

function formatVotes() {
  return "" // todo
}

function createPrompt(schema: keyof typeof schemas) {
  switch (schema) {
    case "WarningsSchema": {
      return `
      <DISCUSSION_THREAD>
        ${formatThread()}
      </DISCUSSION_THREAD>
      <VOTES>
        ${formatVotes()}
      </VOTES>
      <RESPONSE_SCHEMA>
        ${schema}
      </RESPONSE_SCHEMA>
      `
    }

    case "ThesisSchema": {
      return `
      <DISCUSSION_THREAD>
        ${formatThread()}
      </DISCUSSION_THREAD>
      <RESPONSE_SCHEMA>
        ${schema}
      </RESPONSE_SCHEMA>
      `
    }

    case "SummarySchema": {
      return `
      <DISCUSSION_THREAD>
        ${formatThread()}
      </DISCUSSION_THREAD>
      <RESPONSE_SCHEMA>
        ${schema}
      </RESPONSE_SCHEMA>
      `
    }

    case "VoteSchema": {
      return `
      <DISCUSSION_THREAD>
        ${formatThread()}
      </DISCUSSION_THREAD>
      <SUMMARY>
        Only use one of the vote_id's from 
        this list for your vote response:
       ${formatSummary()}
      </SUMMARY>
      <RESPONSE_SCHEMA>
        ${schema}
      </RESPONSE_SCHEMA>
      `
    }

    case "AckSchema": {
      return `
      <RESPONSE_SCHEMA>
        ${schema}
      </RESPONSE_SCHEMA>
      `
    }
  }
}

// Get response from a specific bot
async function callBot(
  botKey: keyof typeof bots,
  schema: keyof typeof schemas
) {
  // for when symbol => string
  const botName = String(botKey)
  const content = createPrompt(schema)

  try {
    convo.push({
      speaker: botKey === modKey ? "Moderator" : botKey,
      type: "AwaitingResponse",
      timestamp: Date.now(),
      waitingOn: schema,
    })
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 999,
      messages: [
        {
          role: "system",
          content: bots[botKey].systemPrompt,
        },
        {
          role: "user",
          content,
        },
      ],
    })

    const answer = JSON.parse(response.choices[0].message.content ?? "")
    // console.log({ [botName]: answer })

    // will throw if invalid:
    schemas[schema].parse(answer)

    const entry = {
      type: schema,
      speaker: botKey,
      timestamp: Date.now(),
      payload: answer,
    } as const
    convo.push(entry)

    return entry
  } catch (err) {
    console.error(`Failed to get response from ${botName}:`, err)
  }
}

// call moderator, request ACK
Promise.all([
  callBot(modKey, "AckSchema"),
  callBot("Skeptic", "AckSchema"),
  callBot("Optimist", "AckSchema"),
  callBot("Pragmatist", "AckSchema"),
])
  // todo: likely remove this initial step;
  // but can still use ACK for other things?
  .then((results) => {
    Object.values(results).forEach((entry) => {
      if (entry?.payload !== "ACK") {
        throw new Error(
          `${entry?.speaker ? String(entry?.speaker) : "UNKNOWN"} failed to ACK`
        )
      }
    })
  })
  .then(() => callBot("Skeptic", "ThesisSchema"))
  .then(() => callBot("Optimist", "ThesisSchema"))
  .then(() => callBot("Pragmatist", "ThesisSchema"))
  .then(() => callBot("Skeptic", "ThesisSchema"))
  .then(() => callBot("Optimist", "ThesisSchema"))
  .then(() => callBot("Pragmatist", "ThesisSchema"))
  .then(() => callBot(modKey, "SummarySchema"))
  .then(() => {
    return Promise.all([
      callBot("Skeptic", "VoteSchema"),
      callBot("Optimist", "VoteSchema"),
      callBot("Pragmatist", "VoteSchema"),
    ])
  })
  // todo: fix
  // .then(() => {
  //   const absKey = Symbol("abstain")

  //   const counter: Record<string | typeof absKey, number> = {
  //     [absKey]: 0,
  //   }

  //   const ideas =
  //     convo.find((entry) => {
  //       return entry.type === "SummarySchema"
  //     })?.payload.ideas ?? []

  //   const votes = convo
  //     .filter((entry) => {
  //       return entry.type === "VoteSchema"
  //     })
  //     .map((vote) => {
  //       // @ts-ignore
  //       return ideas.find((i) => i.vote_id === vote)?.thesis_name ?? null
  //     })

  //   votes.forEach((v) => {
  //     if (v === null) {
  //       counter[absKey] += 1
  //     } else {
  //       counter[v] = (counter[v] ?? 0) + 1
  //     }
  //   })

  //   convo.push({
  //     type: "Conclusion",
  //     counter,
  //   })
  // })
  .then(() => {
    const state = JSON.stringify(convo, null, 2)
    fs.writeFileSync("sample.txt", state)
  })
