#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { VrpBackendStack } from "../lib/vrp-backend-stack";

const app = new cdk.App();
new VrpBackendStack(app, "VrpBackendStack");
