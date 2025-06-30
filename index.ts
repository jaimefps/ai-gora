require("dotenv").config()
const OpenAI = require("openai")

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Bot configurations
const bots = {
  moderator: {
    name: "Moderator",
    systemPrompt:
      "You are a moderator facilitating a discussion forum. Guide the conversation, call for votes when appropriate, and summarize results.",
  },
  botA: {
    name: "Optimist",
    systemPrompt:
      "You are an optimistic problem-solver who always looks for positive solutions and opportunities.",
  },
  botB: {
    name: "Pragmatist",
    systemPrompt:
      "You are a pragmatic analyst who focuses on practical, realistic solutions and considers constraints.",
  },
  botC: {
    name: "Skeptic",
    systemPrompt:
      "You are a skeptical critic who questions assumptions and points out potential problems or flaws.",
  },
} as const

const convo: any[] = []

function formatConvo() {
  // todo
  return `convo.map().join("\n")`
}

// Get response from a specific bot
async function getBotResponse(botKey: keyof typeof bots, prompt: string) {
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
          content: prompt + "\n\nConversation so far:\n" + formatConvo(),
        },
      ],
      max_tokens: 500,
    })

    return response.choices[0].message.content
  } catch (error) {
    console.error(`Error getting response from ${bot.name}:`, error)
    return `${bot.name} encountered an error.`
  }
}

// Add message to conversation
function pushToConvo(speaker: string, message: string) {
  const timestamp = new Date().toISOString()
  console.log(`\n${speaker} [${timestamp}]: ${message}\n`)
  convo.push({ speaker, timestamp, message })
}
