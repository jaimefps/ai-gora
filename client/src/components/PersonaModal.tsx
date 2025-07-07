import React from 'react';
import type { Persona } from '../types';

interface PersonaModalProps {
  persona: Persona;
  onClose: () => void;
}

export const PersonaModal: React.FC<PersonaModalProps> = ({ persona, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Persona Details</h2>
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

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            fontWeight: 500,
            color: 'var(--text-secondary)'
          }}>
            Name
          </label>
          <div style={{ 
            padding: '0.75rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            fontSize: '1rem',
            fontWeight: 600
          }}>
            {persona.name}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            fontWeight: 500,
            color: 'var(--text-secondary)'
          }}>
            Persona ID
          </label>
          <div style={{ 
            padding: '0.75rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            fontSize: '0.875rem',
            fontFamily: 'monospace'
          }}>
            {persona.personaId}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            fontWeight: 500,
            color: 'var(--text-secondary)'
          }}>
            System Prompt
          </label>
          <div style={{ 
            padding: '1rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            maxHeight: '300px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {persona.sys}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};