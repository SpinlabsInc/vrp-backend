#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { VrpBackendInfraCoreStack } from "../lib/vrp-backend-core-infrastructure-stack"; // Updated file name for consistency
import { VrpBackendInfraEcsServiceStack } from "../lib/vrp-backend-ecs-service-stack"; // Updated file name for consistency
import { VrpBackendInfraCICDPipelineStack } from "../lib/vrp-backend-cicd-pipeline-stack"; // Updated file name for consistency

const app = new cdk.App();

const coreStack = new VrpBackendInfraCoreStack(app, "VrpBackendInfraCoreStack");

const ecsServiceStack = new VrpBackendInfraEcsServiceStack(
  app,
  "VrpBackendInfraEcsServiceStack",
  {
    cluster: coreStack.ecsCluster,
    vpc: coreStack.vpc, // Only pass `cluster` and `vpc`
  }
);

new VrpBackendInfraCICDPipelineStack(app, "VrpBackendInfraCICDPipelineStack", {
  ecrRepository: coreStack.ecrRepository,
  ecsCluster: coreStack.ecsCluster,
  ecsService: ecsServiceStack.fargateService,
});

app.synth();
