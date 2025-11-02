import { 
  AnalysisAgent, 
  createComprehensiveAgent, 
  createFocusedAgent, 
  createSmartAgent,
  ComprehensiveStrategy,
  FocusedStrategy,
  SmartStrategy
} from '../src/agent';
import { 
  CodeQualityTool, 
  SecurityTool, 
  PerformanceTool,
  ToolRegistry,
  AnalysisContext,
  AgentConfig
} from '../src/agentic-tools';

// Mock Anthropic SDK for testing
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Mock analysis result'
          }
        ]
      })
    }
  }))
}));

describe('AnalysisAgent', () => {
  let mockConfig: AgentConfig;
  let mockContext: AnalysisContext;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-api-key',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.2,
      maxTokens: 2000
    };

    mockContext = {
      diff: 'diff --git a/test.js b/test.js\n+console.log("test");',
      prTitle: 'Test PR',
      repository: 'test/repo',
      author: 'testuser'
    };
  });

  describe('Agent Creation', () => {
    test('should create comprehensive agent', () => {
      const agent = createComprehensiveAgent(mockConfig);
      expect(agent).toBeInstanceOf(AnalysisAgent);
      expect(agent.getAvailableTools()).toHaveLength(6); // All tools
    });

    test('should create focused agent with specific tools', () => {
      const agent = createFocusedAgent(mockConfig, ['security', 'code-quality']);
      expect(agent).toBeInstanceOf(AnalysisAgent);
    });

    test('should create smart agent', () => {
      const agent = createSmartAgent(mockConfig);
      expect(agent).toBeInstanceOf(AnalysisAgent);
    });
  });

  describe('Tool Registry', () => {
    test('should register and retrieve tools', () => {
      const registry = new ToolRegistry(mockConfig);
      
      expect(registry.hasTool('security')).toBe(true);
      expect(registry.hasTool('code-quality')).toBe(true);
      expect(registry.hasTool('performance')).toBe(true);
      expect(registry.hasTool('testing')).toBe(true);
      expect(registry.hasTool('architecture')).toBe(true);
      expect(registry.hasTool('accessibility')).toBe(true);
      
      expect(registry.getToolNames()).toHaveLength(6);
    });

    test('should return undefined for non-existent tool', () => {
      const registry = new ToolRegistry(mockConfig);
      expect(registry.getTool('non-existent')).toBeUndefined();
    });
  });

  describe('Strategy Patterns', () => {
    test('ComprehensiveStrategy should select all tools', () => {
      const strategy = new ComprehensiveStrategy();
      const tools = [
        { name: 'security', description: 'Security analysis', execute: jest.fn() },
        { name: 'code-quality', description: 'Code quality analysis', execute: jest.fn() }
      ] as any[];

      const selected = strategy.selectTools(mockContext, tools);
      expect(selected).toHaveLength(2);
    });

    test('FocusedStrategy should select only specified tools', () => {
      const strategy = new FocusedStrategy(['security']);
      const tools = [
        { name: 'security', description: 'Security analysis', execute: jest.fn() },
        { name: 'code-quality', description: 'Code quality analysis', execute: jest.fn() }
      ] as any[];

      const selected = strategy.selectTools(mockContext, tools);
      expect(selected).toHaveLength(1);
      expect(selected[0].name).toBe('security');
    });

    test('FocusedStrategy should prioritize tools correctly', () => {
      const strategy = new FocusedStrategy(['code-quality', 'security']);
      const tools = [
        { name: 'security', description: 'Security analysis', execute: jest.fn() },
        { name: 'code-quality', description: 'Code quality analysis', execute: jest.fn() }
      ] as any[];

      const prioritized = strategy.prioritizeTools(tools);
      expect(prioritized[0].name).toBe('code-quality');
      expect(prioritized[1].name).toBe('security');
    });
  });

  describe('Tool Execution', () => {
    test('CodeQualityTool should execute successfully', async () => {
      const tool = new CodeQualityTool(mockConfig);
      const result = await tool.execute({
        diff: mockContext.diff,
        prTitle: mockContext.prTitle
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.tool).toBe('code-quality');
    });

    test('SecurityTool should execute successfully', async () => {
      const tool = new SecurityTool(mockConfig);
      const result = await tool.execute({
        diff: mockContext.diff,
        prTitle: mockContext.prTitle
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.tool).toBe('security');
    });

    test('PerformanceTool should execute successfully', async () => {
      const tool = new PerformanceTool(mockConfig);
      const result = await tool.execute({
        diff: mockContext.diff,
        prTitle: mockContext.prTitle
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.tool).toBe('performance');
    });
  });

  describe('Agent Analysis', () => {
    test('should execute analysis with comprehensive strategy', async () => {
      const agent = createComprehensiveAgent(mockConfig);
      const result = await agent.analyze(mockContext);

      expect(result.success).toBe(true);
      expect(result.toolsUsed.length).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.results.size).toBeGreaterThan(0);
    });

    test('should execute analysis with focused strategy', async () => {
      const agent = createFocusedAgent(mockConfig, ['security', 'code-quality']);
      const result = await agent.analyze(mockContext);

      expect(result.success).toBe(true);
      expect(result.toolsUsed).toContain('security');
      expect(result.toolsUsed).toContain('code-quality');
      expect(result.toolsUsed.length).toBeLessThanOrEqual(2);
    });

    test('should handle analysis errors gracefully', async () => {
      // Create agent with invalid config to trigger errors
      const invalidConfig = { ...mockConfig, apiKey: 'invalid-key' };
      const agent = createComprehensiveAgent(invalidConfig);
      
      // Mock the tool execution to fail
      const mockTool = {
        name: 'test-tool',
        description: 'Test tool',
        execute: jest.fn().mockRejectedValue(new Error('Tool execution failed'))
      };
      
      agent.registerTool(mockTool as any);
      
      const result = await agent.analyze(mockContext);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Agent Configuration', () => {
    test('should allow changing strategy', () => {
      const agent = createComprehensiveAgent(mockConfig);
      const focusedStrategy = new FocusedStrategy(['security']);
      
      agent.setStrategy(focusedStrategy);
      
      // Strategy should be changed (we can't directly test this without exposing internals)
      expect(agent).toBeDefined();
    });

    test('should allow registering custom tools', () => {
      const agent = createComprehensiveAgent(mockConfig);
      const customTool = {
        name: 'custom-tool',
        description: 'Custom analysis tool',
        execute: jest.fn().mockResolvedValue({
          success: true,
          result: { analysis: 'Custom analysis' }
        })
      };

      agent.registerTool(customTool as any);
      
      const tools = agent.getAvailableTools();
      expect(tools.some(tool => tool.name === 'custom-tool')).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  test('should work with real diff format', async () => {
    const config: AgentConfig = {
      apiKey: 'test-api-key',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.2,
      maxTokens: 2000
    };

    const context: AnalysisContext = {
      diff: `diff --git a/src/app.js b/src/app.js
index 1234567..abcdefg 100644
--- a/src/app.js
+++ b/src/app.js
@@ -1,3 +1,5 @@
 const express = require('express');
 const app = express();
+
+app.get('/api/test', (req, res) => {
+  res.json({ message: 'Hello World' });
+});
 
 app.listen(3000, () => {
   console.log('Server running on port 3000');
 });`,
      prTitle: 'Add test API endpoint',
      repository: 'test/repo',
      author: 'developer'
    };

    const agent = createFocusedAgent(config, ['security', 'code-quality']);
    const result = await agent.analyze(context);

    expect(result.success).toBe(true);
    expect(result.toolsUsed).toContain('security');
    expect(result.toolsUsed).toContain('code-quality');
  });
});
