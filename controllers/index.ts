export type Thread = {
  topic: string
  personas: Persona[]
  stream: any[]
  config: {}
}

export type Persona = {
  prompt: string
  name: string
}

export const db: {
  threads: { [k: number]: Thread }
  personas: { [k: number]: Persona }
} = {
  threads: {},
  personas: {},
}
