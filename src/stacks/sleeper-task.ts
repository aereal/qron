import { join } from "path";
import { Stack, StackProps, Construct, Duration } from "@aws-cdk/core";
import {
  Function as LambdaFunction,
  Code,
  Runtime,
  Tracing,
} from "@aws-cdk/aws-lambda";
import { ITable } from "@aws-cdk/aws-dynamodb";
import { ScheduledTask } from "../constructs/scheduled-task";

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
    new ScheduledTask(this, "SleeperTask", {
      lockTable: props.lockTable,
      taskFunction,
      taskName: "sleeper",
    });
  }
}
