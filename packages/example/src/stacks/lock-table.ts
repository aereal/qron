import { AttributeType, ITable, Table } from "@aws-cdk/aws-dynamodb";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

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
