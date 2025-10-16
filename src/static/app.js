document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML content for safety
  function escapeHtml(text) {
    if (typeof text !== "string") return text;
    return text.replace(/[&<>"']/g, (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])
    );
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (preserve placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML (list with delete buttons) or fallback message
        let participantsSection = document.createElement('div');
        participantsSection.className = 'participants-section';

        const title = document.createElement('h5');
        title.className = 'participants-title';
        title.textContent = `Participants (${details.participants.length})`;
        participantsSection.appendChild(title);

        if (Array.isArray(details.participants) && details.participants.length) {
          const ul = document.createElement('ul');
          ul.className = 'participants-list';

          details.participants.forEach((p) => {
            const li = document.createElement('li');
            li.innerHTML = `
              <span class="participant-email">${escapeHtml(p)}</span>
              <button class="delete-participant" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" title="Unregister" aria-label="Unregister participant">🗑️</button>
            `;
            ul.appendChild(li);
          });

          participantsSection.appendChild(ul);
        } else {
          const empty = document.createElement('p');
          empty.className = 'participants-empty';
          empty.textContent = 'No participants yet';
          participantsSection.appendChild(empty);
        }

        activityCard.appendChild(document.createElement('h4')).textContent = escapeHtml(name);
        const desc = document.createElement('p');
        desc.textContent = details.description;
        activityCard.appendChild(desc);

        const sched = document.createElement('p');
        sched.innerHTML = `<strong>Schedule:</strong> ${escapeHtml(details.schedule)}`;
        activityCard.appendChild(sched);

        const avail = document.createElement('p');
        avail.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
        activityCard.appendChild(avail);

        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for the participants in this activity
        activityCard.querySelectorAll('.delete-participant').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const activity = btn.getAttribute('data-activity');
            const email = btn.getAttribute('data-email');

            if (!activity || !email) return;

            // Confirm action with user
            const confirmed = confirm(`Unregister ${email} from ${activity}?`);
            if (!confirmed) return;

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
                method: 'DELETE'
              });

              const result = await resp.json().catch(() => ({}));

              if (resp.ok) {
                // Refresh activities list
                fetchActivities();
                messageDiv.textContent = result.message || 'Participant unregistered';
                messageDiv.className = 'message success';
              } else {
                messageDiv.textContent = result.detail || result.message || 'Failed to unregister participant';
                messageDiv.className = 'message error';
              }

              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 4000);
            } catch (err) {
              messageDiv.textContent = 'Failed to unregister. Please try again.';
              messageDiv.className = 'message error';
              messageDiv.classList.remove('hidden');
              console.error('Error unregistering participant:', err);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities immediately so the new participant appears
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
