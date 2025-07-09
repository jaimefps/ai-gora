export interface Persona {
  personaId: string;
  name: string;
  sys: string;
  provider: string;
}

export interface Thread {
  threadId: string;
  topic: string;
  personas: string[];
  stream: StreamEvent[];
  stack: string[];
  config: {
    delay: number;
  };
}

export interface StreamEvent {
  type: string;
  timestamp: number;
  sourceId?: string;
  payload?: unknown;
  botId?: string;
  loading?: string;
  personaId?: string;
  message?: string;
}