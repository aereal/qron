import { Stack, StackProps, Construct } from "@aws-cdk/core";
import { IRepository } from "@aws-cdk/aws-ecr";
import { ITable } from "@aws-cdk/aws-dynamodb";
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  LogDrivers,
} from "@aws-cdk/aws-ecs";
import { Vpc } from "@aws-cdk/aws-ec2";
import { LogGroup, RetentionDays } from "@aws-cdk/aws-logs";
import { Task, ServiceIntegrationPattern } from "@aws-cdk/aws-stepfunctions";
import { RunEcsFargateTask } from "@aws-cdk/aws-stepfunctions-tasks";
import { Rule, Schedule } from "@aws-cdk/aws-events";
import { TransactionalTask } from "@aereal/qron";

interface SleeperEcsStackProps extends StackProps {
  readonly repository: IRepository;
  readonly lockTable: ITable;
}

export class SleeperEcsStack extends Stack {
  constructor(scope: Construct, id: string, props: SleeperEcsStackProps) {
    super(scope, id, props);

    const { repository, lockTable } = props;

    const vpc = Vpc.fromLookup(this, "ImportedVPC", {
      vpcId: this.node.tryGetContext("vpcId"),
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

    new TransactionalTask(this, "SleeperEcsTask", {
      lockTable,
      invokeMain: new Task(this, "MainState", {
        task: new RunEcsFargateTask({
          cluster,
          taskDefinition,
          integrationPattern: ServiceIntegrationPattern.SYNC,
          containerOverrides: [
            {
              containerName: mainContainer.containerName,
              command: ["-wait", "3s"],
            },
          ],
        }),
      }),
      taskName: "sleeper-ecs",
      invocationRule: new Rule(this, "RunEveryHourRule", {
        schedule: Schedule.cron({ minute: "0/10", weekDay: "MON-FRI" }),
      }),
    });
  }
}
