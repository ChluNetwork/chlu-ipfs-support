# Contributing

## Project setup

- make sure node 8 and yarn are installed
- run `yarn install` to install dependencies

## Hacking

- run `yarn test-node` to execute tests in nodejs. `test` runs tests in both the browser and nodejs and `test-browsers` runs tests in the browser only (requires Firefox)
- run `yarn lint` to check your code against the rules. Please make sure it passes before contributing

### Running tests with a PostgreSQL instance

ChluIPFS has an optional SQL-backed datastore. This is automatically tested with SQLite but also works with
postgresql. To test it, create a `chlu-test` empty database in postgresql then set the following environment
variables:

- `CHLU_POSTGRESQL_USER` to the postgresql user
- `CHLU_POSTGRESQL_PASSWORD` to the postgresql password
- `CHLU_POSTGRESQL_DB` to the DB you set up (`chlu-test`)

The tests will connect to localhost at the default postgresql port. If you have issues try deleting all tables in the
database.