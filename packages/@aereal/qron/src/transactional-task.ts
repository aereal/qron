import { Construct } from "@aws-cdk/core";
import { ITable, AttributeType } from "@aws-cdk/aws-dynamodb";
import {
  StateMachine,
  Task,
  Choice,
  Condition,
  IChainable,
  Fail,
  Succeed,
  IStateMachine,
  TaskStateBase,
} from "@aws-cdk/aws-stepfunctions";
import { AttributeValue, UpdateItemTask } from "./dynamodb-sfn-task";

export interface TransactionalTaskProps {
  /**
   * DynamoDB table manages tasks concurrency.
   * It must have partition key that's name is `taskName` and type is string.
   */
  readonly lockTable: ITable;

  readonly invokeMain: TaskStateBase;

  /**
   * taskName is used as lock key so it must be unique in same [[lockTable]].
   */
  readonly taskName: string;
}

const keyTaskName = "taskName";

/**
 * TransactionalTask executes given main task and manages its concurrency.
 *
 * Most common AWS services guarantee at-least-once execution but not exactly-once.
 *
 * The TransactionalTask uses Step Function as task runner and DynamoDB as exclusive lock.
 *
 * So we can run some task that supported by Step Functions task in exactly-once manner if max concurrency is 1.
 */
export class TransactionalTask extends Construct {
  public readonly stateMachine: IStateMachine;

  constructor(scope: Construct, id: string, props: TransactionalTaskProps) {
    super(scope, id);

    const { lockTable, invokeMain, taskName } = props;

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

    const freeLock = (id: string): Task =>
      new Task(this, id, {
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
        .otherwise(freeLock("FailedLockFreed").next(new Fail(this, "Finite")));

    this.stateMachine = new StateMachine(this, "StateMachine", {
      definition: getLock.next(
        checkLock(
          invokeMain
            .addCatch(freeLock("AssumeLockFreed"))
            .next(
              freeLock("SuccessFreeLock").next(new Succeed(this, "Succeed"))
            )
        )
      ),
    });
  }
}
