import React, {forwardRef,useState, useEffect, useRef, useContext } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon} from 'xterm-addon-attach';
import 'xterm/css/xterm.css';
import {useWindowManager} from "../rix/RixWindowManager";
import RixWindow from "../rix/RixWindow";
import RixButton from "../rix/RixButton";
import cmd from "../utils/command";
import qemu from "../utils/qemu";
import {useData, rix_make_watch_data} from "../store/global_data.js";

const VirtualMachine = forwardRef((props, ref)=> {
    let mywindow = React.createRef();
    let {windows, getApps, openWindow, set_window_ref, openDialog, closeDialog}= useWindowManager();
    const { global_data, api } = useData();
    let state = rix_make_watch_data({
        "step": global_data.get('vm_service','check',()=>{
            qemu.check_virt_manager();
        }),
        "networks": []
    });
    let check= async()=> {
        await qemu.check_virt_manager();
        let install_virt_manager = false;
        let run_virt_manager=false;
        let ret = await api.run_command({
            command: "/bin/bash",
            args: ["./scripts/get_ip.sh"]
        });
        if(ret.ret == 0) {
            let data = [];
            ret.data.stdout.split("\n").forEach(v=> {
                try {
                    console.log("v===", v);
                    data.push(JSON.parse(v));
                } catch(e) {
                }
            });
            //let data = JSON.parse(ret.data.stdout);
            let networks = data.map(v=>{
                v.ipv4 = v.ipv4.split(`\n`);
                v.ipv6 = v.ipv6.split(`\n`);
                return v;
            });
            state.set("networks", networks);
            if(global_data.vm_service == 'run') {
                state.set('step', 'connect');
            }
        }
    };
    useEffect(()=> {
        check();
        let w = global_data.watch('vm_service', ()=> {
            console.log("vm_service update===", global_data);
            if(global_data.vm_service != 'run') {
                state.set('step', global_data.vm_service);
            } else {
                if(state.networks.length > 0) {
                    state.set('step', 'connect');
                }
            }
        });
        return ()=> {
            global_data.unwatch('vm_service');
        };
    });

    let CurShow = ()=> {
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
        let install = ()=> {
            let id = 'dialog_'+Date.now();
            openDialog({
                id,
                content: <qemu.InstallVM_Manager id={id}/>
            });
        };
        let start = ()=> {
            let id = 'dialog_'+Date.now();
            openDialog({
                id,
                content: <qemu.StartVM_Manager id={id}/>
            });
        };
        switch(step) {
        case 'not_installed':
            return <div>未安装管理器，立刻安装?
                <RixButton className="button success" onClick={install}>安装</RixButton>
                </div>;
        case 'stop':
            return <div>管理器未运行，立刻启动
                <RixButton className="button success" onClick={start}>启动</RixButton>
            </div>;
        case 'connect': {
            let url = `http://${state.networks[0].ipv4[0]}:8185`;
            return <iframe src={url} style={{
                "width": "100%",
                "height": "100%",
            }} frameborder="0" scrolling="no"></iframe>;
        }
        default:
            return <div>{step}</div>;
        }
    };
    return (<RixWindow {...props} ref={ref}>
            <div style={{'height':'100%',
                         'overflow': 'hidden'
                        }} ref={mywindow}>
            <CurShow/>
            </div>
            </RixWindow>);

});

export default VirtualMachine;
