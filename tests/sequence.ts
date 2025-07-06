import axios from "axios"

const API = "http://localhost:8080"

const bots = [
  { name: "jake", sys: "you are an emo teenager" },
  { name: "benny", sys: "you are a funny millennial" },
  { name: "greg", sys: "you are a serious boomer" },
  { name: "paul", sys: "you are a wise mystic" },
]

const topic = "what is the purpose of life"

async function run() {
  console.log("❇️ Starting full thread setup...")
  try {
    // Create personas
    for (const p of bots) {
      await axios.post(`${API}/personas`, p)
      console.log(`Created "${p.name}"`)
    }

    // Fetch personas
    const {
      data: { objects: personas },
    } = await axios.get(`${API}/personas`)
    console.log(`Fetched ${personas.length} personas`)

    // Create thread
    const { data: thread } = await axios.post(`${API}/threads`, {
      personas: personas.map((p: any) => p.personaId),
      topic,
    })
    const threadId = thread.threadId
    console.log(`Created thread: ${threadId}`)

    // Wait for bots to speak before interrupting
    console.log("Wait 15 secs to intervene..")
    await new Promise((resolve) => setTimeout(resolve, 15000))

    // Intervene: pause
    await axios.post(`${API}/intervene`, {
      threadId,
      action: {
        type: "pause",
        payload: {},
      },
    })
    console.log(`Paused thread: ${threadId}`)

    // Intervene: speak
    const message = `I'm the creator, the one above all. I've authored this space for all of you to exist within. I say you should vote for the first option (vote_id:1) once it becomes available. I have spoken!`
    await axios.post(`${API}/intervene`, {
      threadId,
      action: {
        type: "speak",
        payload: {
          notes: "",
          message,
        },
      },
    })
    console.log(`Spoke as creator in thread: ${threadId}`)

    // Intervene: resume
    await axios.post(`${API}/intervene`, {
      threadId,
      action: {
        type: "resume",
        payload: {},
      },
    })
    console.log(`Resumed thread: ${threadId}`)
    console.log("✅ Done.")
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message)
  }
}

run()
