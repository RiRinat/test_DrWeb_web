// Инициализация звукового эффекта для кликов
const clickSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-click-melodic-tone-1129.mp3');

// История введенных команд и индексы для навигации
const commandHistory = [];  // Массив для хранения истории команд
let historyIndex = -1;      // Текущий индекс в истории команд (для навигации стрелками)
let suggestionIndex = -1;   // Текущий индекс в подсказках (для навигации стрелками)

// Список поддерживаемых команд для автодополнения
const commandList = ['SET', 'GET', 'UNSET', 'COUNTS', 'FIND', 'BEGIN', 'ROLLBACK', 'COMMIT', 'END'];

/**
 * Отправка команды на сервер и обработка ответа
 */
async function sendCommand() {
    const inputField = document.getElementById('commandInput');
    const command = inputField.value.trim();
    
    // Если команда пустая - ничего не делаем
    if (!command) return;

    // Скрываем подсказки при отправке команды
    hideSuggestions();

    const terminal = document.getElementById('terminal');

    // Создаем элемент для отображения введенной команды
    const commandElement = document.createElement('div');
    commandElement.classList.add('command');
    commandElement.textContent = `> ${command}`;
    terminal.appendChild(commandElement);

    // Добавляем команду в историю и обновляем индекс
    commandHistory.push(command);
    historyIndex = commandHistory.length;

    // Отправляем команду на сервер
    const response = await fetch('/command/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()  // Защита от CSRF
        },
        body: JSON.stringify({ command: command })
    });

    // Получаем и обрабатываем ответ от сервера
    const data = await response.json();

    if (data.output) {
        // Выводим каждую строку ответа
        data.output.forEach(line => {
            const responseElement = document.createElement('div');
            responseElement.classList.add('response');
            responseElement.textContent = line;
            terminal.appendChild(responseElement);
        });
    } else if (data.error) {
        // Выводим ошибку красным цветом
        const errorElement = document.createElement('div');
        errorElement.classList.add('response');
        errorElement.style.color = 'red';
        errorElement.textContent = `Error: ${data.error}`;
        terminal.appendChild(errorElement);
    }

    // Прокручиваем терминал вниз
    terminal.scrollTop = terminal.scrollHeight;

    // Очищаем поле ввода
    inputField.value = '';
}

/**
 * Получение CSRF токена из cookies
 */
function getCSRFToken() {
    let cookieValue = null;
    const name = 'csrftoken';
    if (document.cookie && document.cookie !== '') {
        // Разбиваем cookies на массив
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Ищем нужный токен
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Обработчик ввода в поле команды (для автодополнения)
document.getElementById('commandInput').addEventListener('input', function(event) {
    const inputField = this;
    const text = inputField.value.trim().toUpperCase();

    // Если поле пустое - скрываем подсказки
    if (!text) {
        hideSuggestions();
        return;
    }

    // Фильтруем команды по введенному тексту
    const matches = commandList.filter(cmd => cmd.startsWith(text));
    showSuggestions(matches);
});

// Обработчик нажатия клавиш в поле ввода
document.getElementById('commandInput').addEventListener('keydown', function(event) {
    const inputField = this;
    const suggestions = document.querySelectorAll('.suggestion-item');

    // Обработка нажатия Enter
    if (event.key === 'Enter') {
        // Если есть подсказки и выбрана одна из них
        if (suggestions.length && suggestionIndex !== -1) {
            inputField.value = suggestions[suggestionIndex].textContent;
        }
        sendCommand();
        event.preventDefault();
    } 
    // Обработка стрелки вверх
    else if (event.key === 'ArrowUp') {
        // Навигация по подсказкам
        if (suggestions.length > 0) {
            if (suggestionIndex > 0) {
                suggestionIndex--;
            } else {
                suggestionIndex = suggestions.length - 1;
            }
            updateSuggestionHighlight();
        } 
        // Навигация по истории команд
        else if (commandHistory.length > 0) {
            if (historyIndex > 0) {
                historyIndex--;
                inputField.value = commandHistory[historyIndex];
            }
        }
        event.preventDefault();
    } 
    // Обработка стрелки вниз
    else if (event.key === 'ArrowDown') {
        // Навигация по подсказкам
        if (suggestions.length > 0) {
            if (suggestionIndex < suggestions.length - 1) {
                suggestionIndex++;
            } else {
                suggestionIndex = 0;
            }
            updateSuggestionHighlight();
        } 
        // Навигация по истории команд
        else if (commandHistory.length > 0) {
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

/**
 * Показ подсказок команд
 * @param {Array} matches - массив подходящих команд
 */
function showSuggestions(matches) {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';  // Очищаем предыдущие подсказки

    // Если нет совпадений - скрываем подсказки
    if (matches.length === 0) {
        hideSuggestions();
        return;
    }

    // Создаем элементы подсказок
    matches.forEach(match => {
        const item = document.createElement('div');
        item.classList.add('suggestion-item');
        item.textContent = match;
        // Обработчик клика по подсказке
        item.onclick = () => {
            document.getElementById('commandInput').value = match + ' ';
            hideSuggestions();
            playClickSound();
            document.getElementById('commandInput').focus();
        };
        suggestionsDiv.appendChild(item);
    });

    // Сбрасываем индекс подсказки и показываем контейнер
    suggestionIndex = -1;
    suggestionsDiv.classList.add('show');
}

/**
 * Скрытие блока с подсказками
 */
function hideSuggestions() {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.remove('show');
    suggestionIndex = -1;
}

/**
 * Обновление подсветки активной подсказки
 */
function updateSuggestionHighlight() {
    const suggestions = document.querySelectorAll('.suggestion-item');
    suggestions.forEach((item, index) => {
        // Добавляем/удаляем класс active в зависимости от индекса
        item.classList.toggle('active', index === suggestionIndex);
    });
}

/**
 * Воспроизведение звука клика
 */
function playClickSound() {
    clickSound.currentTime = 0;  // Перематываем звук на начало
    clickSound.play();
}