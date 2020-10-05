import { join } from "path";
import {
  Code,
  IFunction,
  Function as LambdaFunction,
  Runtime,
  Tracing,
} from "@aws-cdk/aws-lambda";
import { Construct, Duration, Stack, StackProps } from "@aws-cdk/core";

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
