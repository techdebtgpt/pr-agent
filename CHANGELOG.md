# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-12-22

### Added

- **Test Suggestions**: Automatically detects code changes without corresponding tests and generates copyable test templates
  - Supports Jest, Mocha, Vitest, pytest, and unittest frameworks
  - Auto-detects testing framework from project configuration
  - Suggests appropriate test file paths based on project structure

- **Coverage Reporting**: Reports test coverage percentage when a coverage tool is configured
  - Supports Jest/NYC JSON, lcov, and Cobertura XML formats
  - Only runs when coverage tool is detected in project (per user preference)
  - Shows overall percentage, line coverage, and branch coverage

- **DevOps Cost Estimation**: Estimates AWS infrastructure costs for DevOps-related changes
  - Detects Terraform, CloudFormation, CDK, Pulumi, Docker, and Kubernetes files
  - Built-in pricing data for EC2, Lambda, S3, RDS, ECS, ALB, NAT Gateway, and more
  - Shows confidence level for each estimate

- **Enhanced CLI Output**: New sections in `pr-agent analyze` output
  - 🧪 Test Suggestions section with copyable test code
  - 📊 Coverage Report section with percentage and file breakdown
  - 💰 AWS Cost Estimates section with monthly cost impact

### New Files

- `src/tools/test-suggestion-tool.ts` - Test framework detection and test generation
- `src/tools/coverage-reporter.ts` - Coverage report parsing and formatting
- `src/tools/devops-cost-estimator.ts` - IaC file detection and AWS cost estimation

### Changed

- `src/types/agent.types.ts` - Added `CodeSuggestion`, `TestSuggestion`, `DevOpsCostEstimate`, and `CoverageReport` interfaces
- `src/tools/index.ts` - Exports for new tools
- `src/cli/commands/analyze.command.ts` - Display sections for new features

## [0.1.0] - Initial Release

### Added

- Basic PR analysis with AI (summary, risks, complexity)
- Architecture documentation integration (.arch-docs)
- Multi-provider support (Anthropic, OpenAI, Google)
- CLI interface with `pr-agent analyze` command
- GitHub Action support
- Self-refinement workflow using LangGraph
