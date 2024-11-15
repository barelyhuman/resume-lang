# Spec

## Grammar

### Scope Based

- `section <name> <body> \n end` - Grouper and can be nested infinitely
- `text` - Rich text
  - `text <textId>:<value> \n end`
  - `text :<value> \n end`

### Modifiers

- `label` - Single line label and value pairs
  - `label <label>:<value>`
  - `label :<value>` - Allow an empty label to be parsed
- `@import "<relative-path-to-partial>"`

### Functions

- `date <supported-date-formats>` - For now supports all formats supported by [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- `url` - For now just parses the urls and adds them to the nodal structure. 
  - `url <url>`
  - `url "<alias>" <url>`
