import { ReadableStream as NodeReadableStream } from "node:stream/web";
import test from "ava";

import { StringReplaceTransformStream } from "./string-replace-transform-stream";

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

const FILE_CONTENT_1 = `
import { thing } from "thing";

thing.config({ /* __$CONFIG__ */ });
thing.method("thing");
`;

const FILE_CONTENT_2 = `
import { thing1, thing2 } from "thing";

thing1.config({ /* __$CONFIG__ */ });
thing1.method("thing");

thing2.config({ /* __$CONFIG__ */ });
thing2.method("thing");
`;

test("it should replace a string within a stream", async (t) => {
  const config = { test: true };
  const stream = new NodeReadableStream<string>(
    new StringStreamSource(FILE_CONTENT_1),
  ) as ReadableStream<string>;
  const reader = stream
    .pipeThrough<string>(
      new StringReplaceTransformStream(
        "{ /* __$CONFIG__ */ }",
        JSON.stringify(config),
      ),
    )
    .getReader();

  let result = "";
  let finished = false;

  while (!finished) {
    const chunk = await reader.read();

    if (chunk.done) {
      finished = true;
    } else {
      result += chunk.value;
    }
  }

  t.is(
    result,
    FILE_CONTENT_1.replace("{ /* __$CONFIG__ */ }", JSON.stringify(config)),
  );
});

test("it should replace a string within a stream using a RegExp", async (t) => {
  const config = { test: true };
  const stream = new NodeReadableStream<string>(
    new StringStreamSource(FILE_CONTENT_1),
  ) as ReadableStream<string>;
  const reader = stream
    .pipeThrough<string>(
      new StringReplaceTransformStream(
        /{ \/\* __\$CONFIG__ \*\/ }/,
        JSON.stringify(config),
      ),
    )
    .getReader();

  let result = "";
  let finished = false;

  while (!finished) {
    const chunk = await reader.read();

    if (chunk.done) {
      finished = true;
    } else {
      result += chunk.value;
    }
  }

  t.is(
    result,
    FILE_CONTENT_1.replace("{ /* __$CONFIG__ */ }", JSON.stringify(config)),
  );
});

test("it should only replace the string once by default", async (t) => {
  const config = { test: true };
  const stream = new NodeReadableStream<string>(
    new StringStreamSource(FILE_CONTENT_2),
  ) as ReadableStream<string>;
  const reader = stream
    .pipeThrough<string>(
      new StringReplaceTransformStream(
        "{ /* __$CONFIG__ */ }",
        JSON.stringify(config),
      ),
    )
    .getReader();

  let result = "";
  let finished = false;

  while (!finished) {
    const chunk = await reader.read();

    if (chunk.done) {
      finished = true;
    } else {
      result += chunk.value;
    }
  }

  t.is(
    result,
    FILE_CONTENT_2.replace("{ /* __$CONFIG__ */ }", JSON.stringify(config)),
  );
});

test("it should only replace the string once by default with RegExp", async (t) => {
  const config = { test: true };
  const stream = new NodeReadableStream<string>(
    new StringStreamSource(FILE_CONTENT_2),
  ) as ReadableStream<string>;
  const reader = stream
    .pipeThrough<string>(
      new StringReplaceTransformStream(
        /{ \/\* __\$CONFIG__ \*\/ }/,
        JSON.stringify(config),
      ),
    )
    .getReader();

  let result = "";
  let finished = false;

  while (!finished) {
    const chunk = await reader.read();

    if (chunk.done) {
      finished = true;
    } else {
      result += chunk.value;
    }
  }

  t.is(
    result,
    FILE_CONTENT_2.replace("{ /* __$CONFIG__ */ }", JSON.stringify(config)),
  );
});

test("it should replace the every occurence of the string with a global RegExp", async (t) => {
  const config = { test: true };
  const stream = new NodeReadableStream<string>(
    new StringStreamSource(FILE_CONTENT_2),
  ) as ReadableStream<string>;
  const reader = stream
    .pipeThrough<string>(
      new StringReplaceTransformStream(
        /{ \/\* __\$CONFIG__ \*\/ }/g,
        JSON.stringify(config),
      ),
    )
    .getReader();

  let result = "";
  let finished = false;

  while (!finished) {
    const chunk = await reader.read();

    if (chunk.done) {
      finished = true;
    } else {
      result += chunk.value;
    }
  }

  t.is(
    result,
    FILE_CONTENT_2.replace(
      /{ \/\* __\$CONFIG__ \*\/ }/g,
      JSON.stringify(config),
    ),
  );
});
