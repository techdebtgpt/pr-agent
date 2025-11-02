"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const analyzer_1 = require("./analyzer");
async function run() {
    try {
        const configPath = core.getInput('config-path');
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const ghToken = process.env.GITHUB_TOKEN;
        if (!apiKey) {
            core.setFailed('ANTHROPIC_API_KEY environment variable is required');
            return;
        }
        if (!ghToken) {
            core.setFailed('GITHUB_TOKEN environment variable is required');
            return;
        }
        const { context } = github;
        const { pull_request: pr, repository } = context.payload;
        if (!pr) {
            core.setFailed('This action can only be run on pull request events');
            return;
        }
        core.info(`Analyzing PR #${pr.number} in ${repository?.full_name}`);
        // Get PR diffs
        const diff = await getPRDiffs(context, ghToken);
        if (!diff) {
            core.warning('No changes found in the pull request');
            return;
        }
        const octokit = github.getOctokit(ghToken);
        // Analyze with Claude
        const summary = await (0, analyzer_1.analyzeWithClaude)(diff, pr.title, apiKey);
        // Post comment
        await postComment(context, pr.number, summary, repository, ghToken);
    }
    catch (error) {
        core.setFailed(`Action failed with error: ${error}`);
    }
}
async function getPRDiffs(context, ghToken) {
    try {
        const { pull_request: pr, repository } = context.payload;
        const octokit = github.getOctokit(ghToken);
        const { data: files } = await octokit.rest.pulls.listFiles({
            owner: repository.owner.login,
            repo: repository.name,
            pull_number: pr.number
        });
        return files.map((f) => `--- ${f.filename}\n${f.patch}`).join('\n');
    }
    catch (error) {
        core.error('Error fetching PR diff:');
        core.error(String(error));
        throw new Error('Failed to fetch PR diff');
    }
}
async function postComment(context, prNumber, summary, repository, ghToken) {
    try {
        const octokit = github.getOctokit(ghToken);
        await octokit.rest.issues.createComment({
            owner: repository.owner.login,
            repo: repository.name,
            issue_number: prNumber,
            body: `## 🤖 AI Analysis (PR Agent by TechDebtGPT)\n\n${summary}`
        });
    }
    catch (error) {
        core.error('Error posting comment:');
        core.error(String(error));
        throw new Error('Failed to post comment');
    }
}
run();
//# sourceMappingURL=action.js.map