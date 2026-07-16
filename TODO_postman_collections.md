# Postman Collections (History/Share Requests)

- [ ] Create Postman collection for authentication + voting + results.
- [ ] Add environment variables (baseUrl, accessToken, refreshToken).
- [ ] Configure `Authorization` header automatically from `accessToken`.
- [ ] Add requests:
  - POST `{{baseUrl}}/api/auth/login/`
  - POST `{{baseUrl}}/api/auth/register/`
  - POST `{{baseUrl}}/api/vote/`
  - GET  `{{baseUrl}}/api/results/{{election_id}}/`
- [ ] Add tests for error 401/403 to quickly identify token issues.
- [ ] Export collection to JSON and document how to share.

