// This file ensures per-session isolation for SSE streams
export function createSessionStream(sessionId) {
  // Fix: Concurrent sessions were sharing event buffers
  // We now create a unique buffer array per session ID
  const sessionBuffer = [];
  return {
    push: (data) => sessionBuffer.push(data),
    flush: () => {
      const data = [...sessionBuffer];
      sessionBuffer.length = 0;
      return data;
    }
  };
}
