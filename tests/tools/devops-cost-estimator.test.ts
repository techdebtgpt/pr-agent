/**
 * Unit tests for DevOps Cost Estimator
 * Tests infrastructure cost estimation for IaC files
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  isDevOpsFile,
  analyzeDevOpsFiles,
  formatCostEstimates,
} from '../../src/tools/devops-cost-estimator.js';

describe('DevOps Cost Estimator', () => {
  describe('isDevOpsFile', () => {
    it('should detect Terraform files', () => {
      expect(isDevOpsFile('main.tf')).toEqual({ isDevOps: true, type: 'terraform' });
      expect(isDevOpsFile('variables.tfvars')).toEqual({ isDevOps: true, type: 'terraform' });
      expect(isDevOpsFile('infrastructure/aws.tf')).toEqual({ isDevOps: true, type: 'terraform' });
    });

    it('should detect CloudFormation files', () => {
      expect(isDevOpsFile('template.yaml')).toEqual({ isDevOps: true, type: 'cloudformation' });
      expect(isDevOpsFile('cloudformation.json')).toEqual({ isDevOps: true, type: 'cloudformation' });
    });

    it('should detect Dockerfile', () => {
      expect(isDevOpsFile('Dockerfile')).toEqual({ isDevOps: true, type: 'docker' });
      expect(isDevOpsFile('docker-compose.yml')).toEqual({ isDevOps: true, type: 'docker' });
    });

    it('should detect Kubernetes files', () => {
      expect(isDevOpsFile('k8s-deployment.yaml')).toEqual({ isDevOps: true, type: 'kubernetes' });
      expect(isDevOpsFile('kubernetes/service.yml')).toEqual({ isDevOps: true, type: 'kubernetes' });
    });

    it('should detect GitHub Actions workflows', () => {
      expect(isDevOpsFile('.github/workflows/deploy.yml')).toEqual({
        isDevOps: true,
        type: 'github_actions',
      });
    });

    it('should detect serverless config', () => {
      expect(isDevOpsFile('serverless.yml')).toEqual({ isDevOps: true, type: 'serverless' });
    });

    it('should return false for non-DevOps files', () => {
      expect(isDevOpsFile('src/index.ts')).toEqual({ isDevOps: false, type: null });
      expect(isDevOpsFile('README.md')).toEqual({ isDevOps: false, type: null });
      expect(isDevOpsFile('package.json')).toEqual({ isDevOps: false, type: null });
    });
  });

  describe('analyzeDevOpsFiles', () => {
    it('should return no changes for empty file list', () => {
      const result = analyzeDevOpsFiles([]);

      expect(result).toEqual({
        hasDevOpsChanges: false,
        fileTypes: [],
        estimates: [],
        totalEstimatedCost: 0,
      });
    });

    it('should return no changes for non-DevOps files', () => {
      const files = [
        { path: 'src/index.ts', diff: 'export const foo = "bar";' },
        { path: 'README.md', diff: '# Title' },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result).toEqual({
        hasDevOpsChanges: false,
        fileTypes: [],
        estimates: [],
        totalEstimatedCost: 0,
      });
    });

    it('should detect Terraform EC2 resources', () => {
      const files = [
        {
          path: 'main.tf',
          diff: `
+resource "aws_instance" "web" {
+  ami           = "ami-123456"
+  instance_type = "t3.medium"
+}`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.hasDevOpsChanges).toBe(true);
      expect(result.fileTypes).toContain('terraform');
      expect(result.estimates.length).toBeGreaterThan(0);
      expect(result.estimates[0].resourceType).toBe('ec2');
      expect(result.estimates[0].estimatedNewCost).toBeGreaterThan(0);
    });

    it('should detect Terraform Lambda resources', () => {
      const files = [
        {
          path: 'lambda.tf',
          diff: `
+resource "aws_lambda_function" "api" {
+  function_name = "my-function"
+  handler       = "index.handler"
+}`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.hasDevOpsChanges).toBe(true);
      expect(result.estimates.some((e) => e.resourceType === 'lambda')).toBe(true);
    });

    it('should detect Terraform RDS resources', () => {
      const files = [
        {
          path: 'database.tf',
          diff: `
+resource "aws_db_instance" "postgres" {
+  engine         = "postgres"
+  instance_class = "db.t3.small"
+}`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.hasDevOpsChanges).toBe(true);
      expect(result.estimates.some((e) => e.resourceType === 'rds')).toBe(true);
    });

    it('should detect Terraform S3 resources', () => {
      const files = [
        {
          path: 'storage.tf',
          diff: `
+resource "aws_s3_bucket" "uploads" {
+  bucket = "my-uploads"
+}`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.hasDevOpsChanges).toBe(true);
      expect(result.estimates.some((e) => e.resourceType === 's3')).toBe(true);
    });

    it('should detect Terraform ECS resources', () => {
      const files = [
        {
          path: 'ecs.tf',
          diff: `
+resource "aws_ecs_cluster" "main" {
+  name = "app-cluster"
+}
+resource "aws_ecs_service" "app" {
+  name = "app-service"
+}`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.hasDevOpsChanges).toBe(true);
      expect(result.estimates.some((e) => e.resourceType === 'ecs')).toBe(true);
    });

    it('should detect Terraform ALB resources', () => {
      const files = [
        {
          path: 'lb.tf',
          diff: `
+resource "aws_lb" "main" {
+  name               = "app-lb"
+  load_balancer_type = "application"
+}`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.hasDevOpsChanges).toBe(true);
      expect(result.estimates.some((e) => e.resourceType === 'alb')).toBe(true);
    });

    it('should calculate total cost for multiple resources', () => {
      const files = [
        {
          path: 'main.tf',
          diff: `
+resource "aws_instance" "web" {
+  instance_type = "t3.medium"
+}
+resource "aws_db_instance" "postgres" {
+  instance_class = "db.t3.small"
+}
+resource "aws_lb" "main" {
+  load_balancer_type = "application"
+}`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.hasDevOpsChanges).toBe(true);
      expect(result.estimates.length).toBeGreaterThanOrEqual(3);
      expect(result.totalEstimatedCost).toBeGreaterThan(0);

      // Should be sum of individual estimates
      const calculatedTotal = result.estimates.reduce(
        (sum, e) => sum + e.estimatedNewCost,
        0
      );
      expect(result.totalEstimatedCost).toBeCloseTo(calculatedTotal, 2);
    });

    it('should deduplicate resource types', () => {
      const files = [
        {
          path: 'main.tf',
          diff: `
+resource "aws_instance" "web1" {
+  instance_type = "t3.medium"
+}
+resource "aws_instance" "web2" {
+  instance_type = "t3.medium"
+}`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      // Should only estimate once per resource type
      const ec2Estimates = result.estimates.filter((e) => e.resourceType === 'ec2');
      expect(ec2Estimates.length).toBe(1);
    });

    it('should handle CloudFormation resources', () => {
      const files = [
        {
          path: 'template.yaml',
          diff: `
Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.medium
  MyBucket:
    Type: AWS::S3::Bucket`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.hasDevOpsChanges).toBe(true);
      expect(result.fileTypes).toContain('cloudformation');
      expect(result.estimates.length).toBeGreaterThan(0);
    });

    it('should set confidence levels appropriately', () => {
      const files = [
        {
          path: 'main.tf',
          diff: `
+resource "aws_lb" "main" {
+  load_balancer_type = "application"
+}
+resource "aws_lambda_function" "api" {
+  function_name = "my-function"
+}`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      // ALB should have high confidence (fixed cost)
      const albEstimate = result.estimates.find((e) => e.resourceType === 'alb');
      expect(albEstimate?.confidence).toBe('high');

      // Lambda should have low confidence (usage-based)
      const lambdaEstimate = result.estimates.find((e) => e.resourceType === 'lambda');
      expect(lambdaEstimate?.confidence).toBe('low');
    });

    it('should include cost details', () => {
      const files = [
        {
          path: 'main.tf',
          diff: '+resource "aws_instance" "web" { instance_type = "t3.medium" }',
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.estimates[0].details).toBeDefined();
      expect(result.estimates[0].details).toContain('$');
      expect(result.estimates[0].details).toContain('month');
    });

    it('should handle diff format with + prefix correctly', () => {
      const files = [
        {
          path: 'main.tf',
          diff: `diff --git a/main.tf b/main.tf
index 123..456
--- a/main.tf
+++ b/main.tf
@@ -1,0 +1,5 @@
+resource "aws_instance" "web" {
+  ami           = "ami-123"
+  instance_type = "t3.medium"
+}`,
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.hasDevOpsChanges).toBe(true);
      expect(result.estimates.some((e) => e.resourceType === 'ec2')).toBe(true);
    });

    it('should handle multiple file types', () => {
      const files = [
        {
          path: 'main.tf',
          diff: '+resource "aws_instance" "web" {}',
        },
        {
          path: 'template.yaml',
          diff: 'Type: AWS::Lambda::Function',
        },
      ];

      const result = analyzeDevOpsFiles(files);

      expect(result.fileTypes).toContain('terraform');
      expect(result.fileTypes).toContain('cloudformation');
    });
  });

  describe('formatCostEstimates', () => {
    it('should format empty estimates', () => {
      const formatted = formatCostEstimates([], 0);

      expect(formatted).toContain('No cost estimates available');
    });

    it('should format single estimate', () => {
      const estimates = [
        {
          resource: 'test-alb',
          resourceType: 'alb',
          estimatedNewCost: 22.5,
          confidence: 'high' as const,
          details: 'Estimated $16-30/month',
        },
      ];

      const formatted = formatCostEstimates(estimates, 22.5);

      expect(formatted).toContain('AWS Cost Estimates');
      expect(formatted).toContain('alb');
      expect(formatted).toContain('$22.50/month');
      expect(formatted).toContain('Total Estimated Impact: ~$22.50/month');
      expect(formatted).toContain('🟢'); // high confidence
    });

    it('should format multiple estimates with different confidence levels', () => {
      const estimates = [
        {
          resource: 'alb',
          resourceType: 'alb',
          estimatedNewCost: 22,
          confidence: 'high' as const,
        },
        {
          resource: 'ec2',
          resourceType: 'ec2',
          estimatedNewCost: 34,
          confidence: 'medium' as const,
        },
        {
          resource: 'lambda',
          resourceType: 'lambda',
          estimatedNewCost: 0.4,
          confidence: 'low' as const,
        },
      ];

      const formatted = formatCostEstimates(estimates, 56.4);

      expect(formatted).toContain('🟢'); // high
      expect(formatted).toContain('🟡'); // medium
      expect(formatted).toContain('🔴'); // low
      expect(formatted).toContain('$56.40/month');
    });

    it('should include disclaimer', () => {
      const estimates = [
        {
          resource: 'test',
          resourceType: 'ec2',
          estimatedNewCost: 10,
          confidence: 'medium' as const,
        },
      ];

      const formatted = formatCostEstimates(estimates, 10);

      expect(formatted).toContain('Estimates are approximate');
      expect(formatted).toContain('Actual costs depend on usage and configuration');
    });
  });
});
