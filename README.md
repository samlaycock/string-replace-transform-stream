# String Replace Transform Stream

A
[Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
compatible
[TransformStream](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream)
that replaces one (or all) occurrences of a string within a stream (of either
`string` or `Uint8Array` chunks) with another string.

## Install

`npm i string-replace-transform-stream`

## Usage

Here is a trivial example to replace all occurrences of `foo` with `bar`:

```ts
import { StringReplaceTransformStream } from "string-replace-transform-stream";

class StringStreamSource {
  #content: string;

  constructor(content: string) {
    this.#content = content;
  }

  start(controller: ReadableStreamDefaultController) {
    const end = this.#content.length;
    let start = 0;

    const interval = setInterval(() => {
      if (start < end) {
        const nextStart = end - start < 5 ? end : start + 5;
        const chunk = this.#content.slice(start, nextStart);

        start = nextStart;

        controller.enqueue(chunk);
      } else {
        controller.close();
        clearInterval(interval);
      }
    }, 10);
  }
}

const stream = new ReadableStream<string>(
  new StringStreamSource("foo foo foo foo foo"),
);
const transformed = stream.pipeThrough<string>(
  new StringReplaceTransformStream("foo", "bar")
);
const reader = transformed.getReader(); // The reader's content will be "bar foo foo foo foo"
```

You can use a `RegExp` instead of a string as your matching value:

```ts
// ...
const transformed = stream.pipeThrough<string>(
  new StringReplaceTransformStream(/foo/, "bar")
);
// ...
```

You can add the `g` (global) flag to replace **all** occurrences of the matching
value:

```ts
// ...
const transformed = stream.pipeThrough<string>(
  new StringReplaceTransformStream(/foo/g, "bar")
);
const reader = transformed.getReader(); // The reader's content will be "bar bar bar bar bar"
// ...
```

**Note:** If you use a `RegExp` (especially with the `g` flag), the transform
stream will greedily buffer the stream's chunks until it finds a match (which it
may not, and therefore buffer the whole contents of the stream). This means that
if you have a very large stream, you may see increased memory usage.
