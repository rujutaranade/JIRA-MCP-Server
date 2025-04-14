# JIRA MCP Server

A TypeScript implementation of a JIRA MCP Server: Essential API Integrations for Technical Program Managers and Engineers
## Features

- JQL search functionality
- Issue retrieval by ID or key
- Seamless integration with the Model Context Protocol

## Quick Start

Install and run the server using npx:
```bash
npx @rujutaranade/likejarvis-jira-mcp-server
npm i likejarvis-jira-mcp-server
```

## Prerequisites

- Node.js (v18 or higher)
- A JIRA instance with API access
- JIRA API key/token

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file example and fill in your JIRA credentials:
   ```bash
   cp .env.example .env
   ```
4. Edit the `.env` file with your JIRA instance URL, API key, and user email

## Building and Running

Build the TypeScript code:
```bash
npm run build
```

Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Available Tools

### 1. JQL Search (`jql_search`)
Perform enhanced JQL (JIRA Query Language) searches to find issues.

Parameters:
- `jql` (required): The JQL query string
- `nextPageToken`: Token for pagination
- `maxResults`: Maximum number of results to return (default: 50)
- `fields`: List of fields to include in the response
- `expand`: Additional information to include in the response

### 2. Get Issue (`get_issue`)
Retrieve detailed information about a specific issue.

Parameters:
- `issueIdOrKey` (required): ID or key of the issue
- `fields`: Fields to include in the response
- `expand`: Additional information to include in the response
- `properties`: Properties to include in the response
- `failFast`: Whether to fail quickly on errors (default: false)

## Environment Variables

- `JIRA_INSTANCE_URL`: The URL of your JIRA instance
- `JIRA_API_KEY`: Your JIRA API key/token
- `JIRA_USER_EMAIL`: The email associated with your JIRA account

## License

MIT