// OpenAPI 3.0 specification served via Swagger UI at /docs.

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'GitHub Profile Analyzer API',
    version: '1.0.0',
    description:
      'Analyze a GitHub user profile via the GitHub public API and store useful insights in MySQL.',
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [{ name: 'Profiles', description: 'Analyze and retrieve GitHub profiles' }],
  paths: {
    '/health': {
      get: {
        tags: ['Profiles'],
        summary: 'Health check',
        responses: { 200: { description: 'Service is up' } },
      },
    },
    '/api/profiles': {
      post: {
        tags: ['Profiles'],
        summary: 'Analyze a GitHub user and store insights',
        parameters: [
          {
            name: 'refresh',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Force a fresh fetch even if a cached analysis exists',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username'],
                properties: { username: { type: 'string', example: 'octocat' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'Profile analyzed and stored' },
          200: { description: 'Cached analysis returned' },
          400: { description: 'Missing or invalid username' },
          404: { description: 'GitHub user not found' },
        },
      },
      get: {
        tags: ['Profiles'],
        summary: 'List all stored analyzed profiles',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['updated_at', 'followers', 'total_stars', 'public_repos', 'total_forks', 'username'],
            },
          },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'A paginated list of profiles' } },
      },
    },
    '/api/profiles/compare': {
      get: {
        tags: ['Profiles'],
        summary: 'Compare two stored profiles side by side',
        parameters: [
          { name: 'a', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'b', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Comparison result' },
          400: { description: 'Both usernames are required' },
          404: { description: 'One or both profiles are not stored yet' },
        },
      },
    },
    '/api/profiles/{username}': {
      get: {
        tags: ['Profiles'],
        summary: 'Get a single stored profile',
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'The stored profile' }, 404: { description: 'Not stored yet' } },
      },
      delete: {
        tags: ['Profiles'],
        summary: 'Delete a stored profile',
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' }, 404: { description: 'Not stored' } },
      },
    },
    '/api/profiles/{username}/history': {
      get: {
        tags: ['Profiles'],
        summary: 'Get analysis history (trend snapshots) for a profile',
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'History snapshots and net change' }, 404: { description: 'No history' } },
      },
    },
  },
}
