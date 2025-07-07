import React, { useState } from 'react';
import { api } from '../api';

interface CreatePersonaModalProps {
  onClose: () => void;
  onCreate: (persona: { name: string; sys: string }) => void;
}

export const CreatePersonaModal: React.FC<CreatePersonaModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [sys, setSys] = useState('');
  const [profileDraft, setProfileDraft] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && sys.trim()) {
      onCreate({ name: name.trim(), sys: sys.trim() });
    }
  };

  const expandProfile = async () => {
    if (!profileDraft.trim()) return;
    
    try {
      setIsExpanding(true);
      const result = await api.expandPersona(profileDraft);
      setSys(result.result);
    } catch (error) {
      console.error('Failed to expand profile:', error);
    } finally {
      setIsExpanding(false);
    }
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Create New Persona</h2>
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
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter persona name"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 500
            }}>
              Profile Draft (Optional)
            </label>
            <textarea
              value={profileDraft}
              onChange={(e) => setProfileDraft(e.target.value)}
              placeholder="Describe the persona's personality, viewpoints, and style..."
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={expandProfile}
                disabled={!profileDraft.trim() || isExpanding}
                className="secondary"
                style={{ fontSize: '0.875rem' }}
              >
                {isExpanding ? 'Expanding...' : 'AI Expand Profile'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 500
            }}>
              System Prompt *
            </label>
            <textarea
              value={sys}
              onChange={(e) => setSys(e.target.value)}
              placeholder="Enter the full system prompt for this persona..."
              rows={8}
              required
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: '1rem'
          }}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Create Persona
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};