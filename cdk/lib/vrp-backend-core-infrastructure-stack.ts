import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

export class VRPBackendCoreInfrastructureStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecrRepository: ecr.Repository;
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC for VRPBackend
    this.vpc = new ec2.Vpc(this, "VRPBackendVPC", {
      maxAzs: 2, // Spread across 2 Availability Zones
    });

    // Create an ECR repository for storing container images for VRPBackend
    this.ecrRepository = new ecr.Repository(this, "VRPBackendRepo", {
      repositoryName: "vrp-backend-repo",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Removes ECR repository when stack is deleted
    });

    // Create an ECS Cluster within the VPC for VRPBackend
    this.ecsCluster = new ecs.Cluster(this, "VRPBackendCluster", {
      vpc: this.vpc,
      clusterName: "vrp-backend-cluster",
    });

    // Create an Application Load Balancer in the VPC for VRPBackend
    this.alb = new elbv2.ApplicationLoadBalancer(this, "VRPBackendALB", {
      vpc: this.vpc,
      internetFacing: true, // Internet-facing ALB
    });

    // Create a security group for the ALB for VRPBackend
    const albSg = new ec2.SecurityGroup(this, "VRPBackendAlbSecurityGroup", {
      vpc: this.vpc,
      allowAllOutbound: true,
      description: "Security group for the VRPBackend ALB",
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80)); // Allow HTTP traffic to ALB

    // Output the ECR repository URI for cross-stack reference
    new cdk.CfnOutput(this, "VRPBackendECRRepositoryUri", {
      value: this.ecrRepository.repositoryUri,
      description: "VRPBackend ECR Repository URI",
    });

    // Output the ALB DNS name for cross-stack reference
    new cdk.CfnOutput(this, "VRPBackendALBDNSName", {
      value: this.alb.loadBalancerDnsName,
      description: "VRPBackend ALB DNS Name",
    });
  }
}
