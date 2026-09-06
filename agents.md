# General Rules

- **Advisor escalation**: If a problem is not solved after 3 passes (with or without human interaction), call `/advisor` before attempting more passes.

# Spotify Web API Rules

Follow these rules when building with the Spotify Web API:

- **OpenAPI spec**: Refer to https://developer.spotify.com/reference/web-api/open-api-schema.yaml for all endpoint paths, parameters, and response schemas. Do not guess endpoints or field names.
- **Authorization**: Use Authorization Code with PKCE flow (https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow) for user-specific data. If a secure backend exists, Authorization Code flow (https://developer.spotify.com/documentation/web-api/tutorials/code-flow) is acceptable. Use Client Credentials only for public, non-user data. Never use Implicit Grant (deprecated).
- **Redirect URIs**: Always use HTTPS redirect URIs (except http://127.0.0.1 for local development). Never use http://localhost or wildcard URIs. See https://developer.spotify.com/documentation/web-api/concepts/redirect_uri.
- **Scopes**: Request only the minimum scopes (https://developer.spotify.com/documentation/web-api/concepts/scopes) for the features being built. Do not request broad scopes preemptively.
- **Token management**: Store tokens securely. Never expose Client Secret in client-side code. Implement token refresh (https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens) and re-authorize when a refresh token expires.
- **Rate limits**: Implement exponential backoff and respect the Retry-After header on HTTP 429. Do not retry immediately or in tight loops.
- **Deprecated endpoints**: Do not use deprecated endpoints. Prefer `/playlists/{id}/items` over `/playlists/{id}/tracks`, and use `/me/library` over type-specific library endpoints.
- **Error handling**: Handle all HTTP error codes from the OpenAPI schema. Read error messages for meaningful user feedback.
- **Developer Terms**: Comply with https://developer.spotify.com/terms. Do not cache Spotify content beyond immediate use, always attribute content to Spotify, and do not use the API for ML training on Spotify data.
