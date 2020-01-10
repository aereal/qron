import { App, AppProps, Environment } from "@aws-cdk/core";
import { LambdaFunctionsStack } from "./stacks/lambda-functions";
import { LockTableStack } from "./stacks/lock-table";
import { SleeperTaskStack } from "./stacks/sleeper-task";
import { EcrRepoStack } from "./stacks/ecr-repo";
import { SleeperEcsStack } from "./stacks/sleeper-ecs";

interface NeocronAppProps extends AppProps {
  readonly env: Environment;
}

export class NeocronApp extends App {
  static newFromContext = (): NeocronApp => {
    const { CDK_DEFAULT_ACCOUNT, CDK_DEFAULT_REGION } = process.env;
    if (CDK_DEFAULT_ACCOUNT === undefined) {
      throw new Error("default account not found");
    }
    if (CDK_DEFAULT_REGION === undefined) {
      throw new Error("default region not found");
    }
    return new NeocronApp({
      env: { account: CDK_DEFAULT_ACCOUNT, region: CDK_DEFAULT_REGION },
    });
  };

  private constructor(props: NeocronAppProps) {
    super(props);

    new LambdaFunctionsStack(this, "neocron-lambda-functions", {
      env: props.env,
    });
    const lockTableStack = new LockTableStack(this, "neocron-lock-table", {
      env: props.env,
    });
    const ecrRepoStack = new EcrRepoStack(this, "neocron-ecr-repo", {
      env: props.env,
    });
    new SleeperEcsStack(this, "neocron-task-sleeper-ecs", {
      env: props.env,
      repository: ecrRepoStack.repository,
      lockTable: lockTableStack.newLockTable,
    });
    new SleeperTaskStack(this, "neocron-task-sleeper", {
      env: props.env,
      lockTable: lockTableStack.newLockTable,
    });
  }
}
