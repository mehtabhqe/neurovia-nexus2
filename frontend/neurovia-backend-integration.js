console.log("Backend integration loaded");

const API_URL = "https://neurovia-nexus-api.onrender.com";

const technicianForm = document.getElementById("technicianForm");

if (technicianForm) {
technicianForm.addEventListener("submit", async (e) => {
e.preventDefault();

```
    const data = {
        full_name: document.getElementById("fullName")?.value?.trim() || "",
        phone: document.getElementById("techPhone")?.value?.trim() || "",
        email: document.getElementById("email")?.value?.trim() || "",
        city: document.getElementById("techCity")?.value?.trim() || "",
        expertise: document.getElementById("skills")?.value?.trim() || "",
        experience: document.getElementById("experience")?.value?.trim() || "",
        about: document.getElementById("about")?.value?.trim() || ""
    };

    console.log("Sending:", data);

    try {
       const response = await fetch(
    API_URL + "/api/technician/register",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    }
);

        const result = await response.json();

        console.log("Server Response:", result);

        if (result.success) {
            alert("Application submitted successfully!");
            technicianForm.reset();
        } else {
            alert(result.message || "Submission failed");
            console.error(result);
        }
    } catch (error) {
        console.error("Connection Error:", error);
        alert("Cannot connect to server.");
    }
});
```

}