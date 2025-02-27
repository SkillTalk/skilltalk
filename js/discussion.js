const socket = io("http://192.168.0.112:3000", {
  transports: ["websocket"],
});
const peer = new Peer(undefined, {
  host: "192.168.0.112",
  port: "3001",
  path: "/",
  debug: 3,
});

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get("username");
const room = urlParams.get("room");

if (!username || !room) {
  alert("Invalid session! Redirecting...");
  window.location.href = "https://www.skilltalk.in/"; // Update with your actual homepage or join page
}

let myStream;

// Join Room
socket.emit("joinCall", { room, username });

socket.on("userJoined", ({ users }) => {
  console.log("📢 Received userJoined event:", users);

  document.getElementById("userList").innerHTML = users
    .map(
      (user, index) => `<li>${index + 1}. <strong>${user.name}</strong></li>`
    )
    .join("");

  document.getElementById("participant-count").textContent = users.length;
});

// Chat Messages
document.getElementById("send-message").addEventListener("click", () => {
  const message = document.getElementById("chat-message").value;
  if (message.trim() !== "") {
    socket.emit("sendMessage", { room, username, message });
    document.getElementById("chat-message").value = "";
  }
});

socket.on("receiveMessage", ({ username, message }) => {
  console.log(`📩 Message from ${username}: ${message}`);
  document.getElementById(
    "chat-box"
  ).innerHTML += `<p><strong>${username}:</strong> ${message}</p>`;
});

// Start PeerJS Video
document.getElementById("start-video").addEventListener("click", async () => {
  try {
    myStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    document.getElementById("my-video").srcObject = myStream;

    peer.on("open", (id) => {
      socket.emit("peerId", { room, peerId: id });
    });

    peer.on("call", (call) => {
      call.answer(myStream);
      call.on("stream", (remoteStream) => {
        addRemoteVideo(remoteStream);
      });
    });
  } catch (error) {
    console.error("🚨 Error starting video:", error);
  }
});

function addRemoteVideo(stream) {
  const videoElement = document.createElement("video");
  videoElement.srcObject = stream;
  videoElement.autoplay = true;
  document.getElementById("remote-videos").appendChild(videoElement);
}

// Start PeerJS Server
document.getElementById("leaveCall").addEventListener("click", () => {
  socket.emit("leaveCall", { room, username });
  myStream?.getTracks().forEach((track) => track.stop());
  peer.disconnect();
  window.location.href = "join.html";
});
