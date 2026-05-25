const WORKER_URL =
"https://english-ai-worker.vocidicassino.workers.dev/";

let conversationHistory = [];
let recognition;
let continuousMode = false;
let messageCounter = 0;

let xp =
Number(localStorage.getItem("xp")) || 0;

window.addEventListener("load", () => {
  updateXP();
});

function showPage(pageId){
  document.querySelectorAll(".page")
    .forEach(page=>{
      page.classList.remove("active");
    });

  document.getElementById(pageId)
    .classList.add("active");
}

function addXP(value){
  xp += value;
  localStorage.setItem("xp", xp);
  updateXP();
}

function updateXP(){
  const xpValue = document.getElementById("xpValue");
  const levelValue = document.getElementById("levelValue");

  if(!xpValue || !levelValue) return;

  xpValue.innerText = xp;

  let level = "Beginner";

  if(xp >= 100){
    level = "Intermediate";
  }

  if(xp >= 300){
    level = "Advanced";
  }

  levelValue.innerText = level;
}

function cleanForSpeech(text){
  return String(text)
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
}

function speakEnglish(text){
  const avatar = document.getElementById("avatar");
  if(avatar) avatar.classList.add("talking");

  const speech =
    new SpeechSynthesisUtterance(cleanForSpeech(text));

  speech.lang = "en-US";
  speech.rate = 0.85;
  speech.pitch = 1;
  speech.volume = 1;

  speech.onend = ()=>{
    if(avatar) avatar.classList.remove("talking");
  };

  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
}

function speakText(text){

  const avatar =
    document.getElementById("avatar");

  const wasContinuous =
    continuousMode;

  if(wasContinuous && recognition){
    recognition.stop();
  }

  if(avatar){
    avatar.classList.add("talking");
  }

  const speech =
    new SpeechSynthesisUtterance(
      cleanForSpeech(text)
    );

  speech.lang = "it-IT";
  speech.rate = 0.92;
  speech.pitch = 1;
  speech.volume = 1;

  const voices =
    speechSynthesis.getVoices();

  const preferredVoice =
    voices.find(v =>
      v.lang.includes("it") &&
      v.name.includes("Google")
    )
    ||
    voices.find(v =>
      v.lang.includes("it") &&
      (
        v.name.includes("Natural") ||
        v.name.includes("Enhanced")
      )
    )
    ||
    voices.find(v =>
      v.lang.includes("it")
    );

  if(preferredVoice){
    speech.voice = preferredVoice;
  }

  speech.onend = ()=>{

    if(avatar){
      avatar.classList.remove("talking");
    }

    if(wasContinuous && continuousMode && recognition){
      setTimeout(()=>{
        recognition.start();
      }, 800);
    }
  };

  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
}

async function sendMessage(textFromVoice = null){
  const input =
    document.getElementById("userInput");

  const chatBox =
    document.getElementById("chatBox");

  const levelSelect =
    document.getElementById("levelSelect");

  const text =
    textFromVoice || input.value.trim();

  if(!text) return;

  messageCounter++;
  const loadingId = "loading_" + messageCounter;

  chatBox.innerHTML += `
    <div class="message user">
      ${text}
    </div>
  `;

  if(input) input.value = "";

  chatBox.innerHTML += `
    <div class="message ai typing"
         id="${loadingId}">
      🤖 AI is thinking...
    </div>
  `;

  chatBox.scrollTop =
    chatBox.scrollHeight;

  try{
    const response =
      await fetch(WORKER_URL, {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          message:text,
          history:conversationHistory,
          level: levelSelect ? levelSelect.value : "A1"
        })
      });

    const data =
      await response.json();

    const reply =
      data.reply ||
      "Errore AI.";

    const loadingElement =
      document.getElementById(loadingId);

    if(loadingElement){
      loadingElement.outerHTML = `
        <div class="message ai">
          ${reply}
        </div>
      `;
    }

    conversationHistory.push({
      role:"user",
      content:text
    });

    conversationHistory.push({
      role:"assistant",
      content:reply
    });

    if(conversationHistory.length > 12){
      conversationHistory =
        conversationHistory.slice(-12);
    }

    speakText(reply);

    addXP(10);

  }catch(error){
    const loadingElement =
      document.getElementById(loadingId);

    if(loadingElement){
      loadingElement.outerHTML = `
        <div class="message ai">
          Errore collegamento AI.
        </div>
      `;
    }
  }

  chatBox.scrollTop =
    chatBox.scrollHeight;
}

async function generateQuiz(){
  const quizContainer =
    document.getElementById("quizContainer");

  const levelSelect =
    document.getElementById("levelSelect");

  quizContainer.innerHTML =
    "🤖 Generazione quiz...";

  try{
    const response = await fetch(WORKER_URL, {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        message:
`Crea UN solo quiz di inglese.
Rispondi SOLO in JSON valido, senza markdown.

Formato obbligatorio:
{
  "question": "domanda",
  "answers": ["risposta 1", "risposta 2", "risposta 3"],
  "correct": "risposta corretta",
  "explanation": "spiegazione breve in italiano"
}

Non mostrare la soluzione nella domanda.`,
        history:[],
        level: levelSelect ? levelSelect.value : "A1"
      })
    });

    const data = await response.json();

    let cleanReply = String(data.reply || "")
      .replace(/```json/g, "")
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();

    let quiz;

    try{
      quiz = JSON.parse(cleanReply);
    }catch(e){
      quizContainer.innerHTML =
        "Errore nel formato del quiz. Premi di nuovo Genera Quiz.";
      return;
    }

    quizContainer.innerHTML = `
      <h3>Domanda:</h3>
      <p>${quiz.question}</p>

      <div class="quiz-options">
        ${quiz.answers.map((answer, index) => `
          <button onclick="checkQuizAnswer(${index})">
            ${answer}
          </button>
        `).join("")}
      </div>

      <div id="quizResult"></div>
    `;

    window.currentQuiz = quiz;

  }catch(error){
    quizContainer.innerHTML =
      "Errore quiz.";
  }
}

function checkQuizAnswer(index){
  const quiz = window.currentQuiz;
  const result =
    document.getElementById("quizResult");

  if(!quiz || !result) return;

  const answer = quiz.answers[index];
  const correct = quiz.correct;
  const explanation = quiz.explanation;

  if(answer === correct){
    result.innerHTML = `
      <div class="quiz-correct">
        ✅ Risposta corretta!<br><br>
        🔊 Pronuncia corretta:
        <strong>${correct}</strong>
      </div>
    `;

    addXP(20);
    speakEnglish(correct);

  }else{
    result.innerHTML = `
      <div class="quiz-wrong">
        ❌ Risposta errata.<br><br>
        <strong>Risposta corretta:</strong> ${correct}<br><br>
        <strong>Spiegazione:</strong> ${explanation}<br><br>
        🔊 Ora ascolta la pronuncia corretta:
        <strong>${correct}</strong>
      </div>
    `;

    speakText(
      "Risposta errata. " +
      explanation +
      ". Ora ascolta la risposta corretta."
    );

    setTimeout(()=>{
      speakEnglish(correct);
    }, 3000);
  }
}

function toggleContinuousConversation(){
  if(!("webkitSpeechRecognition" in window)){
    alert("Usa Chrome");
    return;
  }

  if(!recognition){
    recognition =
      new webkitSpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult =
      function(event){
        const transcript =
          event.results[
            event.results.length -1
          ][0].transcript;

        sendMessage(transcript);
      };

    recognition.onend =
      function(){
        if(continuousMode){
          recognition.start();
        }
      };
  }

  continuousMode =
    !continuousMode;

  const micBtn =
    document.getElementById("micBtn");

  if(continuousMode){
    if(micBtn) micBtn.innerText =
      "🛑 Stop Live";

    recognition.start();

  }else{
    if(micBtn) micBtn.innerText =
      "🎤 Conversazione Live";

    recognition.stop();
  }
}

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator
      .serviceWorker
      .register("service-worker.js");
  });
}

window.speechSynthesis.onvoiceschanged = () => {
  speechSynthesis.getVoices();
};
