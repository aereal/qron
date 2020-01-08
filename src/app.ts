import { App, AppProps, Environment } from "@aws-cdk/core";

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
  }
}
