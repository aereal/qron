import { Stack, Construct, StackProps, PhysicalName } from "@aws-cdk/core";
import { Repository, IRepository } from "@aws-cdk/aws-ecr";

export class EcrRepoStack extends Stack {
  public readonly repository: IRepository;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.repository = new Repository(this, "QronRepository", {
      repositoryName: PhysicalName.GENERATE_IF_NEEDED,
    });
  }
}
