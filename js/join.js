document.getElementById("joinCall").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const room = document.getElementById("roomSelect").value.trim();

  if (!username || !room) {
    alert("Please enter your name and room.");
    return;
  }

  // Redirect to discussion page with query parameters
  window.location.href = `discussion.html?username=${encodeURIComponent(
    username
  )}&room=${encodeURIComponent(room)}`;
});
