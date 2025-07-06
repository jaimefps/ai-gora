# A(i)gora

Let lose some bots to argue over whatever topic.

### now

- ai expanded persona profiles
- ai expanded discussion topics
- create personas to use within threads
- create threads with personas attached
- users can interject in discussion
- pause & resume thread

### soon

- ui for ease-of-use
- user invites/dismisses personas
- users manage the personas stack
- personas support different ai providers

### should

- allow users to leverage their own api-keys
- retry bot calls if schema validations fail

## Run locally

Create a `.env` file with your open-ai key:

```
OPENAI_API_KEY=sk-proj-abc...123
```

Start the local server:

```
$ yarn install
$ yarn dev
```

In a separate terminal, run the test sequence to create personas and akick off a thread using those personas:

```
$ yarn test
```

Watch the server logs and wait for the final results to show up on `/dump_results`.
