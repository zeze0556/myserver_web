import React, { Fragment, forwardRef,createContext, useContext, useState, useRef } from 'react';
import RixWindow from './RixWindow';
import RixDynamicComponent from "./RixDynamicComponent";
import {rix_make_watch_data} from "../store/global_data.js";


const state = rix_make_watch_data({
    wins:{},
    dialog:{},
});

const WindowManagerContext = createContext();

export const useWindowManager = () => {
    return useContext(WindowManagerContext);
};

const window_top = 500;
let window_ref = null;
const start_zindex = 100;

const dialog_top=600;
const dialog_zindex = 501;

function get_top_zindex(type) {
        let wins = state[type];
        let max = start_zindex;
        for(let i in wins) {
            if(wins[i].zindex >= max) {
                max = wins[i].zIndex;
            }
        }
        return max;
}
function set_top_by_winid(type, id) {
    let wins = state[type];//this.state.wins;
    console.log("set_top_by_winid==", id);
    for(let i in wins) {
        if(i == id) {
            if(wins[i].content.ref.current) {
                wins[i].content.ref.current.api.set('zIndex', type=='wins'?window_top:dialog_top);
                wins[i].content.ref.current.api.set('show', true);
            } /*else {
                wins[i].ref.current.setzIndex(this.max_zindex);
                wins[i].ref.current.show();
                }*/
        } else {
            if(wins[i].content.ref.current) {
                wins[i].content.ref.current.api.set('zIndex', wins[i].zindex);
            } /*else {
                console.log("wins[i]", wins[i]);
                wins[i].ref.current.setzIndex(wins[i].zindex);
                }*/
        }
    }
};

function windows_manage () {
    let update_state = (v) => {
        for(let i in v) {
            state.set(i, v[i]);//wins = v.wins;//[...v.wins];
        }
    };
    const closeWindow = (id) => {
        console.log("closeWindow===", id);
        let old = state.wins;
        console.log("old===", old);
        if(old[id]) {
            delete old[id];
            update_state({wins:old});
        }
    };
    const closeDialog= (id) => {
        console.log("closeDialog===", id);
        let old = state.dialog;
        console.log("old dialog ===", old);
        if(old[id]) {
            delete old[id];
            update_state({dialog:old});
        }
    };

    const minWindow= (id) => {
        let old = state.wins;
        let w = old[id];
        if(w) {
            console.log("w.content====", w.content);
            if(w.content.ref.current)
                w.content.ref.current.api.set('show', false);
        }
    };

    const getApps= ()=> {
        console.log("getApps==", state);
        return state.wins;
    };
    const activeApp = (id) => {
        console.log("activeApp", id, state.wins);
        let old = state.wins;
        for(let oid in old) {
            let w = old[oid];
            console.log("activeApp index w.id=", w.id);
            if (w.id != id) {
                if(w.content.ref.current) {
                    console.log("RixWindowManager.js set back w.id=", w.id, "zIndex=", w.zIndex);
                    w.content.ref.current.api.set("zIndex",w.zIndex);
                    //w.content.ref.current.hide();
                    //w.content = React.cloneElement(w.content, { zIndex: w.zIndex});
                }
            }
            if (w.id === id) {
                //w.zIndex = window_top;
                console.log("ready set top ", w.id);
                if(w.content.ref.current) {
                    let api = w.content.ref.current.api;
                    console.log("RixWindowManager.js set front w.id=", w.id, "zIndex=", w.zIndex);
                    api.set("zIndex", window_top);
                    api.set('show', true);
                }
            }
        }
        //update_state({wins:old});
    };

    const set_window_ref = (ref)=> {
        window_ref = ref;
    };

    const openWindow = function(old_props){
        if(!old_props.id) return;
        let props = {
            dragArea: '.window-area', //重要
            ...old_props,
            //...paths[old_props.id],
            id:old_props.id,
            //window_ref: window_ref
        };
        let {id, title, View, icon} = props;
        let old = state.wins;
        console.log("old====", old, state);
        let find =old[id];// old.filter(v=>v.id == id)[0];
        if(find) {
            console.log("already open activeapp", find);
            activeApp(find.id);
            return;
        }
        console.log("openWindow===", id);
        let max_z = 0;
        //let win_ref = useRef(null);
        let win_ref = React.createRef();
        console.log("win_ref==", win_ref, window_ref);

        let createWindow = (id)=> {
        };
        let new_props = {
            width: 500,
            height: 500,
            left:0,
            top:0,
            ...props,
            onActive:()=> activeApp(id),
            onWindowCreate:(res)=> {
                activeApp(id);
                //console.log("rixwindowmanager.js oncreate ",res);
                /*
                  let old = state.wins;
                  for (let w of old) {
                  if (w.id === res.id) {
                  console.log("in array  return");
                  return;
                  }
                  }
                  console.log("not in array, append");
                  let new_v= [...old, res];
                  update_state({wins:new_v});
                */
            },
            //onMinimize:()=> minWindow(id),
            maxwidth: window_ref.current.offsetWidth,
            maxheight: window_ref.current.offsetHeight,
            zIndex: get_top_zindex('wins')+1,
            onShow:()=> {
            },
            onWindowDestroy:(e)=> {
                console.log("close=====", id);
                //console.trace();
                closeWindow(id);
            },
        };
        console.log("dynamic new_props==", new_props);
        let content = <RixDynamicComponent {...new_props} ref={win_ref}/>;
        let new_w = {
            id, title,
            width: 500,
            height: 500,
            zIndex: new_props.zIndex,//window_top,
            icon: icon || <span className="mif-rocket"/>,
            content: content,//<Content/>,
            win_ref: win_ref
        };
        console.log("win_ref==", win_ref);
        console.log("old===", JSON.stringify(old));
        old[id] = new_w;
        console.log("new old===", JSON.stringify(old));
        update_state({wins:old});
    };

    const openDialog = function(old_props) {
        if(!old_props.id) return;
        let props = {
            //dragArea: '.window-area', //重要
            ...old_props,
            //...paths[old_props.id],
            id:old_props.id,
            //window_ref: window_ref
        };
        let {id, title, View, icon} = props;
        let old = state.dialog;
        console.log("old dialog====", old, state);
        //console.log("openWindow===", id);
        old[old_props.id] = props;
        update_state({'dialog': old});
        return;
        let max_z = 0;
        //let win_ref = useRef(null);
        let win_ref = React.createRef();
        console.log("win_ref==", win_ref, window_ref);

        let new_props = {
            width: 500,
            height: 500,
            left:0,
            top:0,
            ...props,
            onActive:()=> {
                set_top_by_winid('dialog', id);
            },
            onWindowCreate:(res)=> {
                set_top_by_winid('dialog', id);
            },
            //onMinimize:()=> minWindow(id),
            maxwidth: window_ref.current.offsetWidth,
            maxheight: window_ref.current.offsetHeight,
            zIndex: get_top_zindex('dialog')+1,
            onShow:()=> {
            },
            onClose:()=> {
                console.log("dialog====close==", id);
                closeDialog(id);
            },
            onWindowDestroy:(e)=> {
                console.log("close=====", id);
                //console.trace();
                closeDialog(id);
            },
        };
        console.log("dynamic new_props==", new_props);
        let new_w = {
            id, title,
            width: 500,
            height: 500,
            zIndex: new_props.zIndex,//window_top,
            icon: icon || <span className="mif-rocket"/>,
            content: new_props.content,//<Content/>,
            win_ref: win_ref
        };
        console.log("win_ref==", win_ref);
        console.log("old===", JSON.stringify(old));
        old[id] = new_w;
        console.log("new old===", JSON.stringify(old));
        update_state({dialog:old});
    };
    return { windows:state, openWindow, closeWindow, minWindow, getApps, activeApp, set_window_ref, openDialog, closeDialog };
}

export const WindowApi = windows_manage();
export const RixWindowManagerProvider = ({ children }) => {
    return (
            <WindowManagerContext.Provider value={WindowApi}>
            {children}
        </WindowManagerContext.Provider>
    );
};
