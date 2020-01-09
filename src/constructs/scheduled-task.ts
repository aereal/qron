import { Construct } from "@aws-cdk/core";
import { ITable, AttributeType } from "@aws-cdk/aws-dynamodb";
import {
  StateMachine,
  Task,
  Choice,
  Condition,
  IChainable,
  Fail,
  INextable,
} from "@aws-cdk/aws-stepfunctions";
import { AttributeValue, UpdateItemTask } from "./dynamodb-sfn-task";

export interface ScheduledTaskProps {
  readonly lockTable: ITable;
  readonly invokeMain: INextable;
  readonly taskName: string;
}

const keyTaskName = "taskName";

export class ScheduledTask extends Construct {
  constructor(scope: Construct, id: string, props: ScheduledTaskProps) {
    super(scope, id);

    const { lockTable, invokeMain: taskFunction, taskName } = props;

    const lockKey: AttributeValue = {
      name: keyTaskName,
      type: AttributeType.STRING,
      value: taskName,
    };

    const getLockResultPath = "$.Lock";

    const amount: AttributeValue = {
      name: ":amount",
      type: AttributeType.NUMBER,
      value: "1",
    };

    const getLock = new Task(this, "GetLock", {
      task: new UpdateItemTask({
        table: lockTable,
        parameters: {
          key: lockKey,
          updateExpression:
            "SET handledCount = if_not_exists(handledCount, :default) + :amount",
          expressionAttributeValues: [
            {
              name: ":default",
              type: AttributeType.NUMBER,
              value: "0",
            },
            amount,
          ],
          returnValues: "ALL_NEW",
        },
      }),
      resultPath: getLockResultPath,
    });

    const freeLock = new Task(this, "FreeLock", {
      task: new UpdateItemTask({
        table: lockTable,
        parameters: {
          key: lockKey,
          updateExpression: "SET handledCount = handledCount - :amount",
          expressionAttributeValues: [amount],
          returnValues: "ALL_NEW",
        },
      }),
    });

    // TODO: otherwise
    // TODO: retry?
    const checkLock = (next: IChainable): Choice =>
      new Choice(this, "CheckLock")
        .when(
          Condition.stringEquals(
            `${getLockResultPath}.Attributes.handledCount.N`,
            "1"
          ),
          next
        )
        .otherwise(freeLock.next(new Fail(this, "Finite", {})));

    new StateMachine(this, "StateMachine", {
      definition: getLock.next(checkLock(taskFunction.next(freeLock))),
    });
  }
}
