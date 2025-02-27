const socket = io("https://skilltalk.vercel.app", {
  transports: ["websocket"], // Force WebSocket only
});

const peer = new Peer(undefined, { host: "/", port: "3001" });

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get("username");
const room = urlParams.get("room");

if (!username || !room) {
  alert("Invalid session! Redirecting...");
  window.location.href = "index.html";
}

let myStream;

// Debug: Check if connected
socket.on("connect", () => {
  console.log("✅ Connected to WebSocket server.");
});

// Join Room
console.log("📢 Attempting to join room:", room, "as", username);
socket.emit("joinCall", { room, username });

// Update Participants List
socket.on("userJoined", ({ users }) => {
  console.log("✅ Received userJoined event. Users:", users);

  document.getElementById("userList").innerHTML = users
    .map(
      (user, index) =>
        `<li><span class="participant-number">${index + 1}.</span> <strong>${
          user.name
        }</strong></li>`
    )
    .join("");

  document.getElementById("participant-count").textContent = users.length;
});

// Handle Chat Messages
document.getElementById("send-message").addEventListener("click", () => {
  const message = document.getElementById("chat-message").value;
  console.log("📤 Sending message:", message);

  if (message.trim() !== "") {
    socket.emit("sendMessage", { room, username, message });
    document.getElementById("chat-message").value = "";
  }
});

socket.on("receiveMessage", ({ username, message }) => {
  console.log("💬 New message from", username, ":", message);

  document.getElementById(
    "chat-box"
  ).innerHTML += `<p><strong>${username}:</strong> ${message}</p>`;
});

// Video Call
document.getElementById("start-video").addEventListener("click", async () => {
  try {
    myStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: true,
    });

    const videoElement = document.getElementById("my-video");
    videoElement.srcObject = myStream;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.autoplay = true;

    console.log("🎥 Video stream started successfully!");
  } catch (error) {
    console.error("🚨 Error starting video:", error);
    alert(
      "Could not access camera. Make sure it's not being used by another app."
    );
  }
});

// When someone joins, call them with my stream
socket.on("peerConnected", (peerId) => {
  console.log("📡 New peer connected:", peerId);

  if (myStream) {
    const call = peer.call(peerId, myStream);
    call.on("stream", (remoteStream) => {
      addRemoteVideo(remoteStream);
    });
  }
});

// Function to add remote video
function addRemoteVideo(stream) {
  const videoElement = document.createElement("video");
  videoElement.srcObject = stream;
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  videoElement.classList.add("remote-video");
  document.getElementById("remote-videos").appendChild(videoElement);
}

// Stop the video stream properly
document.getElementById("end-video").addEventListener("click", () => {
  if (myStream) {
    myStream.getTracks().forEach((track) => track.stop());
    document.getElementById("my-video").srcObject = null;
    document.getElementById("remote-videos").innerHTML = "";
    console.log("📴 Video call ended.");
  }
});

// Leave Call
document.getElementById("leaveCall").addEventListener("click", () => {
  socket.emit("leaveCall", { room, username });
  myStream?.getTracks().forEach((track) => track.stop());
  peer.disconnect();
  window.location.href = "join.html";
});
