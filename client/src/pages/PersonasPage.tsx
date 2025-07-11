import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Persona, Thread } from '../types';
import { PersonaModal } from '../components/PersonaModal';
import { CreatePersonaModal } from '../components/CreatePersonaModal';
import { CreateThreadModal } from '../components/CreateThreadModal';
import { router } from '../router';

export const PersonasPage: React.FC = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateThreadModal, setShowCreateThreadModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Polling effect for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(false);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const [personasData, threadsData] = await Promise.all([
        api.getPersonas(),
        api.getThreads()
      ]);
      setPersonas(personasData);
      setThreads(threadsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const loadPersonas = async (showLoading = true) => {
    await loadData(showLoading);
  };

  const getThreadCountForPersona = (personaId: string) => {
    return threads.filter(thread => thread.personas.includes(personaId)).length;
  };

  const handleCreatePersona = async (persona: { name: string; sys: string }) => {
    try {
      await api.createPersona(persona);
      setShowCreateModal(false);
      await loadPersonas();
    } catch (error) {
      console.error('Failed to create persona:', error);
    }
  };

  const handleCreateThread = async (thread: { topic: string; personas: string[] }) => {
    try {
      const result = await api.createThread(thread);
      setShowCreateThreadModal(false);
      // Navigate to the new thread
      router.navigate('thread-detail', { threadId: result.threadId });
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading personas...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Personas</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            className="primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Persona
          </button>
          <button 
            className="secondary"
            onClick={() => setShowCreateThreadModal(true)}
            style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border)',
              backgroundColor: 'transparent',
              transition: 'background-color 0.2s ease, border-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              e.currentTarget.style.borderColor = 'var(--text-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            Create Thread
          </button>
          <button 
            className="secondary"
            onClick={() => router.navigate('threads')}
            style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border)',
              backgroundColor: 'transparent',
              transition: 'background-color 0.2s ease, border-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              e.currentTarget.style.borderColor = 'var(--text-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            View Threads →
          </button>
        </div>
      </div>

      {personas.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
          <h3 style={{ marginBottom: '1rem' }}>No personas yet</h3>
          <p>Create your first AI persona to get started with debates.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {personas.map((persona) => {
            const threadCount = getThreadCountForPersona(persona.personaId);
            return (
              <div 
                key={persona.personaId}
                className="card clickable"
                onClick={() => setSelectedPersona(persona)}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem'
                }}>
                  <h3 style={{ 
                    fontSize: '1.25rem', 
                    marginBottom: 0,
                    fontWeight: 600
                  }}>
                    {persona.name}
                  </h3>
                  <div style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    border: '1px solid var(--border)'
                  }}>
                    {threadCount} thread{threadCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <p style={{ 
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  marginBottom: '1rem'
                }}>
                  ID: {persona.personaId}
                </p>
                <p style={{ 
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {persona.sys.substring(0, 150)}...
                </p>
              </div>
            );
          })}
        </div>
      )}

      {selectedPersona && (
        <PersonaModal 
          persona={selectedPersona}
          threads={threads}
          onClose={() => setSelectedPersona(null)}
        />
      )}

      {showCreateModal && (
        <CreatePersonaModal 
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePersona}
        />
      )}

      {showCreateThreadModal && (
        <CreateThreadModal 
          onClose={() => setShowCreateThreadModal(false)}
          onCreate={handleCreateThread}
        />
      )}
    </div>
  );
};