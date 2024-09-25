import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns"; // For ApplicationLoadBalancedFargateService
import { Construct } from "constructs";

interface EcsServiceStackProps extends cdk.StackProps {
  cluster: ecs.ICluster;
  repository: ecr.IRepository;
}

export class VRPBackendEcsServiceStack extends cdk.Stack {
  public readonly fargateService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: EcsServiceStackProps) {
    super(scope, id, props);

    // Placeholder image if no image is available in ECR
    const placeholderImage = ecs.ContainerImage.fromRegistry(
      "amazon/amazon-ecs-sample"
    );

    // Use ApplicationLoadBalancedFargateService for simplicity
    const loadBalancedFargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "VRPBackendFargateService",
        {
          cluster: props.cluster, // Use ECS Cluster from CoreInfrastructureStack
          cpu: 256, // 256 vCPU
          memoryLimitMiB: 512, // 512 MiB memory
          desiredCount: 2, // Number of Fargate tasks to run
          taskImageOptions: {
            // If the repository is empty or not set, use the placeholder image
            image: props.repository
              ? ecs.ContainerImage.fromEcrRepository(props.repository)
              : placeholderImage,
            containerPort: 80, // Port exposed by the container
          },
          publicLoadBalancer: true, // Internet-facing ALB
        }
      );

    // Reference the Fargate service for further use
    this.fargateService = loadBalancedFargateService.service;

    // Output ECS service name for cross-stack referencing
    new cdk.CfnOutput(this, "VRPBackendEcsServiceName", {
      value: loadBalancedFargateService.service.serviceName,
      description: "VRPBackend ECS Service Name",
    });

    // Output Load Balancer DNS name
    new cdk.CfnOutput(this, "VRPBackendLoadBalancerDNS", {
      value: loadBalancedFargateService.loadBalancer.loadBalancerDnsName,
      description: "VRPBackend Load Balancer DNS Name",
    });
  }
}
