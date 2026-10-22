/** One in-flight submission per form, including presses before React renders again. */
export function createSubmission(onSavingChange: (saving: boolean) => void) {
  let pending = false;

  return {
    isPending: () => pending,
    async run<T>(action: () => Promise<T>): Promise<T | undefined> {
      if (pending) return undefined;
      pending = true;
      onSavingChange(true);
      try {
        return await action();
      } finally {
        pending = false;
        onSavingChange(false);
      }
    }
  };
}
