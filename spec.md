# Spec

## Grammar

### Scope Based

- `section <name> <body> endsection`

### Modifiers

- `label`
  - `label <label>:<value>`
  - `label :<value>` - Allow an empty label to be parsed
- `date <supported-date-formats>`
- `url`
  - `url <url>`
  - `url "<alias>" <url>`
- `@import "<relative-path-to-partial>"`
