import { IRepository, Repository } from "@aws-cdk/aws-ecr";
import { Construct, PhysicalName, Stack, StackProps } from "@aws-cdk/core";

export class EcrRepoStack extends Stack {
  public readonly repository: IRepository;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.repository = new Repository(this, "QronRepository", {
      repositoryName: PhysicalName.GENERATE_IF_NEEDED,
    });
  }
}
