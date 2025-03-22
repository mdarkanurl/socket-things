import express from 'express';
import { Server } from 'socket.io';
const PORT = process.env.PORT || 3000;
import path from 'path';
import { fileURLToPath } from 'url';
import { time } from 'console';
import { get } from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const ADMIN = 'Admin';

app.use(express.static(path.join(__dirname, 'public')));

const expressServer = app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
})

// state
const userState = {
    users: [],
    setUsers: function (newUserArray) {
        this.users = newUserArray
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5500', 'http://127.0.0.1:5500']
    }
})

io.on('connection', socket => {
    // Only connected user get
    socket.emit('message', buildMsg(ADMIN, 'Welcome to chat app'));

    socket.on('enterRoom', ({ name, room }) => {
        // leave previous room
        const prevRoom = getUser(socket.id)?.room

        if(prevRoom) {
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`))
        }

        const user = activateUser(socket.id, name, room);

        if(prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom)
            })
        }

        socket.join(user.room)

        socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));

        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined ${user.room}`));

        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room)
        });

        io.emit('roomsList', {
            rooms: getAllActiveRooms()
        })
    })

    // When user disconnects
    socket.on('disconnect', () => {
        const user = getUser(socket.id)
        userLeaverApp(socket.id);
        
        if(user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));

            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room)
            })

            io.emit('roomList', {
                rooms: getAllActiveRooms()
            })
        }
    });

    // Listing for a message event
    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room
        if(room) {
            io.to(room).emit('message', buildMsg(name, text))
        }
    });

    // Listing for activity
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room
        if(room) {
            socket.broadcast.to(room).emit('activity', name)
        }
    })
});

function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

function activateUser(id, name, room) {
    const user = { id, name, room }
    userState.setUsers([
        ...userState.users.filter(user => user.id !== id),
        user
    ])

    return user
}

function userLeaverApp(id) {
    userState.setUsers(
        userState.users.filter(user => user.id !== id)
    )
}

function getUser(id) {
    return userState.users.find(user => user.id === id)
}

function getUsersInRoom(room) {
    return userState.users.filter(user => user.room === room);
}

function getAllActiveRooms() {
    return Array.from(new Set(userState.users.map(user => user.room)));
}