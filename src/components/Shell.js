import React, { useState, useEffect, useRef,useContext } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon} from 'xterm-addon-attach';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { styled } from '@mui/system';
import { 
         Container,
         Box,
       } from '@mui/material';
import CommonWindow from './CommonWindow';

import {
    DesktopWindows, Settings, Notifications,
    Close, Restore,
    Menu,
    Home,
    ChevronLeft,
    Maximize, Minimize
} from '@mui/icons-material';

let socket = null;
export default function Shell(props) {
    const shell_ref = useRef(null);
    const websocket = useRef(null);
    const terminal = useRef(null);
    const { onActive, onClose, onRestore, onMaximize, onMinimize } = props;
    useEffect(()=> {
        console.log("api.init=====", window.location.host);
        terminal.current = new Terminal({
            rendererType: 'canvas',
            //rows: 40,
            convertEol: true,
            scrollback: 10,
            disableStdin: false,
            cursorStyle: 'underline',
            cursorBlink: true
        });
        terminal.prompt = ()=> {
            terminal.write('\r\n#');
        };
        const fitAddon = new FitAddon();
        terminal.current.loadAddon(fitAddon);
        fitAddon.fit();
        let location = window.location;
        websocket.current = new WebSocket((location.protocol=="http:"?"ws://":"wss://")+location.host+"/api/ws/shell");
        // 在连接建立后，将 WebSocket 流导入到 xterm 终端中
        websocket.current.onopen = () => {
            terminal.current.open(shell_ref.current);
            terminal.current.focus();
            terminal.current.onData((data) => {
                    websocket.current.send(data);
            });
            terminal.current.onResize((size) => {
                console.log("size===", size);
                // 调整 xterm 和 WebSocket 的窗口大小
                websocket.current.send(JSON.stringify({ resize: size }));
            });

            // 接收从服务器发送的数据并输出到 xterm 终端
            websocket.current.onmessage = (event) => {
                terminal.current.write(event.data);
            };

            // 处理关闭连接
            websocket.current.onclose = (event) => {
                terminal.current.writeln('WebSocket连接已关闭');
                onClose(event);
                // 可以在此处添加重连逻辑
            };
            //websocket.current.send("echo $PS1\n");
        };

        // 处理错误
        websocket.current.onerror = (error) => {
            terminal.current.writeln('WebSocket连接出错: ' + error);
        };

        // 清理资源
        return () => {
            if (websocket.current) {
                websocket.current.close();
            }
            if (terminal.current) {
                terminal.current.dispose();
            }
        };
    },[]);
    return <><CommonWindow title="终端" {...props}>
        <Container>
               <Box ref={shell_ref} width="100vw" height="100vh"
                    p={2}
               />
    </Container>
             </CommonWindow>
           </>;
}
