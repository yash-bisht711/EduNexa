# Test plan and result recording

Run `npm test -w server` and `npm run build -w client`.

| Scenario | Expected result | Status |
|---|---|---|
| Login with each seeded role | JWT returned; role is correct | Verify locally |
| Student requests admin endpoint | HTTP 403 | Verify locally |
| Instructor creates course | Course saved with instructor owner | Verify locally |
| Student enrolls | Enrollment created once | Verify locally |
| Student completes lessons | Progress recalculated server-side | Verify locally |
| Quiz submitted | Score calculated by API, not client | Verify locally |
| Certificate before completion | HTTP 400 | Verify locally |
| Certificate after completion | Valid PDF response | Verify locally |
| Video upload | File stored; queued if Redis available | Verify locally |
| Live room chat | Messages broadcast to room | Verify in two browsers |
| Razorpay not configured | Helpful 503 response | Verify locally |

Do not publish performance or accuracy numbers until measured on the deployed environment. Record browser, dataset, concurrency, latency percentiles and test date in this file.


## AI and organization additions

- [x] Static contract test confirms provider keys are referenced only by the server route and absent from the client bundle.
- [x] Static contract test confirms AI conversation reads/deletes are scoped to the authenticated user.
- [x] Static contract test confirms organization membership listing and owner/org-admin authorization checks.
- [ ] Configure a real Gemini/OpenAI key and verify AI chat, conversation persistence, history loading and study-plan generation.
- [ ] Verify organization creation, member addition and cross-organization access denial with two separate accounts.
- [ ] Complete browser E2E tests against MongoDB + Redis and a real browser.
