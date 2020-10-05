import { dynamoExpr } from "@aereal/cdk-dynamodb-expression";
import { ITable } from "@aws-cdk/aws-dynamodb";
import {
  Choice,
  Condition,
  Fail,
  IChainable,
  IStateMachine,
  StateMachine,
  Succeed,
  TaskStateBase,
} from "@aws-cdk/aws-stepfunctions";
import {
  DynamoAttributeValue,
  DynamoReturnValues,
  DynamoUpdateItem,
} from "@aws-cdk/aws-stepfunctions-tasks";
import { Construct } from "@aws-cdk/core";

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
  private readonly getLockResultPath: string = "$.Lock";
  private readonly lockTable: ITable;
  private readonly taskName: string;
  private readonly amount: DynamoAttributeValue = DynamoAttributeValue.fromNumber(
    1
  );

  constructor(scope: Construct, id: string, props: TransactionalTaskProps) {
    super(scope, id);

    const { lockTable, invokeMain, taskName } = props;
    this.lockTable = lockTable;
    this.taskName = taskName;

    const getLockResultPath = "$.Lock";

    const getLock = this.getLockTask();

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
        .otherwise(
          this.freeLockTask("FailedLockFreed").next(new Fail(this, "Finite"))
        );

    this.stateMachine = new StateMachine(this, "StateMachine", {
      definition: getLock.next(
        checkLock(
          invokeMain
            .addCatch(this.freeLockTask("AssumeLockFreed"))
            .next(
              this.freeLockTask("SuccessFreeLock").next(
                new Succeed(this, "Succeed")
              )
            )
        )
      ),
    });
  }

  /**
   *
   */
  private getLockTask(): DynamoUpdateItem {
    const defaultCount = DynamoAttributeValue.fromNumber(0);
    const [
      updateExpression,
      updateAttributeValues,
    ] = dynamoExpr`SET handledCount = if_not_exists(handledCount, ${defaultCount}) + ${this.amount}`;
    return new DynamoUpdateItem(this, "GetLock", {
      table: this.lockTable,
      key: this.lockKey,
      updateExpression,
      expressionAttributeValues: updateAttributeValues,
      returnValues: DynamoReturnValues.ALL_NEW,
      resultPath: this.getLockResultPath,
    });
  }

  /**
   *
   */
  private freeLockTask(id: string): DynamoUpdateItem {
    const [
      updateExpression,
      values,
    ] = dynamoExpr`SET handledCount = handledCount - ${DynamoAttributeValue.fromNumber(
      1
    )}`;
    return new DynamoUpdateItem(this, id, {
      table: this.lockTable,
      key: this.lockKey,
      updateExpression,
      expressionAttributeValues: values,
      returnValues: DynamoReturnValues.ALL_NEW,
    });
  }

  /**
   *
   */
  private get lockKey(): { [key: string]: DynamoAttributeValue } {
    return { [keyTaskName]: DynamoAttributeValue.fromString(this.taskName) };
  }
}
