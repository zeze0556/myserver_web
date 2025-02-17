import React, {forwardRef,useState, useEffect, useRef, useContext } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon} from 'xterm-addon-attach';
import 'xterm/css/xterm.css';
import RixWindow from "../rix/RixWindow";
import RixButton from "../rix/RixButton";
import cmd from "../utils/command";
import {useData, rix_make_watch_data} from "../store/global_data.js";

const Install=(props)=> {
    const terminal = useRef(null);
    const shell_ref = useRef(null);
    let [container_up_message, set_container_up_message] = useState("");
    useEffect(()=> {
        terminal.current = new Terminal({
            //rendererType: 'canvas',
            rows: 40,
            convertEol: true,
            scrollback: 10,
            disableStdin: false,
            cursorStyle: 'underline',
            cursorBlink: true
        });
        const fitAddon = new FitAddon();
        terminal.current.loadAddon(fitAddon);
        terminal.current.onResize((size) => {
            // 调整 xterm 和 WebSocket 的窗口大小
            fitAddon.fit();
        });
        terminal.current.open(shell_ref.current);
        cmd.long_cmd(props.data, {
            stdout:(out)=> {
                if(terminal.current)
                    terminal.current.write(out);
            },
            stderr:(err)=> {
            },
            onerr:(err)=> {
            },
            onend:()=> {
                if(props.onEnd)
                    props.onEnd();
            }
        });
    });
    return (<div ref={shell_ref} width="100%" height="100%">bbbbbb</div>);
};

const Shell = forwardRef((props, ref)=> {
    let mywindow = React.createRef();
    const { global_data, api } = useData();
    let state = rix_make_watch_data({
        "step": "check",
    });
    let install_check = async()=> {
        let p = {
            command: '/usr/bin/ttyd',
            args: ['-v']
        };
        let version = await api.run_command(p);
        if(version.ret == 0) {
            return {ret:0, data:version.data.stdout};
        }
        //update_state({"step": "install"});
        state.set("step", "install");
        return {ret:-2, step: "install"};
    };
    let start_ttyd = async(cur_try=1, max_try=3)=> {
        state.set("step", "connect");
        let p = {
            command: 'ls',
            args:["/var/run/ttyd.sock"]
        };
        let check_end = await api.run_command(p);
        if(check_end.ret == 0) {
            state.set("step", "openurl");
        } else {
            if(cur_try >= max_try) {
                state.set("step", "error");
            }
            cmd.long_cmd(
                {command: '/app/scripts/start_ttyd.sh',
                 args:[]
                }, {
                    stdout:(res)=> {
                    },
                    onend:()=> {
                        start_ttyd(cur_try+1);
                    }
                });
        }
    };
    let check_ttyd = async()=> {
        let install_ret = await install_check();
        if(install_ret.ret == 0) {
            await start_ttyd();
        }
    };
    let install_ttyd = ()=> {
        state.set("step", "installing");
    };
    useEffect(()=> {
        check_ttyd();
        return ()=> {
        };
    },[]);
    let CurShow = (props)=> {
        let [update, setUpdate] = useState(0);
        let step = state.step;
        useEffect(()=> {
            let f = state.watch("step", ()=>{
                setUpdate(update+1);
            });
            return ()=> {
                state.unwatch("step", f);
            };
        });
        if(step == 'install') {
            return <div className="pos-center d-flex flex-justify-center">
                <div>ttyd未安装，立刻安装？</div>
                <RixButton className="button success" onClick={install_ttyd}>安装</RixButton>
                </div>;
        }
        if(step == "installing") {
            let command = {
                "command": "wget",
                "args":["-O", "/usr/bin/ttyd", "https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64"]
            };
            return (<Install data={command} onEnd={check_ttyd}/>);
        }
        if(step == "connect") {
            return <div>connect</div>;
        }
        if(step == 'openurl') {
            let url = '/ttyd';
            return <iframe src={url} style={{
                "width": "100%",
                "height": "100%",
            }} frameborder="0" scrolling="no"></iframe>;
        }
        return <div></div>;
    };


    return (<RixWindow {...props} ref={ref}>
            <div style={{'height':'100%',
                         'overflow': 'hidden'
                        }} ref={mywindow}>
            <CurShow/>
            </div>
            </RixWindow>);

});
export default Shell;
