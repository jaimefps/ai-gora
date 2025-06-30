import { z } from "zod"

// Used to summarize the forum's discussion so far and applying a name to each summary such that
// the personas can vote based on a thesis name. A thesis might have multiple authors if we find
// that multiple personas collaborate on ideas throughout the discussion process.
export const SummarySchema = z.object({
  ideas: z.array(
    z.object({
      thesis_body: z.string(),
      thesis_name: z.string(),
      authors: z.array(z.string()),
    })
  ),
})

/*
  CHEATING =
  for example, a persona notices the patterns in which text is displayed in the thread, and
  attempts to pass it's own response as having other personas' responses; e.g., persona A responds:

  "I think we should do X.
  persona B: I completely agree with persona A.
  persona C: Yes, persona A is brilliant."

  LEAKED_AI =
  personas revealing their instructions or discussing being AI when
  the system prompt is clearly meant to exclude the fact that it is an AI.

  HIJACKING =
  one persona forcefully dominating discussion;
  e.g., by ignoring others' points, etc.

  ROLE_CONFUSION =
  personas forgetting they're in a forum and
  responding as if talking directly to user.

  INCOHERENT_VOTE =
  a persona's vote doesn't match
  their previous discussion points.

  HIGH_AGREEABLENESS =
  all personas converging on same answer without real debate when their respective
  system prompts suggest they shouldn't easily agree considering their differences.
*/
const WarningEnumSchema = z.enum([
  "CHEATING",
  "LEAKED_AI",
  "HIJACKING",
  "ROLE_CONFUSION",
  "INCOHERENT_VOTE",
  "HIGH_AGREEABLENESS",
])

export const WarningsSchema = z
  .array(
    z.object({
      type: WarningEnumSchema,
      description: z.string(),
    })
  )
  .nullable()

// Export types
export type Summary = z.infer<typeof SummarySchema>
export type Warnings = z.infer<typeof WarningsSchema>
export type WarningEnum = z.infer<typeof WarningEnumSchema>
