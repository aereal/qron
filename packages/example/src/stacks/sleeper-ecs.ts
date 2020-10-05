import { TransactionalTask } from "@aereal/qron";
import { ITable } from "@aws-cdk/aws-dynamodb";
import { Vpc } from "@aws-cdk/aws-ec2";
import { IRepository } from "@aws-cdk/aws-ecr";
import {
  Cluster,
  ContainerImage,
  FargatePlatformVersion,
  FargateTaskDefinition,
  LogDrivers,
} from "@aws-cdk/aws-ecs";
import { Rule, Schedule } from "@aws-cdk/aws-events";
import { SfnStateMachine } from "@aws-cdk/aws-events-targets";
import { LogGroup, RetentionDays } from "@aws-cdk/aws-logs";
import { IntegrationPattern } from "@aws-cdk/aws-stepfunctions";
import {
  EcsFargateLaunchTarget,
  EcsRunTask,
} from "@aws-cdk/aws-stepfunctions-tasks";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

interface SleeperEcsStackProps extends StackProps {
  readonly repository: IRepository;
  readonly lockTable: ITable;
}

export class SleeperEcsStack extends Stack {
  constructor(scope: Construct, id: string, props: SleeperEcsStackProps) {
    super(scope, id, props);

    const { repository, lockTable } = props;

    const vpcId = this.node.tryGetContext("vpcId") as string | undefined;
    if (vpcId === undefined) {
      throw new Error("No vpcId context found");
    }
    const vpc = Vpc.fromLookup(this, "ImportedVPC", {
      vpcId,
    });

    const cluster = new Cluster(this, "Cluster", { vpc });

    const logGroup = new LogGroup(this, "TaskLogGroup", {
      retention: RetentionDays.ONE_WEEK,
    });

    const taskDefinition = new FargateTaskDefinition(
      this,
      "SleeperTaskDefinition"
    );

    const mainContainer = taskDefinition.addContainer("main", {
      image: ContainerImage.fromEcrRepository(repository, "latest"),
      essential: true,
      logging: LogDrivers.awsLogs({
        logGroup,
        streamPrefix: "main",
      }),
    });

    const task = new TransactionalTask(this, "SleeperEcsTask", {
      lockTable,
      invokeMain: new EcsRunTask(this, "MainState", {
        cluster,
        taskDefinition,
        integrationPattern: IntegrationPattern.REQUEST_RESPONSE,
        launchTarget: new EcsFargateLaunchTarget({
          platformVersion: FargatePlatformVersion.LATEST,
        }),
        containerOverrides: [
          { containerDefinition: mainContainer, command: ["-wait", "3s"] },
        ],
      }),
      taskName: "sleeper-ecs",
    });
    const rule = new Rule(this, "RunEveryHourRule", {
      schedule: Schedule.cron({ minute: "0/10", weekDay: "MON-FRI" }),
    });
    rule.addTarget(new SfnStateMachine(task.stateMachine));
  }
}
