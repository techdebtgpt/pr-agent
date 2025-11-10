# Flow Visualizations

PR Agent is a CLI-based tool that analyzes pull requests using multiple AI providers (Anthropic, Google, OpenAI). The system features a provider abstraction pattern, CLI-driven workflows, and tool-based PR analysis capabilities. Key flows include AI provider selection, PR analysis processing, and CLI command execution.

## Identified Flows

### AI Provider Architecture

**Type**: component-flow

Shows how the system abstracts multiple AI providers through a unified interface and delegates requests to specific implementations

#### Diagram

> 💡 **Tip**: View this diagram with a Mermaid renderer:
> - VS Code: Install "Markdown Preview Mermaid Support" extension
> - GitHub/GitLab: Automatic rendering in markdown preview
> - Online: Copy to [mermaid.live](https://mermaid.live)

<details>
<summary>📊 Click to view component-flow diagram</summary>

```mermaid
graph TD
    A[CLI Entry Point] --> B[Provider Factory]
    B --> C{Select Provider}
    C -->|anthropic| D[Anthropic Provider]
    C -->|google| E[Google Provider]
    C -->|openai| F[OpenAI Provider]
    D --> G[Anthropic API]
    E --> H[Google Gemini API]
    F --> I[OpenAI API]
    G --> J[Response Normalizer]
    H --> J
    I --> J
    J --> K[PR Analysis Result]
    K --> L[Output Formatter]
```

</details>

#### Key Insights

- Provider pattern enables easy addition of new AI services without changing core logic
- Response normalization ensures consistent output format regardless of provider
- Factory pattern centralizes provider instantiation and configuration
- Each provider encapsulates API-specific authentication and request formatting

### PR Analysis Workflow

**Type**: process-flow

End-to-end process of analyzing a pull request from CLI invocation to result output

#### Diagram

> 💡 **Tip**: View this diagram with a Mermaid renderer:
> - VS Code: Install "Markdown Preview Mermaid Support" extension
> - GitHub/GitLab: Automatic rendering in markdown preview
> - Online: Copy to [mermaid.live](https://mermaid.live)

<details>
<summary>📊 Click to view process-flow diagram</summary>

```mermaid
graph TD
    A[User Executes CLI Command] --> B[Parse Arguments]
    B --> C[Load Configuration]
    C --> D[Fetch PR Data]
    D --> E{PR Data Valid?}
    E -->|No| F[Error Handler]
    E -->|Yes| G[Initialize Tools]
    G --> H[Select AI Provider]
    H --> I[Build Analysis Prompt]
    I --> J[Send to AI Provider]
    J --> K[Receive AI Response]
    K --> L[Parse & Validate Response]
    L --> M[Format Output]
    M --> N{Output Format}
    N -->|JSON| O[JSON Output]
    N -->|Markdown| P[Markdown Output]
    N -->|Console| Q[Console Output]
    F --> R[Exit with Error]
    O --> S[Success Exit]
    P --> S
    Q --> S
```

</details>

#### Key Insights

- Multi-stage validation ensures data integrity before expensive AI calls
- Tool initialization happens after PR data validation to optimize performance
- Multiple output formats support different integration scenarios
- Error handling is centralized for consistent user experience
- Configuration loading is separate from execution for testability

### AI Provider Request/Response Cycle

**Type**: api-flow

Detailed flow of how requests are constructed, sent to AI providers, and responses are processed

#### Diagram

> 💡 **Tip**: View this diagram with a Mermaid renderer:
> - VS Code: Install "Markdown Preview Mermaid Support" extension
> - GitHub/GitLab: Automatic rendering in markdown preview
> - Online: Copy to [mermaid.live](https://mermaid.live)

<details>
<summary>📊 Click to view api-flow diagram</summary>

```mermaid
sequenceDiagram
    participant CLI
    participant Provider
    participant APIClient
    participant AIService
    participant ResponseParser
    
    CLI->>Provider: analyzePR(prData, config)
    Provider->>Provider: validateConfig()
    Provider->>Provider: buildPrompt(prData)
    Provider->>APIClient: createRequest(prompt, options)
    APIClient->>APIClient: addAuthentication()
    APIClient->>APIClient: setHeaders()
    APIClient->>AIService: POST /api/analyze
    AIService-->>APIClient: 200 OK (AI Response)
    APIClient-->>Provider: rawResponse
    Provider->>ResponseParser: parse(rawResponse)
    ResponseParser->>ResponseParser: extractContent()
    ResponseParser->>ResponseParser: validateSchema()
    ResponseParser-->>Provider: normalizedResponse
    Provider-->>CLI: analysisResult
```

</details>

#### Key Insights

- Authentication is handled at the API client level for security
- Prompt building is provider-specific to optimize for each AI model
- Response parsing includes schema validation to catch API changes
- Synchronous flow simplifies error handling and debugging
- Configuration validation happens early to fail fast

### PR Data Processing Pipeline

**Type**: data-flow

How pull request data flows from source through analysis to final output

#### Diagram

> 💡 **Tip**: View this diagram with a Mermaid renderer:
> - VS Code: Install "Markdown Preview Mermaid Support" extension
> - GitHub/GitLab: Automatic rendering in markdown preview
> - Online: Copy to [mermaid.live](https://mermaid.live)

<details>
<summary>📊 Click to view data-flow diagram</summary>

```mermaid
graph TD
    A[Git Repository/API] --> B[PR Data Fetcher]
    B --> C[Raw PR Data]
    C --> D[Data Normalizer]
    D --> E[Normalized PR Object]
    E --> F{Include Files?}
    F -->|Yes| G[File Content Fetcher]
    F -->|No| H[Metadata Only]
    G --> I[Diff Analyzer]
    H --> J[PR Context Builder]
    I --> J
    J --> K[Context Object]
    K --> L[Prompt Generator]
    L --> M[AI Provider]
    M --> N[Analysis Response]
    N --> O[Response Enricher]
    E --> O
    O --> P[Final Analysis]
    P --> Q[Output Serializer]
    Q --> R[User Output]
```

</details>

#### Key Insights

- Data normalization early in pipeline ensures consistent processing
- Conditional file fetching optimizes performance for metadata-only analysis
- Diff analysis provides granular change context to AI models
- Response enrichment combines AI output with original PR data
- Separation of fetching and processing enables caching strategies
- Context building aggregates multiple data sources into unified structure

### CLI Command Execution Flow

**Type**: process-flow

How CLI commands are parsed, validated, and routed to appropriate handlers

#### Diagram

> 💡 **Tip**: View this diagram with a Mermaid renderer:
> - VS Code: Install "Markdown Preview Mermaid Support" extension
> - GitHub/GitLab: Automatic rendering in markdown preview
> - Online: Copy to [mermaid.live](https://mermaid.live)

<details>
<summary>📊 Click to view process-flow diagram</summary>

```mermaid
graph TD
    A[CLI Entry] --> B[Argument Parser]
    B --> C{Command Type}
    C -->|analyze| D[Analyze Command Handler]
    C -->|review| E[Review Command Handler]
    C -->|config| F[Config Command Handler]
    C -->|help| G[Help Command Handler]
    D --> H[Validate PR Input]
    E --> H
    H --> I{Valid Input?}
    I -->|No| J[Show Error & Usage]
    I -->|Yes| K[Load User Config]
    K --> L[Merge with Defaults]
    L --> M[Initialize Services]
    M --> N[Execute Command]
    N --> O[Handle Result]
    O --> P{Success?}
    P -->|Yes| Q[Format Success Output]
    P -->|No| R[Format Error Output]
    F --> S[Config Operations]
    G --> T[Display Help]
    J --> U[Exit Code 1]
    Q --> V[Exit Code 0]
    R --> U
    S --> V
    T --> V
```

</details>

#### Key Insights

- Command routing happens early to minimize unnecessary processing
- Configuration merging follows precedence: CLI args > user config > defaults
- Service initialization is deferred until command validation passes
- Consistent error handling across all command types
- Help and config commands bypass heavy initialization for speed
- Exit codes follow Unix conventions for scripting integration

### Tool System Integration

**Type**: component-flow

How analysis tools are registered, selected, and applied during PR analysis

#### Diagram

> 💡 **Tip**: View this diagram with a Mermaid renderer:
> - VS Code: Install "Markdown Preview Mermaid Support" extension
> - GitHub/GitLab: Automatic rendering in markdown preview
> - Online: Copy to [mermaid.live](https://mermaid.live)

<details>
<summary>📊 Click to view component-flow diagram</summary>

```mermaid
graph TD
    A[Tool Registry] --> B[Available Tools]
    B --> C[Code Quality Tool]
    B --> D[Security Scanner Tool]
    B --> E[Style Checker Tool]
    B --> F[Test Coverage Tool]
    G[Analysis Request] --> H[Tool Selector]
    H --> I{Config Specifies Tools?}
    I -->|Yes| J[Load Specified Tools]
    I -->|No| K[Load Default Tools]
    J --> L[Tool Executor]
    K --> L
    L --> M[Execute Tools in Parallel]
    C --> M
    D --> M
    E --> M
    F --> M
    M --> N[Collect Results]
    N --> O[Result Aggregator]
    O --> P[Combined Tool Output]
    P --> Q[AI Context Enhancer]
    Q --> R[Enhanced Analysis Request]
```

</details>

#### Key Insights

- Tool registry pattern allows dynamic tool discovery and loading
- Parallel execution of tools improves analysis performance
- Tool results enhance AI prompts with structured data
- Configuration-driven tool selection enables customization
- Result aggregation normalizes output from different tool types
- Tools are loosely coupled to core analysis logic

### Configuration Management Flow

**Type**: data-flow

How configuration is loaded, merged, and applied throughout the application

#### Diagram

> 💡 **Tip**: View this diagram with a Mermaid renderer:
> - VS Code: Install "Markdown Preview Mermaid Support" extension
> - GitHub/GitLab: Automatic rendering in markdown preview
> - Online: Copy to [mermaid.live](https://mermaid.live)

<details>
<summary>📊 Click to view data-flow diagram</summary>

```mermaid
graph TD
    A[Application Start] --> B{Config File Exists?}
    B -->|Yes| C[Load .pragentrc]
    B -->|No| D[Use Defaults]
    C --> E[Parse Config File]
    E --> F{Valid JSON/YAML?}
    F -->|No| G[Config Error]
    F -->|Yes| H[Parsed Config]
    D --> I[Default Config]
    H --> J[Config Merger]
    I --> J
    K[Environment Variables] --> J
    L[CLI Arguments] --> J
    J --> M[Merged Config]
    M --> N[Config Validator]
    N --> O{Valid?}
    O -->|No| G
    O -->|Yes| P[Validated Config]
    P --> Q[Provider Config]
    P --> R[Tool Config]
    P --> S[Output Config]
    Q --> T[Application Runtime]
    R --> T
    S --> T
    G --> U[Exit with Error]
```

</details>

#### Key Insights

- Configuration precedence: CLI args > env vars > config file > defaults
- Validation happens after merging to catch conflicts
- Config is split into domain-specific sections for modularity
- File format flexibility (JSON/YAML) improves user experience
- Invalid configuration fails fast before expensive operations
- Environment variables enable CI/CD integration without file changes

### Error Handling and Retry Logic

**Type**: api-flow

How the system handles API failures, implements retries, and manages error states

#### Diagram

> 💡 **Tip**: View this diagram with a Mermaid renderer:
> - VS Code: Install "Markdown Preview Mermaid Support" extension
> - GitHub/GitLab: Automatic rendering in markdown preview
> - Online: Copy to [mermaid.live](https://mermaid.live)

<details>
<summary>📊 Click to view api-flow diagram</summary>

```mermaid
sequenceDiagram
    participant App
    participant RetryHandler
    participant Provider
    participant API
    
    App->>RetryHandler: executeWithRetry(request)
    RetryHandler->>Provider: makeRequest()
    Provider->>API: HTTP Request
    API-->>Provider: Error (429 Rate Limit)
    Provider-->>RetryHandler: APIError
    RetryHandler->>RetryHandler: checkRetryable(error)
    RetryHandler->>RetryHandler: calculateBackoff(attempt)
    RetryHandler->>RetryHandler: wait(backoffTime)
    RetryHandler->>Provider: makeRequest() [Retry 1]
    Provider->>API: HTTP Request
    API-->>Provider: Error (503 Service Unavailable)
    Provider-->>RetryHandler: APIError
    RetryHandler->>RetryHandler: checkRetryable(error)
    RetryHandler->>RetryHandler: calculateBackoff(attempt)
    RetryHandler->>RetryHandler: wait(backoffTime)
    RetryHandler->>Provider: makeRequest() [Retry 2]
    Provider->>API: HTTP Request
    API-->>Provider: 200 OK
    Provider-->>RetryHandler: Success
    RetryHandler-->>App: Result
```

</details>

#### Key Insights

- Exponential backoff prevents overwhelming failing services
- Retry logic distinguishes between transient and permanent errors
- Rate limit errors trigger longer backoff periods
- Maximum retry attempts prevent infinite loops
- Error context is preserved through retry cycles for debugging
- Successful retries are logged for monitoring and alerting

### Output Formatting Pipeline

**Type**: process-flow

How analysis results are transformed into different output formats based on user preferences

#### Diagram

> 💡 **Tip**: View this diagram with a Mermaid renderer:
> - VS Code: Install "Markdown Preview Mermaid Support" extension
> - GitHub/GitLab: Automatic rendering in markdown preview
> - Online: Copy to [mermaid.live](https://mermaid.live)

<details>
<summary>📊 Click to view process-flow diagram</summary>

```mermaid
graph TD
    A[Analysis Result] --> B[Output Router]
    B --> C{Output Format}
    C -->|json| D[JSON Formatter]
    C -->|markdown| E[Markdown Formatter]
    C -->|html| F[HTML Formatter]
    C -->|console| G[Console Formatter]
    D --> H[JSON Serializer]
    E --> I[Markdown Template Engine]
    F --> J[HTML Template Engine]
    G --> K[ANSI Color Formatter]
    H --> L[Pretty Print JSON]
    I --> M[Apply MD Template]
    J --> N[Apply HTML Template]
    K --> O[Colorize Output]
    L --> P{Output Destination}
    M --> P
    N --> P
    O --> P
    P -->|file| Q[Write to File]
    P -->|stdout| R[Write to Console]
    P -->|api| S[Return as Response]
    Q --> T[Success Confirmation]
    R --> T
    S --> T
```

</details>

#### Key Insights

- Format selection happens early to avoid unnecessary processing
- Template engines enable customizable output layouts
- Console output includes ANSI colors for better readability
- JSON output is pretty-printed by default for human consumption
- Output destination is independent of format for flexibility
- All formatters implement common interface for consistency

### Provider Factory and Initialization

**Type**: component-flow

How AI providers are instantiated, configured, and made available to the application

#### Diagram

> 💡 **Tip**: View this diagram with a Mermaid renderer:
> - VS Code: Install "Markdown Preview Mermaid Support" extension
> - GitHub/GitLab: Automatic rendering in markdown preview
> - Online: Copy to [mermaid.live](https://mermaid.live)

<details>
<summary>📊 Click to view component-flow diagram</summary>

```mermaid
graph TD
    A[Application Bootstrap] --> B[Provider Factory]
    B --> C[Read Provider Config]
    C --> D{Provider Type}
    D -->|anthropic| E[Create Anthropic Provider]
    D -->|google| F[Create Google Provider]
    D -->|openai| G[Create OpenAI Provider]
    E --> H[Validate API Key]
    F --> I[Validate API Key]
    G --> J[Validate API Key]
    H --> K{Key Valid?}
    I --> K
    J --> K
    K -->|No| L[Throw Config Error]
    K -->|Yes| M[Initialize HTTP Client]
    M --> N[Set Base URL]
    N --> O[Configure Timeouts]
    O --> P[Set Headers]
    P --> Q[Add Interceptors]
    Q --> R[Provider Instance]
    R --> S[Provider Registry]
    S --> T[Application Ready]
    L --> U[Exit with Error]
```

</details>

#### Key Insights

- Factory pattern centralizes provider creation logic
- API key validation happens at initialization to fail fast
- HTTP client configuration is provider-specific
- Interceptors enable cross-cutting concerns like logging and retry
- Provider registry enables runtime provider switching
- Initialization errors prevent application startup with invalid config

## Warnings

- ⚠️ Actual implementation details may vary - diagrams are based on common patterns for this type of application
- ⚠️ Authentication flows are simplified as no explicit auth controllers were found
- ⚠️ Some flows assume standard practices for CLI tools and AI provider integrations
- ⚠️ Database/repository flows are minimal as no repository files were detected
- ⚠️ Middleware chains are inferred from typical API flow patterns
- ⚠️ Specific tool implementations are abstracted as the tool system appears extensible
- ⚠️ Error handling flows represent best practices that may need verification in actual code
- ⚠️ Configuration file formats and locations are assumed based on common conventions


---

[← Back to Index](./index.md) | [← Previous: Patterns](./patterns.md) | [Next: Schema Documentation →](./schemas.md)
