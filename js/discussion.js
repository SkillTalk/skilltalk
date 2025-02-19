const socket = io("http://localhost:3000");
const peer = new Peer(undefined, { host: "/", port: "3001" });

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get("username");
const room = urlParams.get("room");

if (!username || !room) {
  alert("Invalid session! Redirecting...");
  window.location.href = "index.html";
}

let myStream;

// Join Room
socket.emit("joinCall", { room, username });

// Update Participants List
socket.on("userJoined", ({ users }) => {
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
  if (message.trim() !== "") {
    socket.emit("sendMessage", { room, username, message });
    document.getElementById("chat-message").value = "";
  }
});

socket.on("receiveMessage", ({ username, message }) => {
  document.getElementById(
    "chat-box"
  ).innerHTML += `<p><strong>${username}:</strong> ${message}</p>`;
});

// Video Call
document.getElementById("start-video").addEventListener("click", async () => {
  try {
    // Request video and audio permissions
    myStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: true,
    });

    // Set my video stream
    document.getElementById("my-video").srcObject = myStream;

    // When PeerJS connects, send my stream to others
    peer.on("open", (id) => {
      socket.emit("newPeer", { room, peerId: id });
    });

    // When receiving another person's stream, display it
    peer.on("call", (call) => {
      call.answer(myStream);
      call.on("stream", (remoteStream) => {
        addRemoteVideo(remoteStream);
      });
    });

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

// Voice Call
document.getElementById("start-voice").addEventListener("click", async () => {
  myStream = await navigator.mediaDevices.getUserMedia({ audio: true });
});

document.getElementById("end-voice").addEventListener("click", () => {
  myStream.getTracks().forEach((track) => track.stop());
});

// Leave Call
document.getElementById("leaveCall").addEventListener("click", () => {
  socket.emit("leaveCall", { room, username });
  myStream?.getTracks().forEach((track) => track.stop());
  peer.disconnect();
  window.location.href = "join.html";
});
