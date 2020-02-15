import { Stack, Duration } from "@aws-cdk/core";
import { Table, AttributeType } from "@aws-cdk/aws-dynamodb";
import { Rule, Schedule } from "@aws-cdk/aws-events";
import { Wait, WaitTime } from "@aws-cdk/aws-stepfunctions";
import { SynthUtils } from "@aws-cdk/assert";
import { ScheduledTask } from "../src";

describe("ScheduledTask", () => {
  test("ok", () => {
    const stack = new Stack();
    const lockTable = new Table(stack, "LockTable", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });
    new ScheduledTask(stack, "Task", {
      lockTable,
      taskName: "test-task",
      invocationRule: new Rule(stack, "RunEveryHourRule", {
        schedule: Schedule.cron({ minute: "0/10", weekDay: "MON-FRI" }),
      }),
      invokeMain: new Wait(stack, "Wait", {
        time: WaitTime.duration(Duration.minutes(10)),
      }),
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
