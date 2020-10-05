import { ITable } from "@aws-cdk/aws-dynamodb";
import {
  IStateMachine,
  StateMachine,
  Succeed,
  TaskStateBase,
} from "@aws-cdk/aws-stepfunctions";
import { Construct } from "@aws-cdk/core";
import { RunTransaction } from "./run-transaction";

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

/**
 * TransactionalTask executes given main task and manages its concurrency.
 *
 * Most common AWS services guarantee at-least-once execution but not exactly-once.
 *
 * The TransactionalTask uses Step Function as task runner and DynamoDB as exclusive lock.
 *
 * So we can run some task that supported by Step Functions task in exactly-once manner if max concurrency is 1.
 *
 * @deprecated
 */
export class TransactionalTask extends Construct {
  public readonly stateMachine: IStateMachine;

  constructor(scope: Construct, id: string, props: TransactionalTaskProps) {
    super(scope, id);

    this.stateMachine = new StateMachine(this, "StateMachine", {
      definition: new RunTransaction(this, "MainState", props).next(
        new Succeed(this, "Succeed")
      ),
    });
  }
}
