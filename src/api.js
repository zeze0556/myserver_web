// api.js
import axios from 'axios';
import React, { useState, useEffect, useRef,useContext } from 'react';
//import {init_data} from "./store/global_data.js";
// websocket.js
//import {io} from 'socket.io-client';

let socket = null;

const api = {
    Init: function(init_data) {
        this.global_data = init_data;//useContext(DataContext);
        if(socket) return;
        let location = window.location;
        socket = new WebSocket((location.protocol=="http:"?"ws://":"wss://")+location.host+"/api/ws/sys_stat");
        socket.onopen = ()=> {
            console.log("connected!!!!");
        };
        socket.onmessage = (evt)=> {
            let {data} = evt;
            if(data) {
                try {
                    let data_j = JSON.parse(data);
                    switch(data_j.type) {
                    case 'command': {
                        console.log("command==", data_j);
                    }
                        break;
                    default: {
                        for(let i in data_j) {
                            this.global_data.set(i, data_j[i]);
                        }
                    }
                        break;
                    }
                } catch {
                    //console.log("data==", data);
                    let pd = data.split('\n');
                    let cpu = [pd[0], pd[1]];
                    let blocks = [];
                    for(let i = 3; i < pd.length -3; i++) {
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
            }
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
        const response = await axios.post('/api/disk/info', {
            op: 'post',
            data: filter,
        });
        let {data} = response;
        if(data&&data.ret == 0) {
            this.global_data.set('blockdevices', data.disk.blockdevices);
        }
        return data;
    },
    async config_file(data) {
        switch(data.op) {
        case 'get': {
            const response = await axios.post(`/api/file/get`, {
                filename: `${data.filename}`
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
