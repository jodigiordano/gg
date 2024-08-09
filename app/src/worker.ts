// Interface used for both requests & responses.
export interface WorkerOperation {
  operation: string;
  [payloadKey: string]: unknown;
}

export default class WebWorker {
  // While initializing the worker, things may happen in the app.
  // Here we cumulate those operations until the worker is ready.
  private delayedOperations: {
    operation: WorkerOperation;
    options?: StructuredSerializeOptions;
  }[];

  // Callers can be notified when operations are performed.
  private operationEndedCallbacks: Record<
    string,
    (data: WorkerOperation) => void
  >;

  private codeLoadedCallbacks: (() => void)[];

  private codeLoaded: boolean;
  private worker: Worker;

  constructor(worker: Worker) {
    this.codeLoaded = false;
    this.delayedOperations = [];
    this.operationEndedCallbacks = {};
    this.codeLoadedCallbacks = [];

    this.worker = worker;

    this.worker.onmessage = event => {
      if (event.data.operation === "ready") {
        this.codeLoaded = true;

        for (const callback of this.codeLoadedCallbacks) {
          callback();
        }
      } else {
        if (this.operationEndedCallbacks[event.data.operationId]) {
          this.operationEndedCallbacks[event.data.operationId](event.data);
          delete this.operationEndedCallbacks[event.data.operationId];
        }
      }
    };

    this.worker.onerror = error => {
      console.warn(error);
    };

    this.worker.onmessageerror = error => {
      console.warn(error);
    };
  }

  onCodeLoaded(callback: () => void): void {
    if (!this.codeLoaded) {
      this.codeLoadedCallbacks.push(callback);
    } else {
      callback();
    }
  }

  async sendOperation(
    operation: WorkerOperation,
    options?: StructuredSerializeOptions,
  ): Promise<WorkerOperation> {
    return new Promise(resolve => {
      const id = crypto.randomUUID();

      operation.operationId = id;

      this.operationEndedCallbacks[id] = data => resolve(data);

      if (this.codeLoaded) {
        this.worker.postMessage(operation, options);
      } else {
        this.delayOperation(operation, options);
      }
    });
  }

  sendDelayedOperations(): void {
    for (const { operation, options } of this.delayedOperations) {
      this.worker.postMessage(operation, options);
    }

    this.delayedOperations.length = 0;
  }

  private delayOperation(
    operation: WorkerOperation,
    options?: StructuredSerializeOptions,
  ): void {
    let readIndex = 0;
    let writeIndex = 0;

    // We only support delaying one instance of an operation.
    // For example, if we call "sendOperation" 3 times for the
    // operation "foo", only the latest call is retained to be delayed.
    while (readIndex < this.delayedOperations.length) {
      const op = this.delayedOperations[readIndex]!;

      if (op.operation.operation !== operation.operation) {
        this.delayedOperations[writeIndex] = op;

        writeIndex++;
      }

      readIndex++;
    }

    this.delayedOperations.length = writeIndex;

    this.delayedOperations.push({ operation, options });
  }
}
