// Desktop.js
import React, { Fragment, useRef, useState, useEffect } from 'react';
import './descktop.css';
import {  Box, Paper, Typography,} from '@mui/material';
import TaskBar from './TaskBar';
import { useWindowManager } from '../rix/RixWindowManager';
import RixDynamicComponent from "../rix/RixDynamicComponent.js";
import RixCharms from "../rix/RixCharms";
import RixShortList from "../rix/RixShortList";
import btrfs from "../utils/btrfs";
import Bcachefs from "../utils/bcachefs";
import Disks from "../utils/disks";
import Qemu from "../utils/qemu";
import Docker from "../utils/docker";
import { useData, rix_make_watch_data } from "../store/global_data.js";
const {$, Metro} = window;

const paths = {
    'systemsetting': {
        'rix_type': 'component',
        'title': '系统设置',
        'icon': <span class="mif-construction fg-blue"/>,
        path: 'components/SystemSetting.js',
    },
    'storagewindow': {
        'rix_type': 'component',
        'title': '存储管理',
        'icon': <span class="mif-database fg-blue"/>,
        path: 'components/StorageWindow.js',
    },
    'shell': {
        'title': '终端',
        'rix_type': 'component',
        'icon': <span class="mif-featured-play-list"/>,
        path: 'components/Shell.js',
    },
    'docker': {
        'title': 'Docker',
        'rix_type': 'component',
        'icon': <span class="mif-ship fg-blue"/>,
        path: 'components/Docker.js',
    },
    'samba': {
        'title': '共享服务',
        'rix_type': 'component',
        'icon': <span class="mif-share"/>,
        path: 'components/samba.js'
    },
    'virtualmachine': {
        'title': '虚拟机管理',
        'rix_type': 'component',
        "icon": <span class="mif-desktop_mac"/>,
        path: 'components/VirtualMachine.js'
    },
    'filemanager': {
        'title': '文件管理',
        'rix_type': 'component',
        "icon": <span class="mif-folder fg-blue"/>,
        path: 'components/FileManager.js'
    },
    'firefox': {
        'title': 'Firefox浏览器',
        'rix_type': 'component',
        "icon": <span class="mif-firefox fg-orange"/>,
        path: 'components/Firefox.js'
    },
    'chrome': {
        'title': 'Chrome浏览器',
        'rix_type': 'component',
        "icon": <span class="mif-chrome fg-blue"/>,
        path: 'components/Firefox.js'
    },
};


let RendWindow=()=>{
    let Wins = ()=> {
    const [update, setUpdate] = useState(0);
    let {windows, getApps, openWindow, set_window_ref}= useWindowManager();
    useEffect(()=> {
        let f = windows.watch("wins",(v)=>{
            setUpdate(update+1);
        });
        return ()=> {
            windows.unwatch("wins", f);
        };
    });
    let apps = windows.wins;
    let r_w = [];
        console.log("rend window===");
    for(let i in apps) {
        let app = apps[i];
        console.log("rendapp=", app);
        r_w.push(<div key={i}>{app.content}</div>);
    }
    return r_w;
    };
    return <Wins/>;
};
let RendDialog=()=>{
    let Wins = ()=> {
        const [update, setUpdate] = useState(0);
        let {windows, getApps, openWindow, set_window_ref}= useWindowManager();
        useEffect(()=> {
            let f = windows.watch("dialog",(v)=>{
                console.log("Desktop.js dialog==",v);
                setUpdate(update+1);
            });
            return ()=> {
                windows.unwatch("dialog", f);
            };
        });
        let apps = windows.dialog;
        let r_w = [];
        for(let i in apps) {
            console.log("dialog i=", i);
            let app = apps[i];
            r_w.push(<div key={i}>{app.content}</div>);
        }
        console.log("dialog ==", r_w);
        return r_w;
    };
    return <Wins/>;
};
const Desktop = () => {
    const { windows, openWindow, set_window_ref} = useWindowManager();
    const { global_data, api } = useData();

    let [state, setState] = useState({
        apps:paths,
        alert: [],
        taskshow: true,
        menus:[],
        charms_watch:rix_make_watch_data({"toggle":false,
                                          "list":[]
                                         })
    });
    let add_short = (data)=> {
        let {shortlist} = global_data;
        let f = shortlist.filter(v=>v.id == data.id)[0];
        if(f) return;
        shortlist.push(data);
        global_data.set("shortlist", shortlist);
    };
    useEffect(()=> {
        api.disk_info({});
        let blocks = global_data.watch('blockdevices', ()=> {
            console.log("desktop global_data blockdevices update");
        });
        global_data.get("disks_health", [], async()=> {
            await Disks.health.cmd();
        });
        global_data.get('pools', [], async () => {
            let read_ret = await api.config_file({ filename: '/app/config/pools.config', 'op': "get" });
            console.log("pools read_ret==", read_ret);
            //if (read_ret.ret == 0) {
            //    let pools = JSON.parse(read_ret.data);
            //    console.log("set pools===", pools);
            try {
            let pools = [];
                let ret_j = read_ret;
                if(typeof read_ret == 'string') {
                    ret_j = JSON.parse(read_ret);
                }
            for(let one of read_ret) {
                console.log("one===", one);
                if(one.type == 'btrfs') {
                    let info = await btrfs.info(one.mount_path);
                    pools.push({...one,
                                ...info
                               });
                }
                if(one.type == 'bcachefs') {
                    let info = await Bcachefs.info(one.mount_path);
                    pools.push({...one,
                                ...info
                               });
                }
            }
                console.log("set pools=", pools);
                global_data.set('pools', pools);
            } catch (e) {
                console.log("config error", e);
            }
            //}
        });
        Qemu.list_running_vm();
        Docker.load_project();
        let watch_pools = global_data.watch('pools', async()=> {
            console.log("pools update==", global_data.pools);
        });
        let watch_vms = global_data.watch('vm_list', (list)=> {
            for(let vm of list) {
                console.log("vm===", vm);
                add_short({
                    'rix_type': 'component',
                    id: `kvm_${vm.name}`,
                    title: vm.name,
                    name: vm.name,
                    caption: vm.name,
                    icon: <span class="mif-desktop_mac fg-blue"/>,
                    //data: vm,
                    url: `/novnc/vnc.html?autoconnect=true&resize=remote&path=wsproxy/?token=${vm.name}`,
                    draggable: true,
                    path: 'components/VmView.js'
                });
            }
        });
        return ()=> {
            global_data.unwatch(blocks);
            global_data.unwatch(watch_pools);
            global_data.unwatch(watch_vms);
        };
    });
    
    for(let id in paths) {
        add_short({
            id,
            title: paths[id].title,
            name:id,
            icon: paths[id].icon,
            caption: paths[id].title,
            draggable: true
        });
    }
    let update_state = (v) => {
        setState((prev) => {
            return { ...prev, ...v };
        });
    };
    let CharmsToggle = (e)=> {
        e.preventDefault();
        let toggle = state.charms_watch.get("toggle");
        state.charms_watch.set("toggle", !toggle);
    };
    const window_zone_ref = useRef(null);
    const taskbar = useRef(null);
    set_window_ref(window_zone_ref);
    let OpenApp=(app)=> {
        let new_app = {
            ...paths[app.id],
            ...app,
            id: app.id
        };
        console.log("OpenApp===", new_app);
        openWindow(new_app);
    };
    useEffect(() => {
        let alert_set = (v) => {
            update_state({ alert: v });
        };
        global_data.watch("alerts", alert_set);
        return () => {
            global_data.unwatch('alerts', alert_set);
        };
    },[]);
    let Charms = () => {
        return <RixCharms data={state.charms_watch}/>;
    };
    let shortlistclick =(d)=> {
        if(d.open_type && d.open_type == 'new_window') {
            window.open(d.url);
        } else {
        OpenApp(d);
        }
    };
    let Shortlist = ()=> {
        let [update, setUpdate] = useState(0);
        let {shortlist} = global_data;
        useEffect(()=> {
            let f = global_data.watch("shortlist",()=>(setUpdate(update+1)));
            return ()=>{global_data.unwatch("shortlist", f);};
        }
                 );
        return (<RixShortList shortlist={shortlist} key={update}>
                {shortlist.map(v=> {
                        return <RixShortList.Node
                    onClick={()=>shortlistclick(v)}
                    key={v.id}
                        {...v}>
                            </RixShortList.Node>;
                    })}
                </RixShortList>);
    };
    
    return (<>
            <Charms/>
            <div className="desktop">
            <div className="window-area" ref={window_zone_ref}>
            <Shortlist/>
            <RendWindow />
            </div>
            <TaskBar ref={taskbar}
            charms_toggle= {CharmsToggle}
            taskshow={state.taskshow}
            menus={state.menus}/>
            <RendDialog />
            </div>
           </>);
};

export default Desktop;
