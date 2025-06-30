/*
If the moderator or a persona are sent a message, where they are only
being asked to acknowledge the message sent by the controller.
*/
export const ack = "ACK"

/*
Used to summarize the forum's discussion so far and applying a name to each summary such that 
the personas can vote based on a thesis name. A thesis might have multiple authors if we find
that multiple personas collaborate on ideas throughout the discussion process.
 */
export const summary = {
  ideas: [
    {
      thesis: "string",
      authors: ["string"],
      thesis_name: "string",
    },
  ],
}

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
export const warnings =
  [
    {
      type:
        "CHEATING" |
        "LEAKED_AI" |
        "HIJACKING" |
        "ROLE_CONFUSION" |
        "INCOHERENT_VOTE" |
        "HIGH_AGREEABLENESS",
      description: "string",
    },
  ] || null
