/**
 * chatbotGuideData.js
 * 
 * Contains all guide data for the chatbot's Guide Mode.
 * Each category has sub-categories, and each sub-category has detailed steps.
 * 
 * DATA STRUCTURE:
 * - id: unique identifier for the category
 * - title: display name shown on category card
 * - icon: lucide-react icon component
 * - description: short description shown below the title
 * - subCategories: array of sub-category objects
 *   - id: unique sub-category identifier
 *   - title: display name for the sub-category
 *   - steps: array of step strings (step-by-step instructions)
 *   - note: (optional) additional tip/note shown at the bottom
 *   - links: (optional) array of cross-links to other guides
 *     - label: link text displayed to the user
 *     - targetCategory: category id to navigate to
 *     - targetSub: sub-category id to navigate to
 * 
 * HOW TO ADD NEW GUIDES:
 * 1. Add a new object to the GUIDE_CATEGORIES array
 * 2. Define sub-categories inside it
 * 3. Write detailed steps for each sub-category
 * 4. Optionally add cross-links to related guides
 */

import {
  Zap, FolderPlus, Layers, Server, BarChart3,
  Bot, AlertCircle, Settings, Globe, Shield,
  FileText, Play, Clock, Database, GitBranch
} from 'lucide-react';

const GUIDE_CATEGORIES = [
  // =============================================
  // 1. REQUEST EXECUTION - How to create and send API requests
  // =============================================
  {
    id: 'request-execution',
    title: 'Request Execution',
    icon: Zap,
    description: 'Learn how to create and send API requests',
    subCategories: [
      {
        id: 'create-new-request',
        title: 'How to create a new request?',
        steps: [
          'Click the "+" (New Tab) button in the left sidebar',
          'A new empty request tab will open',
          'Select the HTTP method (GET, POST, PUT, DELETE, PATCH, etc.)',
          'Enter your API endpoint URL in the URL field (e.g., https://api.example.com/users)',
          'If you need query parameters, add key-value pairs in the "Params" tab',
          'Add custom headers in the Headers tab (e.g., Content-Type, Authorization)',
          'For POST/PUT requests, write the request body in the Body tab (JSON, form-data, etc.)',
          'Configure authentication in the Auth tab (Bearer Token, Basic Auth, API Key)',
          'Click the "Send" button to execute the request',
        ],
        note: 'Tip: Use {{variable}} syntax in your URL to leverage environment variables for dynamic URLs.',
        links: [
          { label: "Don't have a project yet?", targetCategory: 'project-creation', targetSub: 'create-new-project' },
          { label: "Don't have a collection yet?", targetCategory: 'collection-creation', targetSub: 'create-new-collection' },
        ],
      },
      {
        id: 'save-request',
        title: 'How to save a request?',
        steps: [
          'After creating a request, click the "Save" button (or use Ctrl+S)',
          'If saving for the first time, a dialog will appear',
          'Select the collection where you want to save the request',
          'Optionally select a folder within the collection for organization',
          'Give your request a descriptive name',
          'Click "Save"',
          'The request will now appear in the left sidebar under the selected collection',
        ],
        note: 'You need to have a Collection and Project created before you can save a request.',
        links: [
          { label: 'How to create a collection?', targetCategory: 'collection-creation', targetSub: 'create-new-collection' },
        ],
      },
      {
        id: 'understand-response',
        title: 'Understanding the response panel',
        steps: [
          'After sending a request, the response appears in the bottom panel',
          'The response panel has these tabs:',
          '  - Body: The API response data (JSON, HTML, XML, etc.)',
          '  - Headers: Response headers sent by the server',
          '  - Test Results: Results of any tests you have written',
          '  - Debug Info: Detailed debugging information for the request/response cycle',
          'Check the status code (200 = OK, 404 = Not Found, 500 = Server Error)',
          'Check the response time (in milliseconds)',
          'Check the response size (in KB/MB)',
        ],
        note: 'The Debug Info tab provides complete details when errors occur - including headers, body, and timing.',
      },
      {
        id: 'use-environment-vars-in-request',
        title: 'Using environment variables in requests',
        steps: [
          'First, go to the Variables section and set up your environment',
          'Add variables to your environment (e.g., base_url, api_key, token)',
          'Activate the environment using the green toggle',
          'Now you can use {{base_url}}/users in your request URL',
          'You can use {{api_key}} in your headers',
          'Variables also work in the request body using the {{variable_name}} syntax',
          'When you send the request, variable values will be automatically substituted',
        ],
        links: [
          { label: 'Set up environment variables', targetCategory: 'environment-setup', targetSub: 'create-environment' },
        ],
      },
    ],
  },

  // =============================================
  // 2. PROJECT CREATION - How to create and manage projects
  // =============================================
  {
    id: 'project-creation',
    title: 'Project Creation',
    icon: FolderPlus,
    description: 'Create and manage your projects',
    subCategories: [
      {
        id: 'create-new-project',
        title: 'How to create a new project?',
        steps: [
          'Look for the "Projects" button in the top-right area or project section in the sidebar',
          'Click "Create New Project" or the "+" button',
          'Enter a project name (e.g., "My API Project")',
          'Add a description (optional but recommended)',
          'Select visibility - Private (only you) or Team (shared with team)',
          'Click "Create"',
          'The project will be created and set as your active project',
          'You can now add collections, environments, and mock servers to this project',
        ],
        note: 'A Project is the top-level container. One project can have multiple collections.',
      },
      {
        id: 'switch-project',
        title: 'How to switch between projects?',
        steps: [
          'The active project name is shown in the header (dropdown)',
          'Click the dropdown to see a list of all your projects',
          'Click on the project you want to switch to',
          'When switching, the project\'s collections, environments, etc. will load automatically',
          'Each project maintains its own tabs and state, which are preserved when switching',
        ],
      },
      {
        id: 'manage-project',
        title: 'Managing project settings and members',
        steps: [
          'Right-click on the project name in the dropdown or click the settings icon',
          'Or navigate to: Top menu > Projects Management page',
          'From there you can rename, delete, or manage project members',
          'Invite team members via email',
          'Assign roles - Admin, Editor, Viewer',
          'Deleting a project will also delete all collections inside it (be careful!)',
        ],
        note: 'Warning: Deleting a project is irreversible. Make sure to back up your data first.',
      },
    ],
  },

  // =============================================
  // 3. COLLECTION CREATION - How to create and organize collections
  // =============================================
  {
    id: 'collection-creation',
    title: 'Collection Creation',
    icon: Layers,
    description: 'Create and organize your API collections',
    subCategories: [
      {
        id: 'create-new-collection',
        title: 'How to create a new collection?',
        steps: [
          'Click on the "Collections" tab in the top navigation',
          'Click the "+" or "New Collection" button in the left sidebar',
          'Enter a collection name (e.g., "User APIs", "Payment Gateway")',
          'Select the project this collection should belong to',
          'Click "Create"',
          'The collection will appear in the left sidebar',
          'You can now add folders and requests to this collection',
        ],
        note: 'Collections are a way to group related requests together. One project can have multiple collections.',
        links: [
          { label: "Don't have a project yet?", targetCategory: 'project-creation', targetSub: 'create-new-project' },
        ],
      },
      {
        id: 'organize-with-folders',
        title: 'Organizing collections with folders',
        steps: [
          'Right-click on a collection or click the "..." menu',
          'Select "Add Folder"',
          'Give the folder a name (e.g., "Authentication", "CRUD Operations")',
          'You can create sub-folders within folders for deeper organization',
          'Drag and drop requests to move them between folders',
          'Folders can be collapsed/expanded in the sidebar',
        ],
      },
      {
        id: 'import-collection',
        title: 'Importing collections (Postman, OpenAPI)',
        steps: [
          'Look for the "Explore" or "Import" option in the top navigation',
          'Select your import source:',
          '  - Postman Collection (JSON file)',
          '  - OpenAPI/Swagger specification (YAML/JSON)',
          '  - cURL command',
          'Upload the file or paste the content',
          'Preview what will be imported',
          'Select the target project/collection',
          'Click "Import"',
        ],
        note: 'Migrating from Postman? You can directly import your Postman collection JSON file.',
      },
      {
        id: 'run-collection',
        title: 'How to run an entire collection?',
        steps: [
          'Right-click on a collection or click the "..." menu',
          'Select "Run Collection"',
          'Configure your run settings:',
          '  - Iterations: how many times to run the collection',
          '  - Delay: gap between requests (in milliseconds)',
          '  - Select/deselect specific requests to include',
          '  - Choose an environment to use',
          'Click "Run"',
          'The results tab will show the status of each request (pass/fail)',
          'A summary will display total passed, failed, and timing information',
        ],
        links: [
          { label: 'How to run a load/performance test?', targetCategory: 'performance-testing', targetSub: 'run-load-test' },
        ],
      },
    ],
  },

  // =============================================
  // 4. ENVIRONMENT VARIABLES - Setting up and managing variables
  // =============================================
  {
    id: 'environment-setup',
    title: 'Environment Variables',
    icon: Globe,
    description: 'Set up and manage environment variables',
    subCategories: [
      {
        id: 'create-environment',
        title: 'How to create a new environment?',
        steps: [
          'Click on the "Variables" tab in the top navigation',
          'Click the "+" or "Create Environment" button',
          'Enter an environment name (e.g., "Development", "Staging", "Production")',
          'Add variables as key-value pairs:',
          '  - Key: the variable name (e.g., base_url, api_key)',
          '  - Value: the variable value (e.g., https://api.dev.example.com)',
          '  - Enabled: toggle on/off for each variable',
          'Click "Save"',
        ],
        note: 'Create multiple environments (Development, Staging, Production) and switch between them as needed.',
      },
      {
        id: 'activate-environment',
        title: 'How to activate/deactivate an environment?',
        steps: [
          'On the Variables page, you\'ll see a list of environments',
          'Click the toggle for the environment you want to activate (it turns green when active)',
          'Only one environment can be active at a time per project',
          'The active environment\'s variables will be available in all requests',
          'Select "No Environment" to deactivate all environments',
        ],
      },
      {
        id: 'global-variables',
        title: 'What are Global Variables?',
        steps: [
          'Global variables are available across all projects and environments',
          'Find the "Global" section on the Variables page',
          'Place common variables here that you need everywhere (e.g., user_id, common_token)',
          'If the same key exists in both an environment and global scope, the environment value takes priority',
          'Global variables have their own separate save button',
        ],
      },
    ],
  },

  // =============================================
  // 5. MOCK SERVER - Creating and testing mock APIs
  // =============================================
  {
    id: 'mock-server',
    title: 'Mock Server',
    icon: Server,
    description: 'Create and test mock API endpoints',
    subCategories: [
      {
        id: 'create-mock-server',
        title: 'How to create a mock server?',
        steps: [
          'Click on the "Mock" tab in the top navigation',
          'Click the "Create Mock Server" button',
          'Enter a name for the mock server',
          'Add endpoints:',
          '  - HTTP Method (GET, POST, etc.)',
          '  - Path (e.g., /users, /products/:id)',
          '  - Response Status Code (200, 201, 404, etc.)',
          '  - Response Body (in JSON format)',
          '  - Response Delay (in ms - to simulate slow APIs)',
          'Click "Create"',
          'You\'ll receive a mock server URL that you can use for testing',
        ],
        note: 'Mock servers are very useful during development when the backend is not yet ready.',
      },
      {
        id: 'test-mock-endpoint',
        title: 'How to test a mock endpoint?',
        steps: [
          'After creating the mock server, copy its URL',
          'Open a new request tab',
          'Paste the mock URL with the endpoint path',
          'Select the correct HTTP method (matching what you configured in the mock)',
          'Click "Send" - you\'ll receive the mock response',
          'The response time will match the delay you configured',
        ],
      },
    ],
  },

  // =============================================
  // 6. PERFORMANCE / LOAD TESTING
  // =============================================
  {
    id: 'performance-testing',
    title: 'Performance Testing',
    icon: BarChart3,
    description: 'Run load tests and performance testing',
    subCategories: [
      {
        id: 'run-load-test',
        title: 'How to run a load test?',
        steps: [
          'Click on the "Testing" tab in the top navigation',
          'Find the "Load Test" section in the left sidebar',
          'Select the collection you want to test',
          'Configure load test settings:',
          '  - Virtual Users (concurrency): number of simultaneous users',
          '  - Duration: how long to run the test (seconds/minutes)',
          '  - Ramp Up: gradually increase users over time (seconds)',
          '  - Target RPS: target requests per second',
          '  - Timeout: maximum response time before timeout (ms)',
          '  - Think Time: delay between user actions (ms)',
          'Click "Start Load Test"',
          'Watch real-time results - RPS, latency, errors',
        ],
        note: 'Make sure all requests in your collection are properly configured before running a load test.',
        links: [
          { label: 'Create a collection first', targetCategory: 'collection-creation', targetSub: 'create-new-collection' },
        ],
      },
      {
        id: 'understand-load-test-results',
        title: 'Understanding load test results',
        steps: [
          'After the load test completes, the results page will appear',
          'Key metrics:',
          '  - Total Requests: number of requests sent',
          '  - Success Rate: percentage of successful requests',
          '  - Avg Response Time: average response time',
          '  - P95/P99 Latency: 95th/99th percentile response time',
          '  - Requests/sec: actual throughput achieved',
          '  - Error Rate: percentage of failed requests',
          'Review the charts for performance trends over time',
          'Individual request breakdowns are also available',
        ],
      },
      {
        id: 'functional-test',
        title: 'How to run a functional test?',
        steps: [
          'Go to the "Functional Test" section in the Testing tab',
          'Select your collection',
          'Configure options:',
          '  - Iterations: how many times to run',
          '  - Delay between requests (ms)',
          '  - Bail on first failure (stop when an error occurs)',
          '  - Request filter (select specific requests)',
          'Click "Run"',
          'Each request\'s pass/fail status will be displayed',
          'Assertion results will also be shown',
        ],
      },
    ],
  },

  // =============================================
  // 7. AI-ASSISTED FEATURES
  // =============================================
  {
    id: 'ai-assisted',
    title: 'AI-Assisted',
    icon: Bot,
    description: 'Use AI features for API development',
    subCategories: [
      {
        id: 'ai-test-generation',
        title: 'Generating test cases with AI',
        steps: [
          'Click on the "AI-Assisted" tab in the top navigation',
          'Or look for the "AI" button in the request editor',
          'Select the request you want to generate tests for',
          'AI will automatically analyze the request and suggest test cases',
          'Review the suggested tests and accept or modify them',
          'Accepted tests will be added to the request\'s "Tests" tab',
        ],
        note: 'AI features are currently in development. Full functionality will be available soon.',
      },
      {
        id: 'ai-request-help',
        title: 'Getting help from the AI Assistant',
        steps: [
          'If you encounter any issue in the request editor, use the AI chatbot for help',
          'Click the chatbot bubble (bottom-right corner)',
          'Type your question (e.g., "How do I add a Bearer token?")',
          'The AI will provide relevant guidance',
          'When errors occur, the AI will automatically offer to help',
        ],
      },
    ],
  },

  // =============================================
  // 8. API ERRORS GUIDE - Understanding common errors
  // =============================================
  {
    id: 'api-errors',
    title: 'API Errors Guide',
    icon: AlertCircle,
    description: 'Understand common API errors and their solutions',
    subCategories: [
      {
        id: 'client-errors-4xx',
        title: 'Understanding 4xx Client Errors',
        steps: [
          '400 Bad Request: Server rejected the request - check your body/params',
          '401 Unauthorized: Authentication required - check your token/API key',
          '403 Forbidden: Insufficient permissions - check account roles/access',
          '404 Not Found: Wrong URL or resource doesn\'t exist',
          '405 Method Not Allowed: Wrong HTTP method (e.g., using POST instead of GET)',
          '409 Conflict: Resource already exists or conflicting data',
          '422 Unprocessable Entity: Invalid data - check required fields',
          '429 Too Many Requests: Rate limit exceeded - wait before retrying',
        ],
        note: '4xx errors indicate a problem with your request. The response body usually contains specific details.',
      },
      {
        id: 'server-errors-5xx',
        title: 'Understanding 5xx Server Errors',
        steps: [
          '500 Internal Server Error: Something crashed on the server - not your fault',
          '502 Bad Gateway: Communication failure between servers',
          '503 Service Unavailable: Server is temporarily down - try again later',
          '504 Gateway Timeout: Server didn\'t respond in time',
          'Solution: Wait and retry, or contact the API provider',
          'If the error persists, check the API documentation for known issues',
        ],
        note: '5xx errors are server-side problems. They are usually resolved by retrying after a short wait.',
      },
      {
        id: 'network-errors',
        title: 'Network / Connection Errors',
        steps: [
          'CORS Error: Blocked by browser security - add CORS headers on the server',
          'Connection Refused: Server is down or wrong port',
          'Timeout: Server didn\'t respond in time - increase timeout settings',
          'DNS Resolution Failed: Domain name couldn\'t be resolved - check the URL',
          'SSL/TLS Error: Certificate issue - try the "Insecure" option for testing',
          'Network Error: Check your internet connection',
        ],
        note: 'Network errors typically produce no response at all. Check the browser console (F12) for more details.',
      },
    ],
  },

  // =============================================
  // 9. MCP TESTING
  // =============================================
  {
    id: 'mcp-testing',
    title: 'MCP Testing',
    icon: GitBranch,
    description: 'Model Context Protocol (MCP) testing setup',
    subCategories: [
      {
        id: 'mcp-overview',
        title: 'What is MCP Testing?',
        steps: [
          'MCP (Model Context Protocol) is a standard protocol for interacting with AI models',
          'Click on the "MCP" tab in the top navigation',
          'Configure your MCP server connection',
          'Browse available tools and resources',
          'Execute test calls against MCP endpoints',
          'Analyze the results',
        ],
      },
    ],
  },

  // =============================================
  // 10. HISTORY & DASHBOARD
  // =============================================
  {
    id: 'history-dashboard',
    title: 'History & Dashboard',
    icon: Clock,
    description: 'View request history and dashboard',
    subCategories: [
      {
        id: 'view-history',
        title: 'How to view request history?',
        steps: [
          'Click on the "History" tab in the top navigation',
          'A list of all previously sent requests will appear',
          'Each entry shows the method, URL, status code, and response time',
          'Click on any entry to view its details',
          'You can restore a request from history (re-open it in a new tab)',
          'Unwanted entries can be deleted',
        ],
      },
      {
        id: 'use-dashboard',
        title: 'How to use the Dashboard?',
        steps: [
          'Click on the "Dashboard" tab in the top navigation',
          'View your workspace overview statistics',
          'Review collection run summaries',
          'Track recent activity',
          'Analyze performance trends via charts',
        ],
      },
    ],
  },

  // =============================================
  // 11. SETTINGS & PROFILE
  // =============================================
  {
    id: 'settings-profile',
    title: 'Settings & Profile',
    icon: Settings,
    description: 'Configure app settings and manage your profile',
    subCategories: [
      {
        id: 'app-settings',
        title: 'Configuring app settings',
        steps: [
          'Click the Settings (gear) icon in the top-right corner',
          'The Settings page will open',
          'Available settings:',
          '  - Theme: Toggle between Dark and Light mode',
          '  - Default timeout settings',
          '  - SSL verification preferences',
          '  - Proxy configuration',
          'Changes are saved automatically',
        ],
      },
      {
        id: 'profile-management',
        title: 'Managing your profile',
        steps: [
          'Click the Profile icon in the top-right corner',
          'Select "Profile" from the dropdown',
          'On the Profile page you can:',
          '  - View and edit your name and email',
          '  - Change your password',
          '  - Manage your API keys',
          '  - View and create support tickets',
        ],
      },
    ],
  },
];

export default GUIDE_CATEGORIES;
