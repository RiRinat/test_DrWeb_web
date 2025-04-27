const clickSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-click-melodic-tone-1129.mp3');

const commandHistory = [];
let historyIndex = -1;
let suggestionIndex = -1;

const commandList = ['SET', 'GET', 'UNSET', 'COUNTS', 'FIND', 'BEGIN', 'ROLLBACK', 'COMMIT', 'END'];

async function sendCommand() {
    const inputField = document.getElementById('commandInput');
    const command = inputField.value.trim();
    if (!command) return;

    hideSuggestions();

    const terminal = document.getElementById('terminal');

    const commandElement = document.createElement('div');
    commandElement.classList.add('command');
    commandElement.textContent = `> ${command}`;
    terminal.appendChild(commandElement);

    commandHistory.push(command);
    historyIndex = commandHistory.length;

    const response = await fetch('/command/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ command: command })
    });

    const data = await response.json();

    if (data.output) {
        data.output.forEach(line => {
            const responseElement = document.createElement('div');
            responseElement.classList.add('response');
            responseElement.textContent = line;
            terminal.appendChild(responseElement);
        });
    } else if (data.error) {
        const errorElement = document.createElement('div');
        errorElement.classList.add('response');
        errorElement.style.color = 'red';
        errorElement.textContent = `Error: ${data.error}`;
        terminal.appendChild(errorElement);
    }

    terminal.scrollTop = terminal.scrollHeight;

    inputField.value = '';
}

function getCSRFToken() {
    let cookieValue = null;
    const name = 'csrftoken';
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

document.getElementById('commandInput').addEventListener('input', function(event) {
    const inputField = this;
    const text = inputField.value.trim().toUpperCase();

    if (!text) {
        hideSuggestions();
        return;
    }

    const matches = commandList.filter(cmd => cmd.startsWith(text));
    showSuggestions(matches);
});

document.getElementById('commandInput').addEventListener('keydown', function(event) {
    const inputField = this;
    const suggestions = document.querySelectorAll('.suggestion-item');

    if (event.key === 'Enter') {
        if (suggestions.length && suggestionIndex !== -1) {
            inputField.value = suggestions[suggestionIndex].textContent;
        }
        sendCommand();
        event.preventDefault();
    } else if (event.key === 'ArrowUp') {
        if (suggestions.length > 0) {
            if (suggestionIndex > 0) {
                suggestionIndex--;
            } else {
                suggestionIndex = suggestions.length - 1;
            }
            updateSuggestionHighlight();
        } else if (commandHistory.length > 0) {
            if (historyIndex > 0) {
                historyIndex--;
                inputField.value = commandHistory[historyIndex];
            }
        }
        event.preventDefault();
    } else if (event.key === 'ArrowDown') {
        if (suggestions.length > 0) {
            if (suggestionIndex < suggestions.length - 1) {
                suggestionIndex++;
            } else {
                suggestionIndex = 0;
            }
            updateSuggestionHighlight();
        } else if (commandHistory.length > 0) {
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                inputField.value = commandHistory[historyIndex];
            } else {
                inputField.value = '';
            }
        }
        event.preventDefault();
    }
});

function showSuggestions(matches) {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';

    if (matches.length === 0) {
        hideSuggestions();
        return;
    }

    matches.forEach(match => {
        const item = document.createElement('div');
        item.classList.add('suggestion-item');
        item.textContent = match;
        item.onclick = () => {
            document.getElementById('commandInput').value = match + ' ';
            hideSuggestions();
            playClickSound();
            document.getElementById('commandInput').focus();
        };
        suggestionsDiv.appendChild(item);
    });

    suggestionIndex = -1;
    suggestionsDiv.classList.add('show');
}

function hideSuggestions() {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.remove('show');
    suggestionIndex = -1;
}

function updateSuggestionHighlight() {
    const suggestions = document.querySelectorAll('.suggestion-item');
    suggestions.forEach((item, index) => {
        item.classList.toggle('active', index === suggestionIndex);
    });
}

function playClickSound() {
    clickSound.currentTime = 0;
    clickSound.play();
}

