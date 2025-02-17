// api.js
import axios from 'axios';
import React, { useState, useEffect, useRef,useContext } from 'react';
//import {init_data} from "./store/global_data.js";
// websocket.js
//import {io} from 'socket.io-client';

let socket = null;
function removeAnsiEscapeSequences(input) {
    const ansiEscape = /\x1b\[[0-9;]*[a-zA-Z]/g;
    return input.replace(ansiEscape, '');
}
const api = {
    Init: function(init_data) {
        this.global_data = init_data;//useContext(DataContext);
        if(socket) return;
        let location = window.location;
        let args = {
            "command": "iostat",
            "args": ["-k", "1", "-h"]
        };
        let args_s = encodeURIComponent(JSON.stringify(args));
        socket = new WebSocket((location.protocol=="http:"?"ws://":"wss://")+location.host+"/api/ws/shell?args="+args_s);
        socket.onopen = ()=> {
            console.log("connected!!!!");
        };
        let buffer = "";
        let line = [];
        let flag = 0;
        socket.onmessage = (event)=> {
            if (event.data instanceof Blob) {
                let reader = new FileReader();
                reader.onload = () => {
                    buffer += removeAnsiEscapeSequences(reader.result);
                };
                reader.readAsText(event.data);
            } else {
                let j_data = JSON.parse(event.data);
                if(j_data.op == 'out') {
                    buffer += removeAnsiEscapeSequences(j_data.stdout);
                }
            }
            let last = buffer.lastIndexOf('\r\n\r\n\r\n');
            if(last > 0) {
                line = line.concat(buffer.substring(0, last).split('\r\n\r\n\r\n'));
                buffer = buffer.substring(last+6);
                if(!buffer) buffer = "";
            }
            let index = 0;
            while(line.length > 0) {
                    let data = line.shift();
                    if(!data) break;
                    if(!data.startsWith('avg-cpu')) break;
                    let pd = data.split('\r\n');
                    let cpu = [pd[0], pd[1]];
                    let blocks = [];
                    for(let i = 3; i < pd.length; i++) {
                        blocks.push(pd[i]);
                    }
                    if(blocks.length > 1) {
                        // 提取表头字段名
                        const headers = blocks[0].split(/\s+/);
                        // 构建JSON对象数组
                        //Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
                        const jsonData = [];
                        for (let i = 1; i < blocks.length; i++) {
                            const values = blocks[i].split(/\s+/);
                            const obj = {};
                            for (let j = 0; j < headers.length; j++) {
                                obj[headers[j]] = values[j];
                            }
                            jsonData.push(obj);
                        }
                        this.global_data.set('sysstat', jsonData);
                    }

            }
            line = [];
        };
        socket.onclose= (ev)=> {
            console.log("close====");
            socket = null;
            setTimeout(()=> {
                this.Init(init_data);
            }, 5000);
        };
    },
    proc_command(cmd) {
        if(socket) {
            socket.send(JSON.stringify(cmd));
        }
    },
    async run_command(req) {
        //console.log("req===", req);
        const response = await axios.post('/api/command/run', req);
        let {data} = response;
        if(data&&data.ret == 0) {
            if(data.key && data.key != "") {
                this.global_data.set(data.key, data.data);
            }
        }
        return data;
    },
    async disk_info(filter){
        let req = {
            'command': 'lsblk',
            'args':['--json', '-O']
        };
        const res = await axios.post('/api/command/run', req);
        let {data} = res;
        if(data.ret == 0) {
            let stdout = JSON.parse(data.data.stdout);
            this.global_data.set('blockdevices', stdout.blockdevices);
        }
        return data;
    },
    async download_file(data) {
        return axios({
            method: 'POST',
            url: `/api/file/get`,
            data: data,
            responseType: 'blob', // 指定响应类型为 blob
            headers: {
                'Accept': 'application/octet-stream'
            }
        });

    },
    async config_file(data) {
        switch(data.op) {
        case 'get': {
            const response = await axios.post(`/api/file/get`, {
                filename: `${data.filename}`,
            },{
                'Accept': 'application/json'
            });
            return response.data;
        }
            break;
        case 'put': {
            const response = await axios.put(`/api/file/put`, {
                filename: `${data.filename}`,
                data: data.data
            });
            return response.data;
        }
            break;
        }
        return {ret:-2};
    },
    getParameters: async (filter) => {
        const response = await axios.post('/api/parameters', {
            op: 'get',
            data: filter,
        });
        return response.data;
    },

    addParameter: async (parameter) => {
        const response = await axios.post('/api/parameters', {
            op: 'modify',
            data: parameter,
        });
        return response.data;
    },

    updateParameter: async (parameter) => {
        const response = await axios.post('/api/parameters', {
            op: 'modify',
            data: parameter,
        });
        return response.data;
    },

    deleteParameter: async (data1) => {
        const response = await axios.post('/api/parameters', {
            op: 'delete',
            data: data1.data,
        });
        return response.data;
    },
};
//api.Init();

export default api;
