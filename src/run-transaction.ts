import { ExpressionBuilder } from "@aereal/cdk-dynamodb-expression";
import { ITable } from "@aws-cdk/aws-dynamodb";
import {
  Choice,
  Condition,
  Fail,
  INextable,
  State,
  StateMachineFragment,
  TaskStateBase,
} from "@aws-cdk/aws-stepfunctions";
import {
  DynamoAttributeValue,
  DynamoReturnValues,
  DynamoUpdateItem,
} from "@aws-cdk/aws-stepfunctions-tasks";
import { Construct } from "@aws-cdk/core";

export interface RunTransactionalTaskProps {
  /**
   * DynamoDB table manages tasks concurrency.
   * It must have partition key that's name is `taskName` and type is string.
   */
  readonly lockTable: ITable;

  /**
   * Main task state.
   */
  readonly invokeMain: TaskStateBase;

  /**
   * taskName is used as lock key so it must be unique in same [[lockTable]].
   */
  readonly taskName: string;
}

const keyTaskName = "taskName";

/**
 * RunTransaction executes given main task and manages its concurrency.
 *
 * Most common AWS services guarantee at-least-once execution but not exactly-once.
 *
 * The RunTransaction uses Step Function as task runner and DynamoDB as exclusive lock.
 *
 * So we can run some task that supported by Step Functions task in exactly-once manner if max concurrency is 1.
 */
export class RunTransactionalTask extends StateMachineFragment {
  public readonly startState: State;
  public readonly endStates: INextable[];
  private readonly getLockResultPath: string = "$.Lock";
  private readonly lockTable: ITable;
  private readonly taskName: string;
  private readonly amount: DynamoAttributeValue = DynamoAttributeValue.fromNumber(
    1
  );
  private readonly getLockExprBuilder: ExpressionBuilder;
  private readonly freeLockExprBuilder: ExpressionBuilder;

  constructor(scope: Construct, id: string, props: RunTransactionalTaskProps) {
    super(scope, id);

    const { lockTable, invokeMain, taskName } = props;
    this.lockTable = lockTable;
    this.taskName = taskName;
    this.getLockExprBuilder = new ExpressionBuilder();
    this.freeLockExprBuilder = new ExpressionBuilder();

    const getLockResultPath = "$.Lock";
    const assumeLockFreed = this.freeLockTask("AssumeLockFreed");
    const onSuccess = this.freeLockTask("SuccessFreeLock");
    const failedLockFreed = this.freeLockTask("FailedLockFreed");
    const invokeWithRecover = invokeMain
      .addCatch(assumeLockFreed)
      .next(onSuccess);
    const checkLock = new Choice(this, "CheckLock")
      .when(
        Condition.stringEquals(
          `${getLockResultPath}.Attributes.handledCount.N`,
          "1"
        ),
        invokeWithRecover
      )
      .otherwise(failedLockFreed.next(new Fail(this, "Finite")))
      .afterwards();
    const getLock = this.getLockTask();
    const definition = getLock.next(checkLock);
    this.startState = definition.startState;
    this.endStates = [...onSuccess.endStates, ...assumeLockFreed.endStates];
  }

  /**
   *
   */
  private getLockTask(): DynamoUpdateItem {
    const defaultCount = DynamoAttributeValue.fromNumber(0);
    const {
      expression,
      expressionAttributeNames,
      expressionAttributeValues,
    } = this.getLockExprBuilder
      .expr`SET handledCount = if_not_exists(handledCount, ${defaultCount}) + ${this.amount}`;
    return new DynamoUpdateItem(this, "GetLock", {
      table: this.lockTable,
      key: this.lockKey,
      updateExpression: expression,
      expressionAttributeNames,
      expressionAttributeValues,
      returnValues: DynamoReturnValues.ALL_NEW,
      resultPath: this.getLockResultPath,
    });
  }

  /**
   *
   */
  private freeLockTask(id: string): DynamoUpdateItem {
    const {
      expression,
      expressionAttributeValues,
      expressionAttributeNames,
    } = this.freeLockExprBuilder
      .expr`SET handledCount = handledCount - ${DynamoAttributeValue.fromNumber(
      1
    )}`;
    return new DynamoUpdateItem(this, id, {
      table: this.lockTable,
      key: this.lockKey,
      updateExpression: expression,
      expressionAttributeNames,
      expressionAttributeValues,
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
