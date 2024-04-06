const http = require('http');
const server = http.createServer();
const io = require('socket.io')(server);

// 방 목록
let rooms = [];

io.use((socket, next) => {
    if (socket.handshake.query.token === "UNITY") {
        next();
    } else {
        next(new Error("Authentication error"));
    }
});

io.on('connection', (socket) => {
    socket.emit('auth', null);
    console.log('New client connected: ' + socket.id);

    // 클라이언트가 방에 참가하도록 함
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log('Client ' + socket.id + ' joined room ' + roomId);
        
        // 해당 방의 클라이언트 목록 업데이트
        const room = rooms.find(room => room.id === roomId);
        if (room) {
            room.clients.push(socket);
        } else {
            rooms.push({ id: roomId, clients: [socket] });
        }

        // 방에 두 명의 클라이언트가 있으면 게임 시작
        if (room && room.clients.length === 2) {
            startGame(roomId);
            console.log('Game started in room ' + roomId);
        }
    });

    // 클라이언트로부터의 메시지 수신
    socket.on('scoreUpdate', (data) => {
        console.log('Received score update from client ' + socket.id + ': ' + data.score);
        // 이 데이터를 같은 방의 다른 클라이언트에게 브로드캐스트
        socket.broadcast.emit('scoreUpdate', data.roomId + "r" + data.score);
    });

    // 연결 종료 처리
    socket.on('disconnect', () => {
        console.log('Client disconnected: ' + socket.id);
        // 연결이 끊긴 클라이언트를 방 목록에서 제거
        rooms.forEach(room => {
            room.clients = room.clients.filter(client => client.id !== socket.id);
        });
    });
});

// 게임 시작 함수
function startGame(roomId) {
    console.log('Starting the game in room ' + roomId);
    // 해당 방의 클라이언트에게 게임 시작 메시지를 전송
    const room = rooms.find(room => room.id === roomId);
    if (room) {
        room.clients.forEach((client, index) => {
            client.emit('startGame', { playerId: index + 1 });
        });
    }
}

// 서버 시작
const PORT = 80;
server.listen(PORT, () => {
    console.log('Server listening on port ' + PORT);
});
