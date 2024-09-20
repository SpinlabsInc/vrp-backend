import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class VrpBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB Table
    const table = new dynamodb.Table(this, "ItemsTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Not recommended for production
    });

    // Create the Lambda function
    const lambdaFunction = new lambda.Function(this, "ApiLambdaFunction", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("./lambda"), // Directory containing lambda function code
      handler: "index.handler",
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Grant Lambda permissions to access DynamoDB
    table.grantReadWriteData(lambdaFunction);

    // Create an API Gateway
    const api = new apigateway.RestApi(this, "ItemsApi", {
      restApiName: "Items Service",
    });

    // Add a resource and method to API Gateway
    const items = api.root.addResource("items");
    const getItemIntegration = new apigateway.LambdaIntegration(lambdaFunction);
    items.addMethod("GET", getItemIntegration); // GET /items
    items.addMethod("POST", getItemIntegration); // POST /items

    // === CodePipeline ===

    // Define the source action: GitHub using CodeStar Connections
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction =
      new codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: "GitHub_Source",
        connectionArn:
          "arn:aws:codeconnections:ap-southeast-2:448049814374:connection/da0be10f-6a19-4f21-8860-f6ce12c97e4f", // Your CodeStar connection ARN
        owner: "SpinlabsInc",
        repo: "vrp-backend",
        branch: "main", // Replace with your branch
        output: sourceOutput,
      });

    // Define the build action: CodeBuild
    const project = new codebuild.PipelineProject(this, "BuildProject", {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0, // Ensure using latest environment
      },
    });

    // Grant SSM Parameter read permissions to the CodeBuild project role
    project.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          "arn:aws:ssm:us-east-1:448049814374:parameter/cdk-bootstrap/hnb659fds/version",
        ],
      })
    );

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "Build",
      project: project,
      input: sourceOutput,
    });

    // Define the pipeline
    new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "BackendDeploymentPipeline",
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
