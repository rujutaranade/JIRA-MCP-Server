import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { json } from 'stream/consumers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

interface MCPResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

// Create a mock environment for testing
process.env.JIRA_INSTANCE_URL = process.env.JIRA_INSTANCE_URL || 'https://your-domain.atlassian.net';
process.env.JIRA_API_KEY = process.env.JIRA_API_KEY || 'dummy-api-key';
process.env.JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL || 'test@example.com';

describe('JIRA MCP Integration Tests', () => {
  let serverProcess: ChildProcessWithoutNullStreams;
  let client: Client;

  beforeAll(async () => {
    // Start the server using npx with the compiled JavaScript file
    const serverPath = path.resolve(__dirname, '../dist/src/index.js');
    serverProcess = spawn('npx', ['node', serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    // Log server outputs
    serverProcess.stdout.on('data', (data) => {
      console.log(`Server stdout: ${data}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`Server stderr: ${data}`);
    });

    console.log(`Server started with PID: ${serverProcess.pid}`);

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Create client connecting to the spawned server process
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['node', serverPath],
      env: process.env as Record<string, string>
    });
    
    // Create and connect client
    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });
    
    await client.connect(transport);
  });

  afterAll(() => {
    // Clean up
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  test('should list available tools', async () => {
    const toolsResponse = await client.listTools();
    expect(Array.isArray(toolsResponse.tools)).toBe(true);
    console.log(toolsResponse);
  }, 10000);

  test('should perform JQL search', async () => {

    const args = {
      jql: 'project = TEST', 
      maxResults: 5, // Explicitly a string,
      expand: ''
    };
    console.log("SENDING:", JSON.stringify(args));
    // Using a simple JQL query that should work on most JIRA instances
    const result = await client.callTool({
      name: 'jql_search',
      arguments: args
    }) as MCPResponse;

    // Verify we got a response with content
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    
    //console.log("RECEIVED:", result.content[0].text);
    // Parse the JSON response
    const jsonResponse = JSON.parse(result.content[0].text);
    
    // Check that the response has the expected structure
    expect(jsonResponse).toHaveProperty('issues');
    expect(jsonResponse).toHaveProperty('total');
  }, 15000);

  test('should get issue details if it exists', async () => {
    // First perform a search to get a valid issue key
    const searchResult = await client.callTool({
      name: 'jql_search',
      arguments: {
        jql: 'created >= -30d ORDER BY created DESC',
        maxResults: 1
      }
    }) as MCPResponse;

    const searchData = JSON.parse(searchResult.content[0].text);
    
    // Skip if no issues found
    if (!searchData.issues || searchData.issues.length === 0) {
      console.warn('No issues found for testing get_issue. Skipping test.');
      return;
    }

    const issueIdOrKey = searchData.issues[0].key;
    
    // Now get the issue details
    const result = await client.callTool({
      name: 'get_issue',
      arguments: {
        issueIdOrKey
      }
    }) as MCPResponse;

    // Verify we got a response with content
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    
    // Parse the JSON response
    const jsonResponse = JSON.parse(result.content[0].text);
    
    
    // Check that the response has the expected structure
    expect(jsonResponse).toHaveProperty('key', issueIdOrKey);
    console.log("GET Issue Key:", jsonResponse.key);
    expect(jsonResponse).toHaveProperty('fields');
  }, 15000);

  // This test creates an actual issue - be careful with this in production environments
  test('should create a new issue', async () => {
    // Use environment variable to control whether this test runs
    if (process.env.SKIP_ISSUE_CREATION === 'true') {
      console.log('Skipping issue creation test');
      return;
    }

    // Get a project key from an existing issue first
    const searchResult = await client.callTool({
      name: 'jql_search',
      arguments: {
        jql: 'project = TEST',
        maxResults: 1
      }
    }) as MCPResponse;

    const searchData = JSON.parse(searchResult.content[0].text);
    
    // Skip if no issues found
    if (!searchData.issues || searchData.issues.length === 0) {
      console.warn('No issues found for getting project key. Skipping test.');
      return;
    }

    const projectKey = searchData.issues[0].fields.project.key;
    
    const result = await client.callTool({
      name: 'create_issue',
      arguments: {
        fields: {
          summary: 'Test Issue Created by MCP Integration Test',
          description: 'This is a test issue created via the JIRA MCP Integration Test. It can be safely deleted.',
          project: {
            key: projectKey
          },
          issuetype: {
            name: 'Task' ,
            id: '10001'  // Using Task as it's commonly available in most JIRA instances
          }
        }
      }
    }) as MCPResponse;

    // Verify we got a response with content
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    console.log("CREATE Issue Response:", result.content[0].text);
    
    // Parse the JSON response
    const jsonResponse = JSON.parse(result.content[0].text);
    
    // Check that the response has the expected structure for a created issue
    expect(jsonResponse).toHaveProperty('key');
    expect(jsonResponse).toHaveProperty('id');
  }, 15000);
});