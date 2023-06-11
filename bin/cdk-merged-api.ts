#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkMergedApiStack } from '../lib/cdk-merged-api-stack';

const app = new cdk.App();
new CdkMergedApiStack(app, 'CdkMergedApiStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
