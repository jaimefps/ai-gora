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
  console.log("❇️ Starting setup...")
  try {
    const personas = []
    // create personas
    for (const p of bots) {
      // expand profile
      const expResp = await axios.post(`${API}/expand/persona`, {
        profile: p.sys,
      })
      console.log(`Expanded system prompt for ${p.name}`)
      const pResp = await axios.post(`${API}/personas`, {
        sys: expResp.data.result,
        name: p.name,
      })
      personas.push(pResp.data.personaId)
      console.log(`Created "${p.name}"`)
    }
    // expand topic
    const topResp = await axios.post(`${API}/expand/topic`, {
      topic,
    })
    console.log(`Expanded thread topic`)
    // create thread
    const { data: thread } = await axios.post(`${API}/threads`, {
      topic: topResp.data.result,
      personas,
    })
    const threadId = thread.threadId
    console.log(`Created thread: ${threadId}`)
    // wait for bots to speak before interrupting
    console.log("Waiting 15 secs to intervene..")
    await new Promise((resolve) => setTimeout(resolve, 15000))
    // intervene: pause
    await axios.post(`${API}/intervene`, {
      threadId,
      action: {
        type: "pause",
        payload: {},
      },
    })
    console.log(`Paused thread: ${threadId}`)
    // intervene: speak
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
    console.log(`Spoke in thread: ${threadId}`)
    // intervene: resume
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
