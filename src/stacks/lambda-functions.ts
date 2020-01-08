import { join } from "path";
import { Stack, StackProps, Construct, Duration } from "@aws-cdk/core";
import {
  Function as LambdaFunction,
  Code,
  Runtime,
  Tracing,
  IFunction,
} from "@aws-cdk/aws-lambda";

export class LambdaFunctionsStack extends Stack {
  public readonly sleepFunction: IFunction;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const functionsRoot = join(__dirname, "..", "..", "lambda-functions.dist");
    this.sleepFunction = new LambdaFunction(this, "SleepFunction", {
      code: Code.fromAsset(join(functionsRoot, "sleep")),
      handler: "sleep",
      timeout: Duration.minutes(10),
      runtime: Runtime.GO_1_X,
      tracing: Tracing.ACTIVE,
    });
  }
}
