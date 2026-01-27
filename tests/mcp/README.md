# MCP Server Test Suite

Comprehensive unit and integration tests for the MCP (Model Context Protocol) server implementation following best practices from the MCP testing ecosystem.

## Testing Approach

Based on research of [MCP testing best practices](https://modelcontextprotocol.info/docs/best-practices/), [unit testing guides](https://milvus.io/ai-quick-reference/how-do-i-write-unit-tests-for-model-context-protocol-mcp-tools-and-resources), and the [MCP testing framework](https://github.com/haakco/mcp-testing-framework).

### Test Categories

#### 1. Unit Tests
Tests for individual services and components in isolation:
- **GitService** - Git command execution and parsing
- **TicketExtractorService** - Ticket reference extraction from PR metadata
- **FormatterService** - Output formatting for MCP responses
- **DevOps Cost Estimator** - Infrastructure cost estimation for IaC files

#### 2. Integration Tests
Tests for complete workflows and MCP tool execution:
- **AnalyzeTool** - Full analysis workflow with mocked git commands
- **SaveResultsTool** - Database operations and result persistence
- **DashboardTool** - Dashboard service integration
- **MCP Server** - End-to-end MCP protocol compliance

## Test Files

```
tests/mcp/
├── services/
│   ├── git.service.test.ts              # Unit tests for GitService
│   ├── ticket-extractor.service.test.ts # Unit tests for TicketExtractorService
│   └── formatter.service.test.ts        # Unit tests for FormatterService
├── tools/
│   ├── analyze-tool.integration.test.ts # Integration tests for AnalyzeTool
│   └── save-results-tool.integration.test.ts # Integration tests for SaveResultsTool
└── server.integration.test.ts           # MCP server protocol tests

tests/tools/
└── devops-cost-estimator.test.ts        # Unit tests for DevOps cost estimation
```

## Key Testing Patterns

### 1. Mocking External Dependencies

```typescript
// Mock git commands
jest.mock('child_process');
(childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
  const command = String(cmd);
  if (command.includes('git diff')) {
    return Buffer.from('diff content');
  }
  return Buffer.from('');
});
```

### 2. Testing MCP Tool Response Format

```typescript
// Verify MCP response structure
expect(result).toHaveProperty('content');
expect(Array.isArray(result.content)).toBe(true);
expect(result.content[0]).toHaveProperty('type');
expect(result.content[0]).toHaveProperty('text');
expect(result.content[0].type).toBe('text');
```

### 3. Testing PROMPT_ONLY Mode

```typescript
// Verify prompts are returned without LLM execution
const result = await analyzeTool.execute({ branch: 'main' });
expect(result.content[0].text).toContain('LLM Analysis Workflow');
expect(result.content[0].text).toContain('prompts sequentially');
expect(result.content[0].text).not.toContain('Analysis Complete');
```

### 4. Testing Deterministic Analysis

```typescript
// DevOps cost estimation should run without LLM
const result = await analyzeTool.execute({ branch: 'main' });
expect(result.content[0].text).toContain('DevOps Cost Estimates');
expect(result.content[0].text).toContain('Static Analysis Results');
```

## Running Tests

```bash
# Run all tests
npm test

# Run MCP tests only
npm test -- tests/mcp

# Run specific test file
npm test -- tests/mcp/services/git.service.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Test Coverage Goals

- **Services**: ≥80% line coverage
- **Tools**: ≥75% line coverage (integration tests)
- **Critical paths**: 100% coverage (error handling, MCP response format)

## Testing Principles

1. **Isolation**: Unit tests mock all external dependencies
2. **Integration**: Integration tests verify real component interactions
3. **Fast Execution**: Tests run quickly with minimal I/O
4. **Reliable**: Tests are deterministic and don't depend on external services
5. **MCP Compliance**: Verify proper MCP protocol response formats

## Mocking Strategy

### External Services
- **Git commands**: Mocked via `child_process.execSync`
- **File system**: Temporary directories for test isolation
- **Database**: In-memory SQLite or temp files
- **LLM calls**: Not executed in MCP server (PROMPT_ONLY mode)

### Internal Services
- **DashboardService**: Mocked in tool tests
- **Config loader**: Mocked to return test configurations
- **Branch resolver**: Mocked to avoid GitHub API calls

## Common Test Utilities

### Temporary Test Directories

```typescript
beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-agent-test-'));
});

afterEach(() => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
```

### Mock Git Repository

```typescript
(childProcess.execSync as jest.Mock).mockImplementation((cmd: any) => {
  const command = String(cmd);
  if (command.includes('git rev-parse --abbrev-ref HEAD')) {
    return Buffer.from('feature/test-branch');
  }
  if (command.includes('git remote get-url origin')) {
    return Buffer.from('https://github.com/owner/repo.git');
  }
  return Buffer.from('');
});
```

## References

- [MCP Best Practices](https://modelcontextprotocol.info/docs/best-practices/)
- [MCP Unit Testing Guide](https://milvus.io/ai-quick-reference/how-do-i-write-unit-tests-for-model-context-protocol-mcp-tools-and-resources)
- [MCP Testing Framework](https://github.com/haakco/mcp-testing-framework)
- [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Contributing

When adding new MCP server features:

1. Add unit tests for new services
2. Add integration tests for new tools
3. Verify MCP protocol compliance
4. Test error handling paths
5. Update this README with new patterns
