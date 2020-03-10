import { Stack } from "@aws-cdk/core";
import { Table, AttributeType } from "@aws-cdk/aws-dynamodb";
import { Rule, Schedule } from "@aws-cdk/aws-events";
import { SfnStateMachine } from "@aws-cdk/aws-events-targets";
import { Task, TaskInput } from "@aws-cdk/aws-stepfunctions";
import { PublishToTopic } from "@aws-cdk/aws-stepfunctions-tasks";
import { Topic } from "@aws-cdk/aws-sns";
import { SynthUtils } from "@aws-cdk/assert";
import { TransactionalTask } from "../src";

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
    new TransactionalTask(stack, "Task", {
      lockTable,
      taskName: "test-task",
      invokeMain: new Task(stack, "MainStack", {
        task: new PublishToTopic(topic, {
          message: TaskInput.fromObject({}),
        }),
      }),
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  test("add invocation rule", () => {
    const stack = new Stack();
    const lockTable = new Table(stack, "LockTable", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });
    const topic = new Topic(stack, "Topic");
    const task = new TransactionalTask(stack, "Task", {
      lockTable,
      taskName: "test-task",
      invokeMain: new Task(stack, "MainStack", {
        task: new PublishToTopic(topic, {
          message: TaskInput.fromObject({}),
        }),
      }),
    });
    new Rule(stack, "RunEveryHourRule", {
      schedule: Schedule.cron({ minute: "0/10", weekDay: "MON-FRI" }),
    }).addTarget(new SfnStateMachine(task.stateMachine));

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
