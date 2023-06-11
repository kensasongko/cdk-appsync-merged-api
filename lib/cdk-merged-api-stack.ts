import * as cdk from 'aws-cdk-lib';
import { CfnGraphQLApi, CfnSourceApiAssociation, UserPoolDefaultAction } from 'aws-cdk-lib/aws-appsync';
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class CdkMergedApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const api1Id = StringParameter.fromStringParameterAttributes(this, 'Api1IdStringParameter', {
      parameterName: '/ken/appsync/api1/apiId',
    }).stringValue;

    const api2Id = StringParameter.fromStringParameterAttributes(this, 'Api2IdStringParameter', {
      parameterName: '/ken/appsync/api2/apiId',
    }).stringValue;

    const userPoolId = StringParameter.fromStringParameterAttributes(this, 'UserPoolIdStringParameter', {
      parameterName: '/ken/cognito/dummy/userPoolId',
    }).stringValue;

    const mergedApiRole = new Role(this, 'MergedApiRole', {
      assumedBy: new ServicePrincipal("appsync.amazonaws.com"),
      inlinePolicies: {
        "SourceGraphQL": new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ["appsync:SourceGraphQL"],
              resources: [
                `arn:aws:appsync:${props?.env?.region}:${props?.env?.account}:apis/${api1Id}`,
                `arn:aws:appsync:${props?.env?.region}:${props?.env?.account}:apis/${api2Id}`,
                `arn:aws:appsync:${props?.env?.region}:${props?.env?.account}:apis/${api1Id}/*`,
                `arn:aws:appsync:${props?.env?.region}:${props?.env?.account}:apis/${api2Id}/*`,
              ]
            }),
          ]
        }),
      },
    });

    const myMergedApi = new CfnGraphQLApi(this, 'MyMergedApi', {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      name: 'MyMergedApi',

      apiType: 'MERGED',
      mergedApiExecutionRoleArn: mergedApiRole.roleArn,
      ownerContact: 'Trogdor The Burninator',
      userPoolConfig: {
        awsRegion: 'us-east-1',
        userPoolId: userPoolId,
        defaultAction: UserPoolDefaultAction.ALLOW,
      },
      xrayEnabled: true,
    });

    new CfnSourceApiAssociation(this, 'Api1SourceApiAssociation', {
      description: 'Api 1 Source API',
      mergedApiIdentifier: myMergedApi.attrApiId,
      sourceApiAssociationConfig: {
        mergeType: 'AUTO_MERGE',
      },
      sourceApiIdentifier: api1Id,
    });

    new CfnSourceApiAssociation(this, 'Api2SourceApiAssociation', {
      description: 'Api 2 Source API',
      mergedApiIdentifier: myMergedApi.attrApiId,
      sourceApiAssociationConfig: {
        mergeType: 'AUTO_MERGE',
      },
      sourceApiIdentifier: api2Id,
    });

    mergedApiRole.addToPolicy(new PolicyStatement({
      actions: ["appsync:StartSchemaMerge"],
      resources: [
        `arn:aws:appsync:${props?.env?.region}:${props?.env?.account}:apis/${myMergedApi.attrApiId}/sourceApiAssociations/*`,
      ]
    }));
  }
}
