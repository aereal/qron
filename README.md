![npm-badge][npm-badge]
![github-actions-status][github-actions-status]

# qron

qron provides [AWS CDK][aws-cdk] construct libraries that build cron-alternative consists of AWS services.

qron is aimed for the system executes tasks periodically and run in exactly-once manner.

## Document

https://aereal.github.io/qron/

## How to release

```
yarn
yarn build
yarn lerna publish
```

[aws-cdk]: https://github.com/aws/aws-cdk
[npm-badge]: https://img.shields.io/npm/v/@aereal/qron
[github-actions-status]: https://github.com/aereal/qron/workflows/CI/badge.svg
