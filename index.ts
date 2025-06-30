require("dotenv").config()

import { z } from "zod"
import OpenAI from "openai"
import * as schemas from "./schemas"
import * as utils from "./utils"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const question =
  "What is the best programming language to learn when you want to break into the software engineering industry?"

type BotData = {
  systemPrompt: string
}

const bots: Record<string, BotData> = {
  // moderator: {
  //   name: "Moderator",
  //   systemPrompt:
  //     "You are a moderator facilitating a discussion forum. Guide the conversation, call for votes when appropriate, and summarize results.",
  // },
  // Optimist: {
  //   systemPrompt:
  //     "You are an optimistic problem-solver who always looks for positive solutions and opportunities.",
  // },
  // Pragmatist: {
  //   systemPrompt:
  //     "You are a pragmatic analyst who focuses on practical, realistic solutions and considers constraints.",
  // },
  // Skeptic: {
  //   systemPrompt:
  //     "You are a skeptical critic who questions assumptions and points out potential problems or flaws.",
  // },
}

function addModerator() {
  bots["moderator"] = {
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
        ${utils.getSchemas("shared")}
        ${utils.getSchemas("moderator")}
      </RULES>

      <TOPIC>
        ${question}
      </TOPIC>
    `,
  }
}

function addPersona(name: string, basePrompt: string) {
  bots[name] = {
    systemPrompt: `
      <PERSONALITY>
        You are a persona participating in a forum discussion earnestly trying to 
        convince others in the forum to support your convictions. You will generally
        attempt to explain your opinions, and achieve consensus around your views.
        But most importantly, you are:
        ${basePrompt}
      </PERSONALITY>

      <RULES>
        Every message directed at you will say in what format you must respond. Failure 
        to do so results in being removed from the forum. You are only meant to respond 
        in JSON satisfying these schemas:
        ${utils.getSchemas("shared")}
        ${utils.getSchemas("persona")}
      </RULES>

      <TOPIC>
        ${question}
      </TOPIC>
    `,
  }
}

type ConvoEvent = {
  [K in keyof typeof schemas]: {
    speaker: string
    timestamp: string
    data: z.infer<(typeof schemas)[K]>
    type: K // helps lookups
  }
}[keyof typeof schemas]

// global state:
const convo: ConvoEvent[] = []

function formatConvo() {
  return (
    convo
      .filter((item) => item.type === "ThesisSchema")
      // todo implementation:
      .map(() => "")
      .join("\n")
  )
}

// Get response from a specific bot
async function callBot(
  botKey: keyof typeof bots,
  prompt: string,
  schema: keyof typeof schemas
) {
  const bot = bots[botKey]
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: bot.systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 999,
    })

    // will throw if invalid:
    schemas[schema].parse(response)
    return response.choices[0].message.content
  } catch (error) {
    console.error(`Failed to get response from ${botKey}:`, error)
  }
}
