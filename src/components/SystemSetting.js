import React, {forwardRef,useState, useEffect, useRef, useContext } from 'react';
import RixWindow from "../rix/RixWindow";
import RixShortList from "../rix/RixShortList";
import RixSidebar from "../rix/RixAside";
import RixButton from "../rix/RixButton";
import RixDialog from "../rix/RixDialog";
import {useWindowManager} from "../rix/RixWindowManager";
import Config_Schema from "./config_schema.js";
import Docker from "../utils/docker";
import System from "../utils/system";
import Cron from "../utils/cron";
import Disks from "../utils/disks";
import Persistence from "../utils/persistence";
import {useData, DataContext, rix_make_watch_data} from "../store/global_data.js";
import JsonEditorForm from './JsonEditorForm';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'xterm/lib/xterm.js';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';
import CommonWindow from './CommonWindow';
import cmd from "../utils/command.js";
const drawerWidth = 240;

const {Metro, $} = window;


const VMSetting = (props)=> {
    return <><div {...props}>VMSetting</div></>;
};

let view_config = {
    'system': (props)=>{ return <System.Render {...props}/>; },
    'persistence': (props)=>{return <Persistence.Setting {...props}/>;},
    'docker': (props)=> {return <Docker.RendSetting {...props}/>;},
    'virtual': (props)=> {return <VMSetting {...props}/>;},
    'cron': (props)=> { return <Cron.Render {...props}/>;},
    'system_other': (props)=> {return <System.Other {...props}/>;},
    'disks':(props)=> { return <Disks.Render {...props}/>; }
};
const SystemSetting = forwardRef((props, ref)=> {
    let toggle_ref = React.createRef();
    let shift_ref = React.createRef();
    let state = rix_make_watch_data({
        curshow: "persistence",
    });
    let onClick = (link)=> {
        state.set("curshow", link);
    };
    let CurShow = (props)=> {
        let [update, setUpdate] = useState(0);
        let old = state.curshow;
        useEffect(()=> {
            let f = state.watch("curshow", (v)=>{
                if(old != v) {
                setUpdate(update+1);
                }
            });
            return ()=> {
                state.unwatch("curshow", f);
            };
        });
        console.log("view_config=", view_config, state);
        return <>{view_config[state.curshow](props)}</>;
    };
    return (<RixWindow {...props} ref={ref}>
            <RixSidebar onClick={onClick}
            toggle_ref={toggle_ref}
            shift_ref={shift_ref}
            >
            <div className="sidebar-header" slot="header">
            <span className="title fg-white">test</span>
            <span className="subtitle fg-white"> test</span>
            </div>
            <li><a data-menu="system"><span className="mif-books icon"></span>系统</a></li>
            <li><a data-menu="persistence"><span className="mif-books icon"></span>持久化</a></li>
            <li><a data-menu="docker"><span className="mif-books icon"></span>docker设置</a></li>
            <li><a data-menu="virtual"><span className="mif-files-empty icon"></span>虚拟机设置</a></li>
            <li><a data-menu="cron"><span className="mif-files-empty icon"></span>定时任务</a></li>
            <li><a data-menu="system_other"><span className="mif-files-empty icon"></span>杂项</a></li>
            <li><a data-menu="disks"><span className="mif-files-empty icon"></span>磁盘管理</a></li>
            <li className="divider"></li>
            </RixSidebar>
            <div className="shifted-content h-100 p-ab" ref={shift_ref}>
            <div className="app-bar pos-absolute bg-red z-1" data-role="appbar">
            <button className="app-bar-item c-pointer" id="sidebar-toggle-3" ref={toggle_ref}>
            <span className="mif-menu fg-white"></span>
            </button>
            </div>
            <CurShow className="h-100 p-4" style={{
                "display": "flex",
                "flexDirection": "column",
                "flexWrap": "nowrap",
                "alignItems": "flex-start"
            }}/>
            </div>
            </RixWindow>);
});

export default SystemSetting;
