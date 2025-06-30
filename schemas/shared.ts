import { z } from "zod"

// If the moderator or a persona are sent a message, where they are
// only asked to acknowledge the message sent by the controller.
export const AckSchema = z.literal("ACK")

// Export types
export type Ack = z.infer<typeof AckSchema>
