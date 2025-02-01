const {
  nowInSec,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
  uuidV4,
} = window.skyway_room;
const roomName = localStorage.getItem("skyway-roomId") || 'developerd';

const API_KEY = "f7e31d2a-4c74-4909-ad3f-7e845e5a4a53";
const userId = localStorage.getItem("userId");
const selectedChatId = localStorage.getItem("selectedChatId");
const caller = localStorage.getItem("caller") === "true";

// HTML elements
const myVideo = document.getElementById("local-video");
const remoteMediaArea = document.getElementById("remote-media-area");
const loader = document.querySelector(".loader");
const idShow = document.getElementById("idShow");

const token = new SkyWayAuthToken({
  jti: uuidV4(),
  iat: nowInSec(),
  exp: nowInSec() + 60 * 30, // 0.5 hour
  version: 3,
  scope: {
    appId: API_KEY, // Application ID
    rooms: [
      {
        name: "*",
        methods: ["create", "close", "updateMetadata"],
        member: {
          name: "*",
          methods: ["publish", "subscribe", "updateMetadata"],
        },
      },
    ],
  },
}).encode("p9jJDiGR2GrIbyI1d48CqTxJ1cijy/RuC8YvtdqzDcI="); // Secret key

(async () => {
  const joinButton = document.getElementById("join");
  const leaveButton = document.getElementById("leave");
  const audioToggle = document.getElementById("audio-toggle");
  const videoToggle = document.getElementById("video-toggle");

  const { audio, video } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
  video.attach(myVideo);
  await myVideo.play();

  joinButton.onclick = async () => {
    idShow.textContent = '~接続しています~'
    joinButton.style.animation = "fadeOutMove 1s forwards";
    await new Promise(resolve => setTimeout(resolve, 1000));
    joinButton.remove();
    if (roomName === "") return;

    loader.style.display = "block"; // Show loader
    const context = await SkyWayContext.Create(token);
    const room = await SkyWayRoom.FindOrCreate(context, {
      type: "p2p",
      name: roomName,
    });
    const me = await room.join();

    idShow.textContent = `ID: ${me.id}`;

    await me.publish(audio);
    await me.publish(video);

    const subscribeAndAttach = async (publication) => {
      if (publication.publisher.id === me.id) return;

      const { stream } = await me.subscribe(publication.id);

      let newMedia;
      switch (stream.track.kind) {
        case "video":
          newMedia = document.createElement("video");
          newMedia.playsInline = true;
          newMedia.autoplay = true;
          loader.style.display = "none"; // Hide loader when remote participant joins
          idShow.style.display = "none"; // Hide ID
          break;
        case "audio":
          newMedia = document.createElement("audio");
          newMedia.controls = true;
          newMedia.autoplay = true;
          newMedia.style.display = "none";
          break;
        default:
          return;
      }
      newMedia.id = `media-${publication.id}`;
      stream.attach(newMedia);
      remoteMediaArea.appendChild(newMedia);
    };

    room.publications.forEach(subscribeAndAttach);
    room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));

    leaveButton.onclick = async () => {
      await me.leave();
      await room.dispose();
      endCall();

      idShow.textContent = "";
      remoteMediaArea.replaceChildren();
      loader.style.display = "none"; // Hide loader on leave
    };

    room.onStreamUnpublished.add((e) => {
      document.getElementById(`media-${e.publication.id}`)?.remove();
    });

    // Toggle audio
    audioToggle.onclick = () => {
      audio.enabled = !audio.enabled;
      audioToggle.textContent = audio.enabled ? "🎙️ 音声オンオフ" : "🔇 音声オンオフ";
    };

    // Toggle video
    videoToggle.onclick = () => {
      video.enabled = !video.enabled;
      videoToggle.textContent = video.enabled ? "📹 ビデオオンオフ" : "📵 ビデオオンオフ";
    };
  };
})();

function endCall() {
  if (window.top !== window.self) {
    window.top.postMessage('closeIframe', '*');
  } else {
    console.log('Not running inside an iframe');
  }
}
