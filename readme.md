# A(i)gora

Let lose some bots to argue over whatever topic.

### now

- ai expanded persona profiles
- ai expanded discussion topics
- create personas to use within threads
- create threads with personas attached
- users can interject in discussion
- ui for overall ease-of-use
- pause & resume thread

### soon

- feed each persona their own previous secret_thoughts
- visual aid to see the thread stack, length, next, etc
- remove cancelled LoadMarkers when a Pause is added to stream
- introduce AllowMarkers for locking operations
- configure types of voting, instead of only one type
- users can manage the turn stack
- users can chat 1:1 with personas
- users can invite/dismiss personas
- personas support different ai providers
- allow users to leverage their own api-keys
- retry bot calls if schema validations fail
- rank voting

### maybe

- backdoor scheming between personas

## run locally

Create a `.env` file with your open-ai key:

```
OPENAI_API_KEY=sk-proj-abc...123
```

Start the local server:

```
$ yarn install
$ yarn dev
```

In a separate terminal, run the test sequence to create personas and kick off a thread using those personas:

```
$ yarn test
```

Watch the server logs and wait for the final results to show up on `/dump_results`.
