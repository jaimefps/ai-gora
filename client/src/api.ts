import type { Persona, Thread } from './types';

const API_BASE = 'http://localhost:8080';

export const api = {
  // Personas
  async getPersonas(): Promise<Persona[]> {
    const response = await fetch(`${API_BASE}/personas`);
    const data = await response.json();
    return data.objects;
  },

  async getPersona(personaId: string): Promise<Persona> {
    const response = await fetch(`${API_BASE}/personas/${personaId}`);
    return response.json();
  },

  async createPersona(persona: { name: string; sys: string }): Promise<{ personaId: string }> {
    const response = await fetch(`${API_BASE}/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(persona),
    });
    return response.json();
  },

  // Threads
  async getThreads(): Promise<Thread[]> {
    const response = await fetch(`${API_BASE}/threads`);
    const data = await response.json();
    return data.objects;
  },

  async getThread(threadId: string): Promise<Thread> {
    const response = await fetch(`${API_BASE}/threads/${threadId}`);
    return response.json();
  },

  async createThread(thread: { topic: string; personas: string[] }): Promise<{ threadId: string }> {
    const response = await fetch(`${API_BASE}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thread),
    });
    return response.json();
  },

  // Thread controls
  async pauseThread(threadId: string): Promise<Thread> {
    const response = await fetch(`${API_BASE}/intervene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId,
        action: { type: 'pause' }
      }),
    });
    return response.json();
  },

  async resumeThread(threadId: string): Promise<Thread> {
    const response = await fetch(`${API_BASE}/intervene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId,
        action: { type: 'resume' }
      }),
    });
    return response.json();
  },

  async speakInThread(threadId: string, message: string, notes?: string): Promise<Thread> {
    const response = await fetch(`${API_BASE}/intervene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId,
        action: { 
          type: 'speak',
          payload: {
            message,
            notes
          }
        }
      }),
    });
    return response.json();
  },

  // AI Enhancement
  async expandPersona(profile: string): Promise<{ result: string }> {
    const response = await fetch(`${API_BASE}/expand/persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    });
    return response.json();
  },

  async expandTopic(topic: string): Promise<{ result: string }> {
    const response = await fetch(`${API_BASE}/expand/topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    return response.json();
  },
};