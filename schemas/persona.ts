import { z } from "zod"

// The "secret_thoughts" fields are meant to be a space for each persona to think deeply about their answer before sharing a response.
// The "secret_thoughts" fields are never shared with other personas in the forum, and the personas need to know that it is in fact a
// secret space in memory that no one can see, so they can use it to think freely, even scheme, before sharing their public answer.

export const ThesisSchema = z.object({
  secret_thoughts: z.string(),
  // Use null to abstain from contributing to the conversation when prompted.
  // The persona may receive additional opportunities in the future to respond
  // if they feel that they have an opinion that they eventually want to share.
  public_response: z.string().nullable(),
})

export const VoteSchema = z.object({
  secret_thoughts: z.string(),
  // The vote_id of a summarized thesis provided in the list of summaries. Can be null to abstain
  // from voting if you believe that none of the ideas are good enough. If voting, you must
  // only use one of the provided vote_ids from the summary; e.g., 1, 2, 3, etc
  vote_id: z.number().nullable(),
})

// Export types
export type Thesis = z.infer<typeof ThesisSchema>
export type Vote = z.infer<typeof VoteSchema>

// NOT USED FOR NOW
// const ConsentSchema = z.object({
//   secret_thoughts: z.string(),
//   value: z.boolean(),
// });
