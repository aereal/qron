import { App, AppProps, Environment } from "@aws-cdk/core";
import { EcrRepoStack } from "./stacks/ecr-repo";
import { LambdaFunctionsStack } from "./stacks/lambda-functions";
import { LockTableStack } from "./stacks/lock-table";
import { SleeperEcsStack } from "./stacks/sleeper-ecs";
import { SleeperTaskStack } from "./stacks/sleeper-task";

interface QronAppProps extends AppProps {
  readonly env: Environment;
}

export class QronApp extends App {
  private constructor(props: QronAppProps) {
    super(props);

    new LambdaFunctionsStack(this, "qron-lambda-functions", {
      env: props.env,
    });
    const lockTableStack = new LockTableStack(this, "qron-lock-table", {
      env: props.env,
    });
    const ecrRepoStack = new EcrRepoStack(this, "qron-ecr-repo", {
      env: props.env,
    });
    new SleeperEcsStack(this, "qron-task-sleeper-ecs", {
      env: props.env,
      repository: ecrRepoStack.repository,
      lockTable: lockTableStack.newLockTable,
    });
    new SleeperTaskStack(this, "qron-task-sleeper", {
      env: props.env,
      lockTable: lockTableStack.newLockTable,
    });
  }

  public static newFromContext = (): QronApp => {
    const { CDK_DEFAULT_ACCOUNT, CDK_DEFAULT_REGION } = process.env;
    if (CDK_DEFAULT_ACCOUNT === undefined) {
      throw new Error("default account not found");
    }
    if (CDK_DEFAULT_REGION === undefined) {
      throw new Error("default region not found");
    }
    return new QronApp({
      env: { account: CDK_DEFAULT_ACCOUNT, region: CDK_DEFAULT_REGION },
    });
  };

  public static newForTest = (): QronApp =>
    new QronApp({
      env: {
        account: "dummy",
        region: "ap-northeast-1",
      },
    });
}
