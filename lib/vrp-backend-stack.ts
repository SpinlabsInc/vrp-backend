import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipelineActions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";

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

    // Store API Gateway URL in SSM Parameter Store
    new ssm.StringParameter(this, "ApiGatewayUrl", {
      parameterName: "/my-app/api-url",
      stringValue: api.url, // Store the API Gateway URL
    });

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

    // Define the build project and grant required permissions
    const buildProject = new codebuild.PipelineProject(this, "BuildProject", {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"), // Buildspec for the pipeline
    });

    // Add permissions to allow the build project to access SSM and other resources
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter", "ssm:PutParameter"],
        resources: [
          "arn:aws:ssm:us-east-1:448049814374:parameter/cdk-bootstrap/hnb659fds/version",
          "arn:aws:ssm:us-east-1:448049814374:parameter/cdk-bootstrap/*",
          "arn:aws:ssm:us-east-1:448049814374:parameter/my-app/api-url", // Specific to the API URL in SSM
        ],
      })
    );

    // Allow the build project to deploy CDK stacks and perform necessary actions
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudformation:DescribeStacks",
          "cloudformation:CreateStack",
          "cloudformation:UpdateStack",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeStackResources",
          "s3:*", // For uploading build artifacts
          "lambda:*", // For deploying Lambda functions
          "dynamodb:*", // For creating/updating DynamoDB tables
          "apigateway:*", // For managing API Gateway
          "iam:PassRole", // Required for IAM role delegation
          "sts:AssumeRole", // Required for assuming roles in deployments
        ],
        resources: ["*"], // Modify this if you want more specific resource policies
      })
    );

    // Define the build action
    const buildAction = new codepipelineActions.CodeBuildAction({
      actionName: "Build",
      project: buildProject,
      input: sourceOutput,
      outputs: [new codepipeline.Artifact()],
    });

    // Create the pipeline
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
