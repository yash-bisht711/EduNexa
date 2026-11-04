# EduNexa AI API

All endpoints require `Authorization: Bearer <JWT>`.

## `POST /api/ai/chat`

Request:
```json
{
  "message": "Explain React state with a small example",
  "conversationId": "optional-existing-conversation-id",
  "courseId": "optional-course-id"
}
```
Response:
```json
{
  "conversationId": "...",
  "answer": "...",
  "createdAt": "..."
}
```
Messages are saved per user. The API only loads conversations owned by the authenticated user. Each message is capped at 4,000 characters and recent context is bounded. Configure `GEMINI_API_KEY` or `OPENAI_API_KEY` on the server.

## `GET /api/ai/conversations`
Returns the authenticated user's latest 30 conversation summaries.

## `GET /api/ai/conversations/:id`
Returns a conversation only when it belongs to the authenticated user.

## `DELETE /api/ai/conversations/:id`
Deletes the authenticated user's conversation.

## `GET /api/ai/study-plan`
Uses current enrollment/progress information to generate a 7-day plan. Requires an AI provider key.

## Provider configuration
- Gemini: `GEMINI_API_KEY`, optional `GEMINI_MODEL` (default `gemini-2.5-flash`).
- OpenAI-compatible: `OPENAI_API_KEY`, optional `OPENAI_MODEL` (default `gpt-4o-mini`) and `OPENAI_BASE_URL`.
- Gemini is preferred when both are configured. Provider credentials are only read by the backend.

## Safety and production notes
AI output is untrusted generated content. Render it as text (not raw HTML). Add provider-level budgets, per-user rate limits, abuse monitoring and privacy/retention controls before public launch. Do not send graded assessment answer keys or unnecessary personal data to the model.
