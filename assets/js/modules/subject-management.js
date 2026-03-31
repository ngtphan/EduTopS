export const registerSubjectForm = () => {
  document
    .getElementById("subjectForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("sub_name").value.trim();
      const color = document.getElementById("sub_color").value;
      if (name) {
        await window.cloudSave("subjects", {
          id: "sub_" + Date.now(),
          name,
          color,
        });
        document.getElementById("sub_name").value = "";
      }
    });
};
