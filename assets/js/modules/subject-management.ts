type CloudSaveFn = (
  collection: string,
  payload: Record<string, unknown>,
) => Promise<unknown>;

const getCloudSave = (): CloudSaveFn | null => {
  const cloudSave = (globalThis as { cloudSave?: unknown }).cloudSave;
  return typeof cloudSave === "function" ? (cloudSave as CloudSaveFn) : null;
};

export const registerSubjectForm = (): void => {
  const form = document.getElementById("subjectForm");
  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nameInput = document.getElementById("sub_name");
    const colorInput = document.getElementById("sub_color");
    const cloudSave = getCloudSave();

    if (!(nameInput instanceof HTMLInputElement)) return;
    if (!(colorInput instanceof HTMLSelectElement)) return;
    if (!cloudSave) return;

    const name = nameInput.value.trim();
    const color = colorInput.value;
    if (!name) return;

    await cloudSave("subjects", {
      id: `sub_${Date.now()}`,
      name,
      color,
    });
    nameInput.value = "";
  });
};

