export class StringReplaceTransformStream extends TransformStream<
  string | Uint8Array,
  string
> {
  readonly #searchStringOrRegex: string | RegExp;

  readonly #replaceString: string;

  readonly #decoder = new TextDecoder();

  readonly #global: boolean = false;

  #buffer = "";

  #finished = false;

  constructor(searchStringOrRegex: string | RegExp, replaceString: string) {
    super({
      start: () => {}, // This is required, but we don't need to do anything here.
      transform: (chunk, controller) => {
        const chunkData =
          typeof chunk === "string" ? chunk : this.#decoder.decode(chunk);

        // this.#buffer is a sliding view of the characters of previous chunks
        // where we have seen a partial match of the search string/RegExp.
        if (this.#finished) {
          if (this.#buffer) {
            controller.enqueue(this.#buffer);
            this.#buffer = "";
          }

          controller.enqueue(chunkData);
        } else if (this.#searchStringOrRegex instanceof RegExp) {
          // If searching for a RegExp, we don't need to go character by character.
          this.#buffer = `${this.#buffer}${chunkData}`;

          const match = this.#buffer.match(this.#searchStringOrRegex);

          if (match) {
            const nextChunk = this.#buffer.replace(
              this.#searchStringOrRegex,
              this.#replaceString,
            );

            this.#buffer = "";

            controller.enqueue(nextChunk);

            if (!this.#global) {
              this.#finished = true;
            }
          }
        } else {
          for (let i = 0; i < chunkData.length; i += 1) {
            const nextChar = chunkData[i];
            let nextChunk = "";

            this.#buffer = `${this.#buffer}${nextChar}`;

            if (this.#buffer.includes(this.#searchStringOrRegex)) {
              nextChunk = this.#buffer.replace(
                this.#searchStringOrRegex,
                this.#replaceString,
              );
              this.#finished = true;
            } else if (this.#buffer.length > this.#searchStringOrRegex.length) {
              for (const char of Array.from(this.#buffer).reverse()) {
                nextChunk = `${char}${nextChunk}`;

                if (this.#searchStringOrRegex.startsWith(nextChunk)) {
                  nextChunk = "";
                  break;
                }
              }
            }

            if (nextChunk) {
              this.#buffer = "";

              controller.enqueue(nextChunk);
            }
          }
        }
      },
      flush: (controller) => {
        if (this.#buffer) {
          controller.enqueue(this.#buffer);
        }

        controller.terminate();
      },
    });

    this.#searchStringOrRegex = searchStringOrRegex;
    this.#global =
      searchStringOrRegex instanceof RegExp
        ? searchStringOrRegex.global
        : false;
    this.#replaceString = replaceString;
  }
}
