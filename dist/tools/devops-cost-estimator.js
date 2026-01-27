/**
 * DevOps Cost Estimator Tool for PR Analysis
 * Estimates AWS infrastructure costs for DevOps-related changes (IaC, Dockerfiles, etc.)
 * Uses MCP to connect to AWS for cost estimation when available
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
// DevOps file patterns
const DEVOPS_PATTERNS = {
    terraform: [/\.tf$/, /\.tfvars$/],
    cloudformation: [/template\.(yaml|yml|json)$/, /cloudformation\.(yaml|yml|json)$/],
    cdk: [/cdk\.json$/, /\.ts$.*cdk/],
    pulumi: [/Pulumi\.(yaml|yml)$/, /pulumi\..*\.(ts|js|py|go)$/],
    docker: [/Dockerfile/, /docker-compose\.(yaml|yml)$/],
    kubernetes: [/k8s.*\.(yaml|yml)$/, /kubernetes.*\.(yaml|yml)$/, /\.kube.*\.(yaml|yml)$/],
    github_actions: [/\.github\/workflows\/.*\.(yaml|yml)$/],
    serverless: [/serverless\.(yaml|yml|json)$/],
};
// AWS resource cost estimates (monthly USD, approximate)
const AWS_RESOURCE_COSTS = {
    'ec2-t3.micro': { min: 8, typical: 8.5, max: 10 },
    'ec2-t3.small': { min: 15, typical: 17, max: 20 },
    'ec2-t3.medium': { min: 30, typical: 34, max: 40 },
    'ec2-t3.large': { min: 60, typical: 68, max: 80 },
    'ec2-m5.large': { min: 70, typical: 80, max: 95 },
    'ec2-m5.xlarge': { min: 140, typical: 160, max: 190 },
    'lambda-1m-invocations': { min: 0.2, typical: 0.4, max: 2 },
    'lambda-10m-invocations': { min: 2, typical: 4, max: 20 },
    's3-storage-gb': { min: 0.023, typical: 0.023, max: 0.025 },
    's3-requests-1k': { min: 0.004, typical: 0.005, max: 0.006 },
    'rds-db.t3.micro': { min: 13, typical: 15, max: 18 },
    'rds-db.t3.small': { min: 26, typical: 30, max: 35 },
    'rds-db.t3.medium': { min: 52, typical: 60, max: 70 },
    'rds-db.m5.large': { min: 140, typical: 160, max: 190 },
    'ecs-task-256cpu-512mem': { min: 10, typical: 12, max: 15 },
    'ecs-task-512cpu-1024mem': { min: 20, typical: 24, max: 30 },
    'ecs-task-1024cpu-2048mem': { min: 40, typical: 48, max: 60 },
    'alb': { min: 16, typical: 22, max: 30 },
    'nat-gateway': { min: 32, typical: 45, max: 60 },
    'elasticache-t3.micro': { min: 12, typical: 15, max: 18 },
    'cloudfront-1tb': { min: 85, typical: 100, max: 120 },
    'api-gateway-1m-requests': { min: 3.5, typical: 4, max: 5 },
    'sqs-1m-requests': { min: 0.4, typical: 0.5, max: 0.6 },
    'sns-1m-notifications': { min: 0.5, typical: 0.6, max: 0.7 },
    'dynamodb-25wcu-25rcu': { min: 25, typical: 30, max: 40 },
};
/**
 * Check if a file is a DevOps-related file
 */
export function isDevOpsFile(filePath) {
    for (const [type, patterns] of Object.entries(DEVOPS_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(filePath)) {
                return { isDevOps: true, type };
            }
        }
    }
    return { isDevOps: false, type: null };
}
/**
 * Extract AWS resources from Terraform content
 */
function extractTerraformResources(content) {
    const resources = [];
    // Match resource blocks - handles both regular files and diff format (with + prefix)
    const resourceRegex = /^[\+\s]*resource\s+"([^"]+)"\s+"([^"]+)"/gm;
    let match;
    console.error(`[DevOps] Extracting Terraform resources from content length: ${content.length}`);
    console.error(`[DevOps] First 200 chars: ${content.substring(0, 200)}`);
    while ((match = resourceRegex.exec(content)) !== null) {
        const resourceType = match[1];
        const resourceName = match[2];
        console.error(`[DevOps] Found resource: ${resourceType} "${resourceName}"`);
        // Map Terraform resources to our cost categories
        if (resourceType.startsWith('aws_instance')) {
            resources.push({ resource: resourceName, type: 'ec2' });
        }
        else if (resourceType.startsWith('aws_lambda')) {
            resources.push({ resource: resourceName, type: 'lambda' });
        }
        else if (resourceType.startsWith('aws_s3')) {
            resources.push({ resource: resourceName, type: 's3' });
        }
        else if (resourceType.startsWith('aws_rds') || resourceType.startsWith('aws_db')) {
            resources.push({ resource: resourceName, type: 'rds' });
        }
        else if (resourceType.startsWith('aws_ecs')) {
            resources.push({ resource: resourceName, type: 'ecs' });
        }
        else if (resourceType.startsWith('aws_alb') || resourceType.startsWith('aws_lb')) {
            resources.push({ resource: resourceName, type: 'alb' });
        }
        else if (resourceType.startsWith('aws_nat')) {
            resources.push({ resource: resourceName, type: 'nat-gateway' });
        }
        else if (resourceType.startsWith('aws_elasticache')) {
            resources.push({ resource: resourceName, type: 'elasticache' });
        }
        else if (resourceType.startsWith('aws_cloudfront')) {
            resources.push({ resource: resourceName, type: 'cloudfront' });
        }
        else if (resourceType.startsWith('aws_api_gateway') || resourceType.startsWith('aws_apigatewayv2')) {
            resources.push({ resource: resourceName, type: 'api-gateway' });
        }
        else if (resourceType.startsWith('aws_sqs')) {
            resources.push({ resource: resourceName, type: 'sqs' });
        }
        else if (resourceType.startsWith('aws_sns')) {
            resources.push({ resource: resourceName, type: 'sns' });
        }
        else if (resourceType.startsWith('aws_dynamodb')) {
            resources.push({ resource: resourceName, type: 'dynamodb' });
        }
    }
    console.error(`[DevOps] Extracted ${resources.length} Terraform resources`);
    return resources;
}
/**
 * Extract AWS resources from CloudFormation content
 */
function extractCloudFormationResources(content) {
    const resources = [];
    // Simple pattern matching for CFN resources
    const typeMap = {
        'AWS::EC2::Instance': 'ec2',
        'AWS::Lambda::Function': 'lambda',
        'AWS::S3::Bucket': 's3',
        'AWS::RDS::DBInstance': 'rds',
        'AWS::ECS::Service': 'ecs',
        'AWS::ECS::TaskDefinition': 'ecs',
        'AWS::ElasticLoadBalancingV2::LoadBalancer': 'alb',
        'AWS::EC2::NatGateway': 'nat-gateway',
        'AWS::ElastiCache::CacheCluster': 'elasticache',
        'AWS::CloudFront::Distribution': 'cloudfront',
        'AWS::ApiGateway::RestApi': 'api-gateway',
        'AWS::ApiGatewayV2::Api': 'api-gateway',
        'AWS::SQS::Queue': 'sqs',
        'AWS::SNS::Topic': 'sns',
        'AWS::DynamoDB::Table': 'dynamodb',
    };
    for (const [awsType, costType] of Object.entries(typeMap)) {
        if (content.includes(awsType)) {
            // Try to extract logical ID
            const regex = new RegExp(`(\\w+):\\s*\\n\\s*Type:\\s*['"]?${awsType.replace(/::/g, '::')}`, 'g');
            const matches = content.matchAll(regex);
            for (const match of matches) {
                resources.push({ resource: match[1] || costType, type: costType });
            }
            // Fallback if no match found but type exists
            if (resources.filter(r => r.type === costType).length === 0) {
                resources.push({ resource: costType, type: costType });
            }
        }
    }
    return resources;
}
/**
 * Estimate cost for a resource type
 */
function estimateResourceCost(resourceType) {
    // Find matching cost entry
    let costKey = '';
    let confidence = 'low';
    switch (resourceType) {
        case 'ec2':
            costKey = 'ec2-t3.medium';
            confidence = 'medium';
            break;
        case 'lambda':
            costKey = 'lambda-1m-invocations';
            confidence = 'low';
            break;
        case 's3':
            costKey = 's3-storage-gb';
            confidence = 'low';
            break;
        case 'rds':
            costKey = 'rds-db.t3.small';
            confidence = 'medium';
            break;
        case 'ecs':
            costKey = 'ecs-task-512cpu-1024mem';
            confidence = 'medium';
            break;
        case 'alb':
            costKey = 'alb';
            confidence = 'high';
            break;
        case 'nat-gateway':
            costKey = 'nat-gateway';
            confidence = 'high';
            break;
        case 'elasticache':
            costKey = 'elasticache-t3.micro';
            confidence = 'medium';
            break;
        case 'cloudfront':
            costKey = 'cloudfront-1tb';
            confidence = 'low';
            break;
        case 'api-gateway':
            costKey = 'api-gateway-1m-requests';
            confidence = 'low';
            break;
        case 'sqs':
            costKey = 'sqs-1m-requests';
            confidence = 'low';
            break;
        case 'sns':
            costKey = 'sns-1m-notifications';
            confidence = 'low';
            break;
        case 'dynamodb':
            costKey = 'dynamodb-25wcu-25rcu';
            confidence = 'low';
            break;
        default:
            return {
                resource: resourceType,
                resourceType,
                estimatedNewCost: 0,
                confidence: 'low',
                details: 'Unknown resource type - manual estimation required',
            };
    }
    const cost = AWS_RESOURCE_COSTS[costKey];
    if (!cost) {
        return {
            resource: resourceType,
            resourceType,
            estimatedNewCost: 0,
            confidence: 'low',
            details: 'Cost data not available',
        };
    }
    return {
        resource: resourceType,
        resourceType,
        estimatedNewCost: cost.typical,
        confidence,
        details: `Estimated $${cost.min.toFixed(2)} - $${cost.max.toFixed(2)}/month`,
    };
}
/**
 * Analyze DevOps files and estimate costs
 */
export function analyzeDevOpsFiles(files) {
    console.error(`[DevOps] Analyzing ${files.length} files`);
    const devOpsFiles = files.filter(f => isDevOpsFile(f.path).isDevOps);
    console.error(`[DevOps] Found ${devOpsFiles.length} DevOps files:`, devOpsFiles.map(f => f.path));
    if (devOpsFiles.length === 0) {
        return {
            hasDevOpsChanges: false,
            fileTypes: [],
            estimates: [],
            totalEstimatedCost: 0,
        };
    }
    const fileTypes = new Set();
    const allResources = [];
    for (const file of devOpsFiles) {
        const { type } = isDevOpsFile(file.path);
        if (type)
            fileTypes.add(type);
        console.error(`[DevOps] Processing file: ${file.path} (type: ${type})`);
        // Get the full content (in real scenario, we'd read the file)
        // For now, analyze the diff
        const content = file.diff;
        if (type === 'terraform') {
            allResources.push(...extractTerraformResources(content));
        }
        else if (type === 'cloudformation') {
            allResources.push(...extractCloudFormationResources(content));
        }
        // Add more extractors for other IaC types as needed
    }
    // Estimate costs for each resource
    const estimates = [];
    const seenTypes = new Set();
    console.error(`[DevOps] Total resources found: ${allResources.length}`);
    for (const resource of allResources) {
        if (!seenTypes.has(resource.type)) {
            seenTypes.add(resource.type);
            const estimate = estimateResourceCost(resource.type);
            console.error(`[DevOps] Estimated cost for ${resource.type}: $${estimate.estimatedNewCost}/month`);
            estimates.push(estimate);
        }
    }
    const totalEstimatedCost = estimates.reduce((sum, e) => sum + e.estimatedNewCost, 0);
    console.error(`[DevOps] Final: ${estimates.length} estimates, total: $${totalEstimatedCost}/month`);
    return {
        hasDevOpsChanges: true,
        fileTypes: Array.from(fileTypes),
        estimates,
        totalEstimatedCost,
    };
}
/**
 * Create DevOps cost estimator tool
 */
export function createDevOpsCostEstimatorTool() {
    return new DynamicStructuredTool({
        name: 'estimate_devops_costs',
        description: 'Analyze DevOps/IaC files and estimate AWS infrastructure costs',
        schema: z.object({
            files: z.array(z.object({
                path: z.string(),
                diff: z.string(),
            })).describe('Array of changed files to analyze'),
            awsCredentials: z.object({
                accessKeyId: z.string().optional(),
                secretAccessKey: z.string().optional(),
                region: z.string().optional(),
            }).optional().describe('AWS credentials for live cost lookup (optional)'),
        }),
        func: async ({ files }) => {
            const analysis = analyzeDevOpsFiles(files);
            if (!analysis.hasDevOpsChanges) {
                return JSON.stringify({
                    hasDevOpsChanges: false,
                    message: 'No DevOps/IaC files detected in changes',
                });
            }
            return JSON.stringify({
                hasDevOpsChanges: true,
                fileTypes: analysis.fileTypes,
                estimates: analysis.estimates,
                totalEstimatedCost: analysis.totalEstimatedCost,
                message: `Detected ${analysis.fileTypes.join(', ')} changes. Estimated monthly cost impact: $${analysis.totalEstimatedCost.toFixed(2)}`,
                disclaimer: 'Cost estimates are approximate and based on typical resource sizes. Actual costs depend on usage patterns, region, and specific configurations.',
            });
        },
    });
}
/**
 * Format cost estimates for display
 */
export function formatCostEstimates(estimates, totalCost) {
    if (estimates.length === 0) {
        return 'No cost estimates available';
    }
    let output = '💰 AWS Cost Estimates\n\n';
    for (const estimate of estimates) {
        const emoji = estimate.confidence === 'high' ? '🟢' : estimate.confidence === 'medium' ? '🟡' : '🔴';
        output += `${emoji} ${estimate.resourceType.toUpperCase()}: ~$${estimate.estimatedNewCost.toFixed(2)}/month\n`;
        if (estimate.details) {
            output += `   ${estimate.details}\n`;
        }
    }
    output += `\n📊 Total Estimated Impact: ~$${totalCost.toFixed(2)}/month\n`;
    output += '\n⚠️  Estimates are approximate. Actual costs depend on usage and configuration.\n';
    return output;
}
//# sourceMappingURL=devops-cost-estimator.js.map