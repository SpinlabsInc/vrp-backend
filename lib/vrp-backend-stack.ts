import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipelineActions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { Construct } from "constructs";

export class VrpBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket to store code artifacts
    const artifactBucket = new s3.Bucket(this, "ArtifactBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Define the source action (GitHub)
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction =
      new codepipelineActions.CodeStarConnectionsSourceAction({
        actionName: "GitHub_Source",
        connectionArn:
          "arn:aws:codeconnections:ap-southeast-2:448049814374:connection/da0be10f-6a19-4f21-8860-f6ce12c97e4f",
        owner: "SpinlabsInc",
        repo: "vrp-backend",
        branch: "main",
        output: sourceOutput,
      });

    // Define the build action
    const buildProject = new codebuild.PipelineProject(this, "BuildProject", {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"), // Define a buildspec.yml for build commands
    });

    const buildAction = new codepipelineActions.CodeBuildAction({
      actionName: "Build",
      project: buildProject,
      input: sourceOutput,
      outputs: [new codepipeline.Artifact()], // Define output artifact
    });

    // Create CodePipeline
    new codepipeline.Pipeline(this, "VrpBackendPipeline", {
      pipelineName: "VrpBackendPipeline",
      artifactBucket: artifactBucket,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [buildAction],
        },
      ],
    });
  }
}
