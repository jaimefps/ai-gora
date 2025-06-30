/*
If the moderator or a persona are sent a message, where they are only
being asked to acknowledge the message sent by the controller.
*/
export const ack = "ACK"

/*
The "secret_thoughts" fields are meant to be a space for each persona to think deeply about their answer before sharing a response. 
The "secret_thoughts" fields are never shared with other personas in the forum, and the personas need to know that it is in fact a
secret space that no one can see, so they can use it to think freely, even scheme, before sharing their public answer.
*/

export const thesis = {
  secret_thoughts: "string",
  /*
  Use null to abstain from contributing to the conversation when prompted.
  The persona may receive additional opportunities in the future to respond
  if they feel that they have an opinion that they eventually want to share.
  */
  public_response: "string" || null,
}

export const vote = {
  secret_thoughts: "string",
  /*
  The name of a summarized thesis. Can be set to null to abstain from 
  voting if the persona feels that none of the ideas are good enough.
  */
  thesis_name: "string" || null,
}

// NOT USED FOR NOW
// const concent = {
//   secret_thoughts: "string",
//   value: true | false,
// }
