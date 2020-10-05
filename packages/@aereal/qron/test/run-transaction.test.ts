import { SynthUtils } from "@aws-cdk/assert";
import { AttributeType, Table } from "@aws-cdk/aws-dynamodb";
import { Topic } from "@aws-cdk/aws-sns";
import { StateMachine, TaskInput } from "@aws-cdk/aws-stepfunctions";
import { SnsPublish } from "@aws-cdk/aws-stepfunctions-tasks";
import { Stack } from "@aws-cdk/core";
import { RunTransaction } from "../src/run-transaction";

describe("TransactionalTask", () => {
  test("ok", () => {
    const stack = new Stack();
    const lockTable = new Table(stack, "LockTable", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });
    const topic = new Topic(stack, "Topic");
    new StateMachine(stack, "StateMachine", {
      definition: new RunTransaction(stack, "RunTransaction", {
        lockTable,
        taskName: "test-task",
        invokeMain: new SnsPublish(stack, "PublishTopic", {
          topic,
          message: TaskInput.fromObject({}),
        }),
      }),
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
