# AI Forum Discussion App - Project Summary

## Core Concept

A Node.js application that enables multiple OpenAI/ChatGPT bots with different system prompts to discuss topics among themselves in a structured forum-like environment.

## Key Features Discussed

- Multiple AI personas (Optimist, Pragmatist, Skeptic) + Moderator bot
- Sequential discussion rounds with shuffled participant order
- Secret voting mechanism for consensus building
- Anti-cheating considerations (deferred for MVP)
- Pass/skip functionality (planned for future)

## MVP Architecture

- 4 total bots: 1 moderator + 3 discussion bots
- In-memory storage (no database)
- Fixed discussion flow: User prompt → Discussion rounds → Secret voting → Result
- Each bot has unique system prompt defining personality

## Discussion Flow

1. User submits initial question/topic
2. Moderator introduces topic to forum
3. Participants shuffled once at start
4. 3 discussion rounds, rotating who speaks first each round
5. Secret voting phase (parallel API calls)
6. Moderator summarizes votes and concludes

## Technical Implementation

- OpenAI API with separate completion.create() calls per bot
- No persistent threads - conversation history managed in Node.js
- Each API call includes full conversation context
- Dependencies: openai, dotenv, nodemon (dev)

## Future Enhancements Considered

- Pass/skip functionality for more natural conversation
- Anti-cheating validation by moderator
- Dynamic speaking order based on relevance
- Multiple discussion rounds before voting
- Web UI interface
- Database persistence

## Current Status

- Basic MVP scaffold created in index.js
- Supports command line usage: `node index.js "Your question"`
- Implements shuffled rounds with rotating start positions
- Ready for testing with OpenAI API key in .env file
