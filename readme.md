> resume lang

> [!NOTE]
>
> **STATUS**: Pre-ALPHA

This is one of the many experiments done by [reaper](https://reaper.is), this
time it was to make it easier to write resume in a structured format.

## About

`resume-lang` is a universal javascript DSL written in a way that doesn't crash
for most cases even if the syntax passed isn't completely valid (it does have to
be a little valid!)

## Usage

The package is hosted by [jsr.io](https://jsr.io/) and can be used in most JS
runtimes.

```bash
# in node 
npx jsr add @barelyhuman/resume-lang

# in deno 
deno add jsr:@barelyhuman/resume-lang
```

You can read more about the exported types and parser function on the
[JSR website](https://jsr.io/@barelyhuman/resume-lang/doc)

## Language Guide

> [!TIP]
>
> An easy way to validate is to use the
> [web version](https://barelyhuman.github.io/resume-lang/) of the parser to see
> the generated AST

If you are looking for a reference, you can check the [SPEC](/spec.md) instead
of reading the whole guide

### Labels

Labels are basic building blocks and each label is a node that contains a subset
of single line values.

Example, the below ties `ahoy@barelyhuman.dev` to the label ID `email`

```
label email: ahoy@barelyhuman.dev
```

While the above would report back as a `text` value, we want it to be a url node
and we can do so with a modifier called `url`.

```
label email: url "ahoy@barelyhuman.dev" "mailto:ahoy@barelyhuman.dev"
```

Now, the node is

1. a url node
2. splits the value into an alias/mask to the link and the actual link.

### Groups

Grouping helps makes node's align to each other. The HTML implementation for the
same would be a `div` element. This keyword can be used for cases when 2 or more
`labels` wish to be placed together and you wish to use similar styling for
them.

```
group 
    label startDate: Dec, 2020
    label endDate: Jan, 2021
end
```

This creates an un-named group with the 2 label nodes.

### Sections

Sections are similar to `groups`, except they define a more harder relationship
of the contents.

```
section Education
    section College Name Here 
        group
         label major: "Computer Sciences"
        end

        group 
         label startDate: Dec, 2020
         label endDate: Jan, 2021
        end
    end
end
```

In the example, we wish to keep the major's separate from the duration of
education and this separation helps with formatting the content in various
forms(PDF, HTML, etc) later.

### Rich Text

All of this would make no difference if you couldn't add formatted text or rich
text. This feature has it's own keyword and scope because it needs to support
the markdown spec inside a text only spec.

```
section Skills 
    text skills: 
        - **Databases** - SQL, NoSQL, EdgeDB, NoEdgeDB, SomeDB, NotSomeDB, etc
    end
end
```

The above `text` block is closed with a `end` keyword just like `sections` and
can have an `id`, in this case the `text <textId>:` part. Everything before the
newline separated `end` keyword is considered Markdown and is processed as such.

### License

[MIT](/LICENSE)
