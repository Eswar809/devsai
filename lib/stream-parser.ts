export class StreamParser {
  private chunks: string[] = []; // Memory efficient array buffer
  private callbacks: {
    onContent?: (delta: string, fullContent: string) => void;
    onFinalContent?: (content: string) => void;
  } = {};

  static fromReadableStream(stream: ReadableStream) {
    return new StreamParser(stream);
  }

  constructor(private stream: ReadableStream) {
    this.processStream();
  }

  private async processStream() {
    const reader = this.stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Efficient line management

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;
          
          const data = trimmedLine.slice(6);
          if (data === "[DONE]") {
            this.triggerFinal();
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              this.chunks.push(delta); // O(1) push
              if (this.callbacks.onContent) {
                // Callback ki join chesi pampali
                this.callbacks.onContent(delta, this.chunks.join(''));
              }
            }
          } catch (e) {}
        }
      }

      this.triggerFinal();
    } finally {
      reader.releaseLock();
    }
  }

  private triggerFinal() {
    if (this.callbacks.onFinalContent) {
      this.callbacks.onFinalContent(this.chunks.join(''));
    }
  }

  on(event: "content" | "finalContent", callback: any) {
    if (event === "content") this.callbacks.onContent = callback;
    else if (event === "finalContent") this.callbacks.onFinalContent = callback;
    return this;
  }
}