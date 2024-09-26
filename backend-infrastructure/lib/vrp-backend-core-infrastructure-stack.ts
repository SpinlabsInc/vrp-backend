import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

export class VrpBackendInfraCoreStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecrRepository: ecr.Repository;
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC for VRPBackendInfra
    this.vpc = new ec2.Vpc(this, "VrpBackendInfraVPC", {
      maxAzs: 2, // Spread across 2 Availability Zones
    });

    // Create an ECR repository for storing container images for VRPBackendInfra
    this.ecrRepository = new ecr.Repository(this, "VrpBackendInfraRepo", {
      repositoryName: "vrpbackendinfra-repo",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Removes ECR repository when stack is deleted
    });

    // Create an ECS Cluster within the VPC for VRPBackendInfra
    this.ecsCluster = new ecs.Cluster(this, "VrpBackendInfraCluster", {
      vpc: this.vpc,
      clusterName: "vrpbackendinfra-cluster",
    });

    // Create an Application Load Balancer in the VPC for VRPBackendInfra
    this.alb = new elbv2.ApplicationLoadBalancer(this, "VrpBackendInfraALB", {
      vpc: this.vpc,
      internetFacing: true, // Internet-facing ALB
    });

    // Create a security group for the ALB for VRPBackendInfra
    const albSg = new ec2.SecurityGroup(
      this,
      "VrpBackendInfraAlbSecurityGroup",
      {
        vpc: this.vpc,
        allowAllOutbound: true,
        description: "Security group for the VRPBackendInfra ALB",
      }
    );
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80)); // Allow HTTP traffic to ALB

    // Output the ECR repository URI for cross-stack reference
    new cdk.CfnOutput(this, "VrpBackendInfraECRRepositoryUri", {
      value: this.ecrRepository.repositoryUri,
      description: "VrpBackendInfra ECR Repository URI",
    });

    // Output the ALB DNS name for cross-stack reference
    new cdk.CfnOutput(this, "VrpBackendInfraALBDNSName", {
      value: this.alb.loadBalancerDnsName,
      description: "VrpBackendInfra ALB DNS Name",
    });
  }
}
