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
}

// Conversation state
let conversation = []

// Get response from a specific bot
async function getBotResponse(botKey, prompt) {
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
          content: prompt + "\n\nConversation so far:\n" + formatConversation(),
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

// Format conversation history for display
function formatConversation() {
  return conversation
    .map((entry) => `${entry.speaker}: ${entry.message}`)
    .join("\n")
}

// Add message to conversation
function addToConversation(speaker, message) {
  const timestamp = new Date().toISOString()
  console.log(`\n${speaker} [${timestamp}]: ${message}\n`)
  conversation.push({ speaker, timestamp, message })
}

// Collect votes from all discussion bots
async function collectVotes(topic) {
  const votes = {}
  const votingPrompt = `Based on the discussion about "${topic}", cast your vote for the best solution. Respond with just your vote and brief reasoning.`

  for (const botKey of ["botA", "botB", "botC"]) {
    const vote = await getBotResponse(botKey, votingPrompt)
    votes[bots[botKey].name] = vote
  }

  return votes
}

// Main forum discussion function
async function runForumDiscussion(userTopic) {
  console.log("🏛️  AI Forum Discussion Starting...\n")

  // Initialize conversation
  addToConversation("User", userTopic)

  // Moderator introduces the topic
  const modIntro = await getBotResponse(
    "moderator",
    `A user has asked: "${userTopic}". Please introduce this topic to the forum and invite discussion.`
  )
  addToConversation("Moderator", modIntro)

  // Shuffle participants and run rounds
  const participants = ["botA", "botB", "botC"]
  const shuffled = [...participants].sort(() => Math.random() - 0.5)

  console.log(
    `Round order: ${shuffled.map((key) => bots[key].name).join(" → ")}\n`
  )

  // Run rounds equal to number of participants
  for (let round = 0; round < participants.length; round++) {
    console.log(`\n--- Round ${round + 1} ---`)

    // Rotate who goes first each round
    for (let i = 0; i < participants.length; i++) {
      const speakerIndex = (round + i) % participants.length
      const botKey = shuffled[speakerIndex]

      const response = await getBotResponse(
        botKey,
        `Please share your thoughts on: "${userTopic}"`
      )
      addToConversation(bots[botKey].name, response)
    }
  }

  // Collect votes
  console.log("\n🗳️  Voting Phase...\n")
  const votes = await collectVotes(userTopic)

  // Moderator summarizes votes and concludes
  let votesSummary = "Votes received:\n"
  Object.entries(votes).forEach(([bot, vote]) => {
    votesSummary += `${bot}: ${vote}\n`
  })

  const conclusion = await getBotResponse(
    "moderator",
    `Please summarize the discussion and votes: ${votesSummary}`
  )
  addToConversation("Moderator", conclusion)

  console.log("🏁 Discussion Complete!")
}

// Example usage
async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node index.js 'Your question or topic'")
    process.exit(1)
  }

  const userQuestion = process.argv.slice(2).join(" ")
  await runForumDiscussion(userQuestion)
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { runForumDiscussion, getBotResponse, bots }
