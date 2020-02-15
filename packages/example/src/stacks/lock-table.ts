import { Stack, Construct, StackProps } from "@aws-cdk/core";
import { Table, AttributeType, ITable } from "@aws-cdk/aws-dynamodb";

export class LockTableStack extends Stack {
  public readonly newLockTable: ITable;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.newLockTable = new Table(this, "NewLockTable", {
      partitionKey: {
        name: "taskName",
        type: AttributeType.STRING,
      },
    });
  }
}
