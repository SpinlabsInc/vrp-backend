import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
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
  }
}
