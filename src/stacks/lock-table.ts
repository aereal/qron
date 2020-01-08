import { Stack, Construct, StackProps } from "@aws-cdk/core";
import { Table, AttributeType } from "@aws-cdk/aws-dynamodb";

export class LockTableStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    new Table(this, "LockTable", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });
  }
}
