import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Persona } from '../types';

interface CreateThreadModalProps {
  onClose: () => void;
  onCreate: (thread: { topic: string; personas: string[] }) => void;
}

export const CreateThreadModal: React.FC<CreateThreadModalProps> = ({ onClose, onCreate }) => {
  const [topic, setTopic] = useState('');
  const [topicDraft, setTopicDraft] = useState('');
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isExpanding, setIsExpanding] = useState(false);

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      const data = await api.getPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('Failed to load personas:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && selectedPersonas.length >= 2) {
      onCreate({ topic: topic.trim(), personas: selectedPersonas });
    }
  };

  const expandTopic = async () => {
    if (!topicDraft.trim()) return;
    
    try {
      setIsExpanding(true);
      const result = await api.expandTopic(topicDraft);
      setTopic(result.result);
    } catch (error) {
      console.error('Failed to expand topic:', error);
    } finally {
      setIsExpanding(false);
    }
  };

  const togglePersona = (personaId: string) => {
    setSelectedPersonas(prev => 
      prev.includes(personaId) 
        ? prev.filter(id => id !== personaId)
        : [...prev, personaId]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Create New Thread</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1.5rem'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 500
            }}>
              Topic Draft (Optional)
            </label>
            <textarea
              value={topicDraft}
              onChange={(e) => setTopicDraft(e.target.value)}
              placeholder="Describe the debate topic or question..."
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={expandTopic}
                disabled={!topicDraft.trim() || isExpanding}
                className="secondary"
                style={{ fontSize: '0.875rem' }}
              >
                {isExpanding ? 'Expanding...' : 'AI Expand Topic'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 500
            }}>
              Discussion Topic *
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter the discussion topic or question..."
              rows={4}
              required
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 500
            }}>
              Select Personas * (minimum 2)
            </label>
            {personas.length === 0 ? (
              <div style={{ 
                padding: '1rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '8px',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}>
                No personas available. Create some personas first.
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '8px'
              }}>
                {personas.map((persona) => (
                  <label 
                    key={persona.personaId}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      backgroundColor: selectedPersonas.includes(persona.personaId) 
                        ? 'var(--accent)' 
                        : 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPersonas.includes(persona.personaId)}
                      onChange={() => togglePersona(persona.personaId)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ 
                      fontSize: '0.875rem',
                      color: selectedPersonas.includes(persona.personaId) 
                        ? 'white' 
                        : 'var(--text-primary)'
                    }}>
                      {persona.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ 
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}>
              {selectedPersonas.length} persona(s) selected
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: '1rem'
          }}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="primary"
              disabled={!topic.trim() || selectedPersonas.length < 2}
            >
              Create Thread
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};