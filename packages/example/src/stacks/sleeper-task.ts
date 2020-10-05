import { join } from "path";
import { RunTransactionalTask } from "@aereal/qron";
import { ITable } from "@aws-cdk/aws-dynamodb";
import { Rule, Schedule } from "@aws-cdk/aws-events";
import { SfnStateMachine } from "@aws-cdk/aws-events-targets";
import {
  Code,
  Function as LambdaFunction,
  Runtime,
  Tracing,
} from "@aws-cdk/aws-lambda";
import { StateMachine } from "@aws-cdk/aws-stepfunctions";
import { LambdaInvoke } from "@aws-cdk/aws-stepfunctions-tasks";
import { Construct, Duration, Stack, StackProps } from "@aws-cdk/core";

interface SleeperTaskStackProps extends StackProps {
  readonly lockTable: ITable;
}

export class SleeperTaskStack extends Stack {
  constructor(scope: Construct, id: string, props: SleeperTaskStackProps) {
    super(scope, id, props);

    const functionsRoot = join(__dirname, "..", "..", "lambda-functions.dist");
    const taskFunction = new LambdaFunction(this, "SleepFunction", {
      code: Code.fromAsset(join(functionsRoot, "sleep")),
      handler: "sleep",
      timeout: Duration.minutes(10),
      runtime: Runtime.GO_1_X,
      tracing: Tracing.ACTIVE,
    });
    const stateMachine = new StateMachine(this, "SleeperStateMachine", {
      definition: new RunTransactionalTask(this, "SleeperTask", {
        lockTable: props.lockTable,
        invokeMain: new LambdaInvoke(this, "InvokeLambda", {
          lambdaFunction: taskFunction,
        }),
        taskName: "sleeper",
      }),
    });
    const rule = new Rule(this, "RunEveryHourRule", {
      schedule: Schedule.cron({ minute: "0/10", weekDay: "MON-FRI" }),
    });
    rule.addTarget(new SfnStateMachine(stateMachine));
  }
}
