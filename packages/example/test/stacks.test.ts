import { join, resolve } from "path";
import { mkdirSync } from "fs";
import { QronApp } from "../src/app";

describe("Stacks", () => {
  const packageRoot = resolve(__dirname, "../");
  // throw new Error(`packageRoot=${packageRoot}`);
  mkdirSync(join(packageRoot, "lambda-functions.dist/sleep"), {
    recursive: true,
  });
  const app = QronApp.newForTest();
  const { stacks } = app.synth();

  for (const stack of stacks) {
    test(`Stack ${stack.stackName}`, () => {
      expect(stack.template).toMatchSnapshot();
    });
  }
});
