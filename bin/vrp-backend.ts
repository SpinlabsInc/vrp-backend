#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { VRPBackendCoreInfrastructureStack } from "../cdk/lib/vrp-backend-core-infrastructure-stack"; // Updated file name for consistency
import { VRPBackendEcsServiceStack } from "../cdk/lib/vrp-backend-ecs-service-stack"; // Updated file name for consistency
import { VRPBackendCICDPipelineStack } from "../cdk/lib/vrp-backend-cicd-pipeline-stack"; // Assuming this is the correct path

const app = new cdk.App();

// Deploy the core infrastructure stack
const coreStack = new VRPBackendCoreInfrastructureStack(
  app,
  "VRPBackendCoreInfrastructureStack"
);

// Deploy the ECS service stack, utilizing resources from the core stack
const ecsServiceStack = new VRPBackendEcsServiceStack(
  app,
  "VRPBackendEcsServiceStack",
  {
    cluster: coreStack.ecsCluster,
    repository: coreStack.ecrRepository,
  }
);

// Deploy the CICD pipeline stack, passing the ECR repository, ECS cluster, and ECS service
new VRPBackendCICDPipelineStack(app, "VRPBackendCICDPipelineStack", {
  ecrRepository: coreStack.ecrRepository,
  ecsCluster: coreStack.ecsCluster,
  ecsService: ecsServiceStack.fargateService,
});

app.synth();
