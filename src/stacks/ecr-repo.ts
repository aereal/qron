import { Stack, Construct, StackProps } from "@aws-cdk/core";
import { Repository } from "@aws-cdk/aws-ecr";

export class EcrRepoStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    new Repository(this, "NeocronRepository", {});
  }
}
