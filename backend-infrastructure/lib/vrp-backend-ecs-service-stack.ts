import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns"; // For ApplicationLoadBalancedFargateService
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface EcsServiceStackProps extends cdk.StackProps {
  cluster: ecs.ICluster;
  vpc: ec2.Vpc;
}

export class VrpBackendInfraEcsServiceStack extends cdk.Stack {
  public readonly fargateService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: EcsServiceStackProps) {
    super(scope, id, props);

    // Validate props to ensure valid inputs
    if (!props.cluster) {
      throw new Error("ECS cluster is required but was not provided.");
    }

    // Task execution role with ECR pull permissions
    const taskExecutionRole = new iam.Role(this, "FargateTaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    taskExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      )
    );

    // Add outbound traffic permissions to the ECS service security group
    const ecsSecurityGroup = new ec2.SecurityGroup(this, "ECSSecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: true, // Ensures ECS can access public internet
    });

    // Use ApplicationLoadBalancedFargateService for simplicity
    const loadBalancedFargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "VrpBackendInfraFargateService",
        {
          cluster: props.cluster, // Use ECS Cluster from CoreInfrastructureStack
          cpu: 512, // Increased to 512 vCPU for more resources
          memoryLimitMiB: 1024, // Increased memory to 1024 MiB for better performance
          desiredCount: 2, // Number of Fargate tasks to run
          taskImageOptions: {
            // Use a default Amazon ECS sample image
            image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
            containerPort: 80, // Port exposed by the container
            executionRole: taskExecutionRole, // Role for task execution
          },
          securityGroups: [ecsSecurityGroup], // Assign the security group to the service
          publicLoadBalancer: true, // Internet-facing ALB

          // Add health check grace period to allow time for the service to start
          healthCheckGracePeriod: cdk.Duration.minutes(5),
        }
      );

    // Output ECS service name for cross-stack referencing
    this.fargateService = loadBalancedFargateService.service;

    new cdk.CfnOutput(this, "VrpBackendInfraEcsServiceName", {
      value: loadBalancedFargateService.service.serviceName,
      description: "VrpBackendInfra ECS Service Name",
    });

    // Output Load Balancer DNS name
    new cdk.CfnOutput(this, "VrpBackendInfraLoadBalancerDNS", {
      value: loadBalancedFargateService.loadBalancer.loadBalancerDnsName,
      description: "VrpBackendInfra Load Balancer DNS Name",
    });
  }
}
