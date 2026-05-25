function showPage(pageId){

  document
    .querySelectorAll('.page')
    .forEach(page=>{
      page.classList.remove('active');
    });

  document
    .getElementById(pageId)
    .classList.add('active');
}

function speakText(text){

  const speech = new SpeechSynthesisUtterance(text);

  speech.lang = 'en-US';

  speech.rate = 0.9;

  speech.pitch = 1;

  speechSynthesis.speak(speech);
}

async function sendMessage(){

  const input = document.getElementById('userInput');

  const chatBox = document.getElementById('chatBox');

  const text = input.value.trim();

  if(!text) return;

  // messaggio utente

  chatBox.innerHTML += `
    <div class="message user">
      ${text}
    </div>
  `;

  input.value = '';

  chatBox.scrollTop = chatBox.scrollHeight;

  // simulazione AI

  setTimeout(()=>{

    let response = '';

    if(text.toLowerCase().includes('hello')){

      response = `
        Great! 👏<br><br>
        "Hello" significa "Ciao".<br><br>
        Prova anche a scrivere:<br>
        "How are you?"
      `;

    }else if(text.toLowerCase().includes('how are you')){

      response = `
        Ottimo 👍<br><br>
        "How are you?" significa:<br>
        "Come stai?"
      `;

    }else{

      response = `
        Very good 👏<br><br>
        La tua frase è comprensibile.<br><br>
        Continua ad allenarti!
      `;
    }

    chatBox.innerHTML += `
      <div class="message ai">
        ${response}
      </div>
    `;

    chatBox.scrollTop = chatBox.scrollHeight;

  },1000);
}

// installazione PWA

if('serviceWorker' in navigator){

  window.addEventListener('load', ()=>{

    navigator.serviceWorker
      .register('service-worker.js')

      .then(()=>{

        console.log('Service Worker registrato');

      })

      .catch(error=>{

        console.log(error);

      });

  });
}
