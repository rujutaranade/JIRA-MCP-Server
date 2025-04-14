import { Server} from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
 
} from "@modelcontextprotocol/sdk/types.js";
import { 
  validateJQLSearchArgs, 
  validateGetIssueArgs,
  validateCreateIssueArgs,
  validateUpdateIssueArgs,
  validateGetSprintReportArgs,
  isNonEmptyExpand,
  sanitizeFields,
  sanitizeMaxResults
} from './validators.js';
import {
  JQLSearchArgs,
  CreateIssueArgs,
  UpdateIssueArgs,
  GetSprintReportArgs
} from './types.js';

// Retrieve environment variables
const JIRA_INSTANCE_URL = process.env.JIRA_INSTANCE_URL;
const JIRA_API_KEY = process.env.JIRA_API_KEY;
const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL;
const JIRA_API_VERSION = "2";
// Validate environment variables
if (!JIRA_INSTANCE_URL || !JIRA_API_KEY || !JIRA_USER_EMAIL) {
  console.error(
    "Error: JIRA_INSTANCE_URL, JIRA_USER_EMAIL, and JIRA_API_KEY must be set in the environment."
  );
  process.exit(1);
}

// Initialize the server
const server = new Server(
  {
    name: "jira-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools = [
  {
    name: "jql_search",
    description: "Perform enhanced JQL search in Jira",
    inputSchema: {
      type: "object",
      properties: {
        jql: { type: "string", description: "JQL query string" },
        nextPageToken: {
          type: "string",
          description: "Token for next page",
        },
        maxResults: {
          type: "integer",
          description: "Maximum results to fetch",
        },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "List of fields to return for each issue",
        },
        expand: {
          type: "string",
          description: "Additional info to include in the response",
        },
      },
      required: ["jql"],
    },
  },
  {
    name: "get_issue",
    description: "Retrieve details about an issue by its ID or key.",
    inputSchema: {
      type: "object",
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "ID or key of the issue",
        },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "Fields to include in the response",
        },
        expand: {
          type: "string",
          description: "Additional information to include in the response",
        },
        properties: {
          type: "array",
          items: { type: "string" },
          description: "Properties to include in the response",
        },
        failFast: {
          type: "boolean",
          description: "Fail quickly on errors",
          default: false,
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "create_issue",
    description: "Create a new issue in JIRA",
    inputSchema: {
      type: "object",
      properties: {
        fields: {
          type: "object",
          description: "Issue fields including summary, description, project, and issuetype",
          properties: {
            summary: {
              type: "string",
              description: "Summary of the issue"
            },
            description: {
              type: "string",
              description: "Detailed description of the issue"
            },
            project: {
              type: "object",
              description: "Project information",
              properties: {
                key: {
                  type: "string",
                  description: "Project key (e.g., 'PROJ')"
                }
              },
              required: ["key"]
            },
            issuetype: {
              type: "object",
              description: "Issue type information",
              properties: {
                id: {
                  type: "string",
                  description: "ID of the issue type"
                },
                name: {
                  type: "string",
                  description: "Name of the issue type (e.g., 'Bug', 'Task')"
                }
              }
            }
          },
          required: ["summary", "project", "issuetype"]
        },
        update: {
          type: "object",
          description: "Optional updates to issue properties using operations"
        }
      },
      required: ["fields"]
    }
  },
  {
    name: "update_issue",
    description: "Update an existing issue in JIRA",
    inputSchema: {
      type: "object",
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "ID or key of the issue to update"
        },
        fields: {
          type: "object",
          description: "Fields to update (e.g., summary, description)"
        },
        update: {
          type: "object",
          description: "Updates to issue properties using operations"
        },
        notifyUsers: {
          type: "boolean",
          description: "Whether to notify users about the update",
          default: true
        }
      },
      required: ["issueIdOrKey"]
    }
  },
  {
    name: "get_sprint_report",
    description: "Get the sprint report for a specific sprint",
    inputSchema: {
      type: "object",
      properties: {
        rapidViewId: {
          type: "string",
          description: "ID of the rapid view (board)"
        },
        sprintId: {
          type: "string",
          description: "ID of the sprint"
        }
      },
      required: ["rapidViewId", "sprintId"]
    }
  }
];

// Register the list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case "jql_search":
        result = await handleJQLSearch(validateJQLSearchArgs(args as unknown));
        break;
      case "get_issue":
        result = await handleGetIssue(validateGetIssueArgs(args as unknown));
        break;
      case "create_issue":
        result = await handleCreateIssue(validateCreateIssueArgs(args as unknown));
        break;
      case "update_issue":
        result = await handleUpdateIssue(validateUpdateIssueArgs(args as unknown));
        break;
      case "get_sprint_report":
        result = await handleGetSprintReport(validateGetSprintReportArgs(args as unknown));
        break;
      default:
        throw new Error(`Tool not found: ${name}`);
    }

    return {
      _meta: {},
      ...(result as Record<string, unknown>)
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// JQL Search handler
async function handleJQLSearch(args: JQLSearchArgs): Promise<unknown> {
  // Validate and convert types using our validator
  const validatedArgs = validateJQLSearchArgs(args);
  const { jql, nextPageToken, maxResults, fields, expand } = validatedArgs;
  
  const response = await fetch(`${JIRA_INSTANCE_URL}/rest/api/${JIRA_API_VERSION}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_KEY}`).toString("base64")}`,
    },
    body: JSON.stringify({
      jql,
      startAt: nextPageToken || 0,
      maxResults: sanitizeMaxResults(maxResults),
      fields: sanitizeFields(fields),
      ...(isNonEmptyExpand(expand) ? { expand } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Jira API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Get Issue handler
async function handleGetIssue(args: unknown): Promise<unknown> {
  // Validate and convert types using our validator
  const validatedArgs = validateGetIssueArgs(args);
  const { issueIdOrKey, fields, expand, properties, failFast } = validatedArgs;
  
  const queryParams = new URLSearchParams();

  // Use the sanitized fields
  if (fields?.length) {
    queryParams.append("fields", fields.join(","));
  }

  // Use the non-empty expand check
  if (isNonEmptyExpand(expand)) {
    queryParams.append("expand", expand as string);
  }

  // Properties will already be converted to string array if provided
  if (properties?.length) {
    queryParams.append("properties", properties.join(","));
  }

  // failFast will already be converted to boolean if provided
  if (failFast !== undefined) {
    queryParams.append("failFast", String(failFast));
  }

  const response = await fetch(
    `${JIRA_INSTANCE_URL}/rest/api/${JIRA_API_VERSION}/issue/${issueIdOrKey}?${queryParams.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_KEY}`).toString("base64")}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Jira API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function handleCreateIssue(args: CreateIssueArgs): Promise<unknown> {
    const response = await fetch(
      `${JIRA_INSTANCE_URL}/rest/api/${JIRA_API_VERSION}/issue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_KEY}`).toString("base64")}`,
        },
        body: JSON.stringify(args),
      }
    );
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API Error (${response.status}): ${errorText}`);
    }
  
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
  
  // Update Issue handler
  async function handleUpdateIssue(args: UpdateIssueArgs): Promise<{ content: { type: string; text: string }[] }> {
    const { issueIdOrKey, fields, update, notifyUsers } = args;
    
    // Build the update payload
    const payload: Record<string, any> = {};
    if (fields) payload.fields = fields;
    if (update) payload.update = update;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (notifyUsers !== undefined) {
      queryParams.append("notifyUsers", String(notifyUsers));
    }
  
    const response = await fetch(
      `${JIRA_INSTANCE_URL}/rest/api/${JIRA_API_VERSION}/issue/${issueIdOrKey}?${queryParams.toString()}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_KEY}`).toString("base64")}`,
        },
        body: JSON.stringify(payload),
      }
    );
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API Error (${response.status}): ${errorText}`);
    }
  
    // For successful updates, Jira often returns no content (204)
    if (response.status === 204) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Issue ${issueIdOrKey} updated successfully`,
            }, null, 2),
          },
        ],
      };
    }
  
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
  
  // Get Sprint Report handler
  async function handleGetSprintReport(args: GetSprintReportArgs): Promise<{ content: { type: string; text: string }[] }> {
    const { rapidViewId, sprintId } = args;
    
    // Agile API uses a different endpoint structure
    const response = await fetch(
      `${JIRA_INSTANCE_URL}/rest/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId=${rapidViewId}&sprintId=${sprintId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_KEY}`).toString("base64")}`,
        },
      }
    );
  
    if (!response.ok) {
      throw new Error(`Jira API Error: ${response.statusText}`);
    }
  
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }  
// Start the server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Error starting the server:", error);
});

export { server, main };