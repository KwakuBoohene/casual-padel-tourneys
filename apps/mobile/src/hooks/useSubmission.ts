import { useState } from "react";

import { createSubmission } from "../utilities/submission";

export function useSubmission() {
  const [saving, setSaving] = useState(false);
  const [submission] = useState(() => createSubmission(setSaving));
  return { saving, ...submission };
}
