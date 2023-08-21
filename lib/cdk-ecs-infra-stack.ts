import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";


export class CdkEcsInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    //lookup the existing vpc (vpc-0e172cf2fb32fcd7e) to use 
    const vpc= ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: "vpc-0e172cf2fb32fcd7e"
    });

    // execution role for ECS tasks
    const taskIamRole= new cdk.aws_iam.Role(this, 'AppRole', {
      roleName: "AppRole",
      assumedBy: new cdk.aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com')
    });

    taskIamRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
    );

    // define ecs (Fargate) task-definition
    const taskDefinition=new ecs.FargateTaskDefinition(this, 'Task', {
      taskRole: taskIamRole,
      family: 'CdkEcsInfraStackTaskDef'
    })

    taskDefinition.addContainer('MyContainer', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'),
      portMappings: [{containerPort: 80}],
      memoryReservationMiB: 256,
      cpu: 256,
    });

    // crteate ecs cluster (and related resources) using ecs-patterns
    const ecs_app = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "MyApp", {
      vpc: vpc,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      serviceName: "MyWebApp",
      assignPublicIp: true,
      publicLoadBalancer: true,
      healthCheckGracePeriod: cdk.Duration.seconds(5),
    });

    //get URL of the app, as well as the ARN of the cluster
    new cdk.CfnOutput(this, "MyApp URL", {
      value: "http://"+ ecs_app.loadBalancer.loadBalancerDnsName
    });

    new cdk.CfnOutput(this, "ECS Cluster ARN", {
      value: ecs_app.cluster.clusterArn
    })

  }
}
