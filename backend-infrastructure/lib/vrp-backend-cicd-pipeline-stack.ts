import * as cdk from "aws-cdk-lib";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";

interface VrpBackendInfraPipelineStackProps extends cdk.StackProps {
  ecrRepository: ecr.Repository;
  ecsCluster: ecs.Cluster;
  ecsService: ecs.FargateService;
}

export class VrpBackendInfraCICDPipelineStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: VrpBackendInfraPipelineStackProps
  ) {
    super(scope, id, props);

    // CodeStar Connection ARN for GitHub repository
    const githubConnectionArn =
      "arn:aws:codeconnections:ap-southeast-2:448049814374:connection/da0be10f-6a19-4f21-8860-f6ce12c97e4f";

    // Source Action for GitHub using CodeStar Connection
    const sourceOutput = new codepipeline.Artifact(
      "VrpBackendInfraSourceOutput"
    );
    const sourceAction =
      new codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: "VrpBackendInfra_GitHub_Source",
        owner: "SpinlabsInc", // GitHub owner (organization or username)
        repo: "vrp-backend", // Repository name
        branch: "main", // Branch to pull from
        connectionArn: githubConnectionArn, // Use the CodeStar connection ARN
        output: sourceOutput,
      });

    // CodeBuild Project
    const buildProject = new codebuild.PipelineProject(
      this,
      "VrpBackendInfraBuildProject",
      {
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
          privileged: true, // For Docker build
        },
        environmentVariables: {
          ECR_REPO_URI: { value: props.ecrRepository.repositoryUri },
          AWS_DEFAULT_REGION: { value: this.region },
        },
        buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"),
      }
    );

    // Grant ECR pull/push permissions
    props.ecrRepository.grantPullPush(buildProject.role!);

    // Grant SecretsManager access
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [
          "arn:aws:secretsmanager:us-east-1:448049814374:secret:DockerHubCredentials-HH2LVS",
        ],
      })
    );

    // Build output artifact
    const buildOutput = new codepipeline.Artifact("VrpBackendInfraBuildOutput");
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "VrpBackendInfra_Build",
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    // ECS Deploy Action
    const deployAction = new codepipeline_actions.EcsDeployAction({
      actionName: "VrpBackendInfra_DeployToECS",
      service: props.ecsService,
      input: buildOutput,
    });

    // Define the Pipeline
    new codepipeline.Pipeline(this, "VrpBackendInfraPipeline", {
      pipelineName: "VrpBackendInfraPipeline",
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [buildAction],
        },
        {
          stageName: "Deploy",
          actions: [deployAction],
        },
      ],
    });
  }
}
