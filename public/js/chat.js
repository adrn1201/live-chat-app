const socket = io();

const messageForm = document.querySelector('#message-form');
const messageFormButton = document.querySelector('#submit');
const locationButton = document.querySelector('#send-location');
const messagesDiv = document.querySelector('#messages');
const sidebar = document.querySelector('#sidebar');
const roomName = document.querySelector('#room-name');
const messageInput = document.querySelector('#message');
const usersList = document.querySelector('#users-collapse');
const leaveBtn = document.querySelector('#leave-room');

const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const roomSideTemplate = document.querySelector('#room-sidebar-template').innerHTML;
const userSideTemplate = document.querySelector('#users-sidebar-template').innerHTML;

const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

let count = 0;
let typingFeedback = '';

const autoScroll = () => {
    const newMessage = messagesDiv.lastElementChild;

    const newMessageStyles = getComputedStyle(newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = newMessage.offsetHeight + newMessageMargin;

    const visibleHeight = messagesDiv.offsetHeight;
    const containerHeight = messagesDiv.scrollHeight;

    const scrollOffset = messagesDiv.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

socket.on('message', (message) => {
    let sender = ''

    if (username) {
        sender = username.toLowerCase() === message.username ? '(You)' : '';
    }

    const html = Mustache.render(messageTemplate, {
        username: `${message.username} ${sender}`,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    messagesDiv.insertAdjacentHTML('beforeend', html);
    autoScroll();
});

socket.on('locationMessage', (message) => {
    let sender = ''
    if (username) {
        sender = username.toLowerCase() === message.username ? '(You)' : '';
    }
    const html = Mustache.render(locationMessageTemplate, {
        username: `${message.username} ${sender}`,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    messagesDiv.insertAdjacentHTML('beforeend', html);
    autoScroll();
});

socket.on('roomData', ({ room, users }) => {
    const roomHtml = Mustache.render(roomSideTemplate, { room });
    roomName.innerHTML = roomHtml;
    const usersHtml = Mustache.render(userSideTemplate, { users });
    usersList.innerHTML = usersHtml;
});

messageForm.addEventListener('submit', function(e) {
    e.preventDefault();

    messageFormButton.setAttribute('disabled', '');
    message = this.elements.message;

    socket.emit('sendMessage', message.value, (error) => {
        messageFormButton.removeAttribute('disabled');
        message.value = '';
        message.focus();
        if (error) {
            return console.log(error);
        }
        console.log('Message delivered!');
    });
});

locationButton.addEventListener('click', async function() {
    if (!navigator.geolocation) {
        const err = await swal('Geolocation is not supported by your browser.');
        if (err) return;
    }

    this.setAttribute('disabled', '');

    navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        socket.emit('sendLocation', { latitude, longitude }, () => {
            this.removeAttribute('disabled');
            console.log('Location shared!');
        });
    }, (err) => {
        this.removeAttribute('disabled');
        console.warn(`ERROR(${err.code}): ${err.message}`);
    }, { enableHighAccuracy: true });
});

socket.emit('join', { username, room }, async(error) => {
    if (error) {
        const err = await swal(error);
        err ? location.href = '/' : ''
    }
});


leaveBtn.addEventListener('click', async() => {
    const choice = await swal(`Are you sure you want to leave ${room}?`, {
        buttons: ['Cancel', 'Leave'],
    });

    if (choice) {
        location.href = '/'
    }
});