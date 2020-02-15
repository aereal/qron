import {
  IStepFunctionsTask,
  StepFunctionsTaskConfig,
} from "@aws-cdk/aws-stepfunctions";
import { ITable, Attribute } from "@aws-cdk/aws-dynamodb";
import { PolicyStatement } from "@aws-cdk/aws-iam";

export interface AttributeValue extends Attribute {
  readonly value: any;
}

const renderAttributeValues = (attrs: AttributeValue[]) =>
  attrs.reduce<{ [name: string]: any }>(
    (accum, attr) => ({
      ...accum,
      [attr.name]: {
        [attr.type]: attr.value,
      },
    }),
    {}
  );

interface DynamoDBStepFunctionsTaskProps<P extends {}> {
  readonly table: ITable;
  readonly parameters: P;
}

abstract class DynamoDBStepFunctionsTask<P extends {}>
  implements IStepFunctionsTask {
  protected readonly table: ITable;
  protected readonly parameters: P;

  constructor(props: DynamoDBStepFunctionsTaskProps<P>) {
    this.parameters = props.parameters;
    this.table = props.table;
  }

  protected abstract readonly actionResourceArn: string;

  protected abstract renderParameters(): { [name: string]: any };

  protected policyStatements = (): PolicyStatement[] => [];

  bind = (): StepFunctionsTaskConfig => ({
    resourceArn: this.actionResourceArn,
    parameters: this.renderParameters(),
    policyStatements: this.policyStatements(),
  });
}

interface GetItemParameters {
  readonly key: AttributeValue;
  readonly attributesToGet?: string[];
}

export class GetItemTask extends DynamoDBStepFunctionsTask<GetItemParameters> {
  actionResourceArn = "arn:aws:states:::dynamodb:getItem";

  renderParameters = (): { [name: string]: any } => ({
    TableName: this.table.tableName,
    Key: renderAttributeValues([this.parameters.key]),
    AttributesToGet: this.parameters.attributesToGet,
    ReturnConsumedCapacity: "TOTAL",
  });

  policyStatements = () => [
    new PolicyStatement({
      resources: [this.table.tableArn],
      actions: ["dynamodb:GetItem"],
    }),
  ];
}

interface PutItemParamters {
  readonly item: AttributeValue[];
  readonly key: string;
}

export class PutItemTask extends DynamoDBStepFunctionsTask<PutItemParamters> {
  actionResourceArn = "arn:aws:states:::dynamodb:putItem";

  renderParameters = (): { [name: string]: any } => ({
    TableName: this.table.tableName,
    // TODO: Item
  });

  policyStatements = () => [
    new PolicyStatement({
      resources: [this.table.tableArn],
      actions: ["dynamodb:PutItem"],
    }),
  ];
}

interface DeleteItemParamters {
  readonly key: AttributeValue;
}

export class DeleteItemTask extends DynamoDBStepFunctionsTask<
  DeleteItemParamters
> {
  actionResourceArn = "arn:aws:states:::dynamodb:deleteItem";

  renderParameters = (): { [name: string]: any } => ({
    TableName: this.table.tableName,
    Key: renderAttributeValues([this.parameters.key]),
  });

  policyStatements = () => [
    new PolicyStatement({
      resources: [this.table.tableArn],
      actions: ["dynamodb:DeleteItem"],
    }),
  ];
}

export type UpdateItemReturnValues =
  | "NONE"
  | "ALL_OLD"
  | "UPDATED_OLD"
  | "ALL_NEW"
  | "UPDATED_NEW";

interface UpdateItemParameters {
  readonly key: AttributeValue;
  readonly expressionAttributeValues?: AttributeValue[];
  readonly updateExpression?: string;
  readonly returnValues?: UpdateItemReturnValues;
}

export class UpdateItemTask extends DynamoDBStepFunctionsTask<
  UpdateItemParameters
> {
  actionResourceArn = "arn:aws:states:::dynamodb:updateItem";

  renderParameters = (): { [name: string]: any } => ({
    TableName: this.table.tableName,
    Key: renderAttributeValues([this.parameters.key]),
    ExpressionAttributeValues: this.parameters.expressionAttributeValues
      ? renderAttributeValues(this.parameters.expressionAttributeValues)
      : undefined,
    UpdateExpression: this.parameters.updateExpression,
    ReturnValues: this.parameters.returnValues,
  });

  policyStatements = () => [
    new PolicyStatement({
      resources: [this.table.tableArn],
      actions: ["dynamodb:UpdateItem"],
    }),
  ];
}
