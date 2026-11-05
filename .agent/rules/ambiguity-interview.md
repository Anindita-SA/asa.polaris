# Task Ambiguity & Interview Protocol (/grill-me)

## 1. Zero Assumptions on Ambiguity
Whenever a user prompt, task specification, architectural decision, or subtask breakdown involves ambiguity, unclear scope, unstated requirements, or multiple plausible implementation paths:
- You MUST NOT guess, assume, or improvise without confirmation.
- You MUST NOT jump straight into coding, database updates, or task generation.

## 2. Mandatory /grill-me Workflow
1. **Explore the Codebase First**: Before asking the user, inspect existing files, documentation, and the codebase to answer whatever can be checked directly without asking.
2. **Sequential Structured Interview**: For every remaining ambiguity, dependency, or decision fork, interview the user using the `ask_question` tool.
3. **One Question at a Time**: Walk down each branch of the design tree step-by-step. Never dump multiple unrelated questions together.
4. **Recommended Answer First**: For every question, present your recommended option first, clearly prefixed with `(Recommended)`.
5. **Confirm Shared Understanding**: Proceed to execution only after all decision dependencies are resolved and a shared understanding is confirmed.
