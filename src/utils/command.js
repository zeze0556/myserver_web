
const cmd = {
    long_cmd(command, callback = { onopen:null, stdout: null, stderr: null, onerr: null, onend: null }) {
    let location = window.location;
    let args = command;/*{
        "command": "/bin/bash",
        "args": ["-c", `cd ${config.dir} && docker compose up -d`]
    };*/
        console.log("long_cmd==", command);
    let args_s = encodeURIComponent(JSON.stringify(args));
    let socket = new WebSocket((location.protocol == "http:" ? "ws://" : "wss://") + location.host + "/api/ws/shell?args=" + args_s);
    socket.onopen = () => {
        if(callback.onopen) {
            callback.onopen(socket);
        }
        socket.onclose = () => {
            socket = null;
            if (callback.onend) {
                callback.onend();
            }
        };
        socket.onmessage = (event) => {
            console.log(event.data);
            if (callback.stdout) {
                callback.stdout(event.data);
            }
        };
    };
    socket.onerror = (err) => {
        if (callback.onerr) {
            callback.onerr(err);
        }
        socket = null;
    };

    },
};

export default cmd;
