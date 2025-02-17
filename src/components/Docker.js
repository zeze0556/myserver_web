import React, {forwardRef,useState, useEffect, useRef, useContext } from 'react';
import RixWindow from "../rix/RixWindow";
import RixShortList from "../rix/RixShortList";
import RixSidebar from "../rix/RixAside";
import RixButton from "../rix/RixButton";
import RixDialog from "../rix/RixDialog";
import {useWindowManager} from "../rix/RixWindowManager";
import Config_Schema from "./config_schema.js";
import Docker from "../utils/docker";
import {useData, DataContext, rix_make_watch_data} from "../store/global_data.js";
import JsonEditorForm from './JsonEditorForm';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import CommonWindow from './CommonWindow';
import cmd from "../utils/command.js";

const {Metro, $} = window;

const view_config = {
    'init'(props) {
        return <div>init</div>;
    },
    'running'(props) {
        return <Docker.RunningView {...props} />;
    },
    'manager'(props) {
        return <Docker.ManagerView {...props} />;
    }
};

const DockerView = forwardRef((props, ref)=> {
    let toggle_ref = React.createRef();
    let shift_ref = React.createRef();
    const { global_data, api } = useData();
    let state = rix_make_watch_data({
        curshow: global_data.docker_service == 'running'?'running':"init",
        docker_service: "stop",
    });
    let toggle = (link)=> {
        state.set("curshow", link);
    };
    console.log("docker global_data==", global_data, state);
    useEffect(()=> {
        console.log("DockerView =====init");
        Docker.info();
    });
    let CurShow = (props)=> {
        let [update, setUpdate] = useState(0);
        useEffect(()=> {
            let f = state.watch("curshow", ()=>{
                console.log("curshow change");
                setUpdate(update+1);
            });
            return ()=> {
                state.unwatch("curshow", f);
            };
        });
        let Rend = view_config[state.curshow];
        return <Rend {...props}/>;
    };
    let Init = ()=> {
        let [update, setUpdate] = useState(0);
        useEffect(()=> {
            let w = global_data.watch("docker_service", (v)=> {
                console.log("docker_service===", v, state);
                if(v != state.docker_service) {
                    state.set("docker_service", v);
                    if(v == 'running' && state.curshow == 'init') {
                        state.set("curshow", "running");
                    }
                    if( v == 'stop' && state.curshow != 'init') {
                        state.set("curshow", "init");
                    }
                    setUpdate(update+1);
                }
            });
            return ()=> {
                global_data.unwatch("docker_service", w);
            };
        });
        if(global_data.docker_service == 'running')
            return <></>;
        return <li><a data-menu="init"><span className="mif-books icon"></span>启动</a></li>;
    };

    return (<RixWindow {...props} ref={ref}>
            <RixSidebar onClick={toggle}
            toggle_ref={toggle_ref}
            shift_ref={shift_ref}
            >
            <div className="sidebar-header" slot="header">
            <span className="title fg-white">docker</span>
            <span className="subtitle fg-white"> 容器管理</span>
            </div>
            <Init/>
            <li><a data-menu="running"><span className="mif-books icon"></span>运行中</a></li>
            <li><a data-menu="manager"><span className="mif-books icon"></span>管理</a></li>
            <li className="divider"></li>
            </RixSidebar>
            <div className="shifted-content h-100 p-ab" ref={shift_ref}>
            <div className="app-bar pos-absolute bg-red z-1" data-role="appbar">
            <button className="app-bar-item c-pointer" id="sidebar-toggle-3" ref={toggle_ref}>
            <span className="mif-menu fg-white"></span>
            </button>
            </div>
            <CurShow className="h-100 p-4 w-100" style={{
                "display": "flex",
                "flexDirection": "column",
                "flexWrap": "nowrap",
                "alignItems": "flex-start"
            }}/>
            </div>
            </RixWindow>);

});

export default DockerView;
