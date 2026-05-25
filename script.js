const WORKER_URL = "https://english-ai-worker.vocidicassino.workers.dev/";

let conversationHistory = [];
let recognition;
let isListening = false;

function showPage(pageId){
  document.querySelectorAll('.page').forEach(page=>{
    page.classList.remove('active');
  });

  document.getElementById(pageId).classList.add('active');
}

function speakText(text){

  let cleanText = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/#/g, "")
    .replace(/`/g, "")
    .replace(/["“”]/g, "")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[.,;:!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(cleanText);

  // lingua

  speech.lang = "it-IT";

  // velocità più naturale

  speech.rate = 0.95;

  // tono naturale

  speech.pitch = 1;

  // volume

  speech.volume = 1;

  // cerca voce migliore

  const voices = speechSynthesis.getVoices();

  const preferredVoice =
    voices.find(v =>
      v.lang.includes("it") &&
      (
        v.name.includes("Google") ||
        v.name.includes("Natural") ||
        v.name.includes("Enhanced")
      )
    ) || voices.find(v => v.lang.includes("it"));

  if(preferredVoice){
    speech.voice = preferredVoice;
  }

  speechSynthesis.speak(speech);
}

function speakEnglish(text){
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "en-US";
  speech.rate = 0.85;
  speech.pitch = 1;
  speechSynthesis.speak(speech);
}

function startVoiceInput(){
  if(!("webkitSpeechRecognition" in window)){
    alert("Il riconoscimento vocale non è supportato da questo browser. Usa Chrome.");
    return;
  }

  if(!recognition){
    recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function(event){
      const transcript = event.results[0][0].transcript;
      document.getElementById("userInput").value = transcript;
      sendMessage();
    };

    recognition.onerror = function(){
      alert("Errore microfono. Controlla i permessi.");
    };

    recognition.onend = function(){
      isListening = false;
      const micBtn = document.getElementById("micBtn");
      if(micBtn) micBtn.innerText = "🎤 Parla";
    };
  }

  if(!isListening){
    isListening = true;
    document.getElementById("micBtn").innerText = "🛑 Ascolto...";
    recognition.start();
  }
}

async function sendMessage(){
  const input = document.getElementById("userInput");
  const chatBox = document.getElementById("chatBox");
  const text = input.value.trim();

  if(!text) return;

  chatBox.innerHTML += `
    <div class="message user">
      ${text}
    </div>
  `;

  input.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  chatBox.innerHTML += `
    <div class="message ai" id="loadingMessage">
      Sto correggendo la frase...
    </div>
  `;

  chatBox.scrollTop = chatBox.scrollHeight;

  try{
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      conversationHistory.push({
  role: "user",
  content: text
});

body: JSON.stringify({
  message: text,
  history: conversationHistory
})
    });

    const data = await response.json();

    const loadingMessage = document.getElementById("loadingMessage");
    const reply = data.reply || "Errore nella risposta AI.";

    loadingMessage.innerHTML = reply;

    speakText(reply);

  }catch(error){
    const loadingMessage = document.getElementById("loadingMessage");

    loadingMessage.innerHTML = `
      Errore di collegamento con l'AI.<br>
      Controlla il Worker Cloudflare.
    `;
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("service-worker.js");
  });
}

window.speechSynthesis.onvoiceschanged = () => {
  speechSynthesis.getVoices();
};
