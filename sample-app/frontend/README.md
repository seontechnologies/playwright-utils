# PactJS Bi-directional Contract Testing Example

- [PactJS Bi-directional Contract Testing Example](#pactjs-bi-directional-contract-testing-example) -
  [Consumer flow for Pact Bi-directional contract testing](#consumer-flow-for-pact-bi-directional-contract-testing)
  - [Provider flow for Pact Bi-directional contract testing](#provider-flow-for-pact-bi-directional-contract-testing)
  - [Bi-directional contract testing details](#bi-directional-contract-testing-details)

This repo is a mirror of
[pact-js-consumer / Consumer service](https://github.com/muratkeremozcan/pact-js-example-consumer),
but it includes a real react UI.

Provider service: https://github.com/muratkeremozcan/pact-js-example-provider

Consumer service: https://github.com/muratkeremozcan/pact-js-example-consumer

React consumer app for bi-directional contract testing (this repo):
https://github.com/muratkeremozcan/pact-js-example-react-consumer

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/8qjfdsunkrdncqrcy3sw.png)

The Axios calls to the backend (`consumer.ts`) and the pact tests
`consumer-contract.pacttest.ts` are 99% similar.

This setup is intended to compare and contrast consumer driven contract testing,
versus bi-directional (provider driven) contract testing.

The Pact related setup from
[pact-js-react-consumer](https://github.com/muratkeremozcan/pact-js-example-consumer)
still applies here - but if you have done that setup at the Pact broker already,
the only setup here is the `.env` file and repo secrets. Use the sample
`.env.example` file to create a `.env` file of your own. These values will also
have to exist in your CI secrets.

```bash
# create a free pact broker at
# https://pactflow.io/try-for-free/
PACT_BROKER_TOKEN=***********
PACT_BROKER_BASE_URL=https://yourownorg.pactflow.io
PORT=3000
```

```bash
npm install --registry https://registry.npmjs.or # specify the registry in case you are using a proprietary registry

# parallel unit, typecheck, lint, format
npm run validate

# no need to have server running for these:
npm run cy:open-ct # for cypress component test runner
npm run cy:run-ct # headless version

# runs the ui and api servers, then opens e2e runner
npm run cy:open-e2e
npm run cy:run-e2e  # headless version

npm run test # run unit tests with jest

# PW scripts
npm run pw:open-local       # open mode (local config)
npm run pw:open-local-debug # open with debug (local config)

npm run pw:run-local        # run mode (local config)
npm run pw:run-local-debug  # run with debug (local config)

npm run pw:open-ct          # open mode (component tests)
npm run pw:open-ct-debug    # open with debug (component tests)

npm run pw:run-ct           # run mode (component tests)
npm run pw:run-ct-debug     # run with debug (component tests)

npm run pw:trace            # inspect a trace.zip file
npm run pw:clear            # remove all temporary PW files
```

#### Consumer flow for Pact Bi-directional contract testing

Unlike traditional consumer driven contract testing, there is no need for a
specific order of executions between the consumer and the provider. The provider
only has to publish their OpenAPI spec and at the Pact broker, consumer tests
are verified against the OpenAPI spec.

We only verify against what's published at dev of the provider; the provider can
make any changes to their OpenAPI spec, merge to main unimpeded, and we always
have to ensure we're aligned with that at the consumer. The provider's only
responsibility is ensuring that their OpenAPI spec is correct; and they can do
schema testing for that - which in our case is done during api e2e.

```bash
npm run test:consumer # (4)
npm run publish:pact # (5)
npm run can:i:deploy:consumer #(6)
# only on main
npm run record:consumer:deployment --env=dev # (7) change the env param as needed
```

### Provider flow for Pact Bi-directional contract testing

```bash
npm run generate:openapi # (1) generates an OpenAPI doc from Zod schemas
npm run publish:pact-openapi # (2) on main, publish the open api spec to Pact Broker for BDCT
npm run record:provider:bidirectional:deployment --env=dev # (3) on main record the bi-directional provider deployment
```

On the provider side, the generation of the OpenAPI spec happens automatically
with every PR and gets committed to the repo, if there are any changes in the
spec file.

All non-pact-bi-directional related testing happens in PRs (including schema
testing during api e2e), so we are 100% confident of the commit quality.

The merge to main happens on a passing PR.

Finally, on main. we have `contract-publish-openapi.yml` , which publishes the
OpenAPI spec to Pact broker with `npm run publish:pact-openapi` and records the
bi-directional provider deployment with
`npm run record:provider:bidirectional:deployment --env=dev`.

### Bi-directional contract testing details

In CDCT, the consumer tests are executed on the provider side, which mandates
that the provider server can be served locally. This might be a blocker for
CDCT. It might also happen that we want to contract-test against a provider
outside of the org.

BDCT offers an easier alternative to CDCT. All you need is the OpenAPI spec of
the provider, and the consumer side stays the same.

Here is how it goes:

1. **Generate the OpeAPI spec at the provider**

   Automate this step using tools like `zod-to-openapi`, `swagger-jsdoc`,
   [generating OpenAPI documentation directly from TypeScript types, or generating the OpenAPI spec from e2e tests (using Optic)](https://dev.to/muratkeremozcan/automating-api-documentation-a-journey-from-typescript-to-openapi-and-schema-governence-with-optic-ge4).
   Manual spec writing is the last resort.

2. **Ensure that the spec matches the real API**

   `cypress-ajv-schema-validator`: if you already have cy e2e and you want to
   easily chain on to the existing api calls.

   Optic: lint the schema and/or run the e2e suite against the OpenAPI spec
   through the Optic proxy.

   Dredd: executes its own tests (magic!) against your openapi spec (needs your
   local server, has hooks for things like auth.)

3. **Publish the OpenAPI spec to the pact broker at the provider**.

   ```bash
      npm run publish:pact-openapi
   ```

4. **Record the provider bi-directional deployment at the provider **.

   We still have to record the provider bi-directional, similar to how we do it
   in CDCT. Otherwise the consumers will have nothing to compare against.

   ```bash
   npm run record:provider:bidirectional:deployment --env=dev
   ```

5. **Execute the consumer contract tests at the consumer**

   Execution on the Consumer side works exactly the same as classic CDCT.

   ```bash
    npm run test:consumer
    npm run publish:pact
    npm run can:i:deploy:consumer
    # only on main
    npm run record:consumer:deployment --env=dev
   ```

As you can notice, there is nothing about running the consumer tests on the
provider side ( `test:provider`), can-i-deploy checks
(`can:i:deploy:provider`),. All you do is get the OpenAPI spec right, publish it
to Pact Broker, and record the deployment.

The
[api calls](https://github.com/muratkeremozcan/pact-js-example-react-consumer/blob/main/src/consumer.ts)
are the same as the plain, non-UI app used int CDCT.

We cannot have CDCT and BDCT in the same contract relationship. Although, we can
have the provider have consumer driven contracts with some consumers and
provider driven contracts with others

```bash
Consumer        -> CDCT  -> Provider

Consumer-React  <- BDCT  <- Provider
```
