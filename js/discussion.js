const socket = io("https://skilltalk-production.up.railway.app", {
  transports: ["websocket", "polling"],
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

// Stop Video
document.getElementById("end-video").addEventListener("click", () => {
  if (myStream) {
    myStream.getVideoTracks().forEach((track) => track.stop()); // Stop video track completely
    document.getElementById("my-video").srcObject = null; // Remove video feed
  }
});

// Start Voice
document.getElementById("start-voice").addEventListener("click", async () => {
  try {
    console.log("🎙️ Start Voice Button Clicked!");

    if (!myStream) {
      console.log("🔄 No existing stream, requesting a new one...");
      myStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log("✅ New Audio Stream Retrieved:", myStream);
      document.getElementById("my-video").srcObject = myStream; // Assign stream
    } else if (myStream.getAudioTracks().length === 0) {
      console.log(
        "🎤 No audio track found, requesting new microphone access..."
      );
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      myStream.addTrack(audioStream.getAudioTracks()[0]); // Add new audio track
      console.log("✅ Microphone started.");
    } else {
      console.log("✅ Enabling existing audio track...");
      myStream.getAudioTracks().forEach((track) => (track.enabled = true));
    }
  } catch (error) {
    console.error("🚨 Error starting voice:", error);
  }
});

// Stop Voice
document.getElementById("end-voice").addEventListener("click", () => {
  console.log("🎤 Stop Voice Button Clicked! Checking myStream:", myStream);

  if (!myStream) {
    console.warn("🚨 No active media stream found!");
    return;
  }

  const audioTracks = myStream.getAudioTracks();
  console.log("🎧 Audio Tracks Found:", audioTracks);

  if (audioTracks.length === 0) {
    console.warn("🚨 No audio tracks available in myStream!");
    return;
  }

  audioTracks.forEach((track) => {
    console.log("🛑 Stopping Audio Track:", track);
    track.stop(); // Completely stop the microphone
    myStream.removeTrack(track); // Remove the track from myStream
  });

  console.log("🔇 Voice Stopped: Audio track removed.");
});

// Function to add remote video
function addRemoteVideo(stream) {
  const videoElement = document.createElement("video");
  videoElement.srcObject = stream;
  videoElement.autoplay = true;
  document.getElementById("remote-videos").appendChild(videoElement);
}

// Leave Call
document.getElementById("leaveCall").addEventListener("click", () => {
  socket.emit("leaveCall", { room, username });
  myStream?.getTracks().forEach((track) => track.stop());
  peer.disconnect();
  window.location.href = "join.html";
});
